"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { parseDroppableId, extractTaskId } from "@/lib/dragHelpers";
import { formatLocalDate, snapToIncrement, minutesToTime } from "@/lib/utils";

/**
 * Manages all drag-and-drop state and handlers
 */
export function useDragAndDrop({
  tasks,
  sections,
  updateTask,
  reorderTask,
  reorderSections,
  today,
  viewDate,
  selectedDate,
  calendarView,
  backlogTasks,
  tasksBySection,
  batchReorderTasks,
  handleStatusChange,
  toast,
}) {
  // Drag state - combined for single re-render
  const [dragState, setDragState] = useState({
    activeId: null,
    activeTask: null,
    offset: { x: 0, y: 0 },
  });

  // Refs for tracking
  const dropTimeRef = useRef(null);
  const currentCalendarDroppableRef = useRef(null);
  const mouseMoveListenerRef = useRef(null);

  // Memoized task lookup map
  const taskLookupMap = useMemo(() => {
    const map = new Map();
    const addToMap = taskList => {
      taskList.forEach(task => {
        map.set(task.id, task);
        if (task.subtasks?.length > 0) {
          addToMap(task.subtasks);
        }
      });
    };
    addToMap(tasks);
    return map;
  }, [tasks]);

  // Sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = useCallback(
    event => {
      const { active } = event;
      const activatorEvent = event.activatorEvent;

      // Calculate offset
      let offset = { x: -90, y: -20 };
      if (activatorEvent?.offsetX !== undefined) {
        offset = {
          x: activatorEvent.offsetX - 90,
          y: activatorEvent.offsetY - 20,
        };
      }

      // Find task
      let task = null;
      try {
        const taskId = extractTaskId(active.id);
        task = taskLookupMap.get(taskId) || null;
      } catch {
        task = null;
      }

      // Single state update
      setDragState({
        activeId: active.id,
        activeTask: task,
        offset,
      });
    },
    [taskLookupMap]
  );

  // Handle drag over (for real-time updates like time calculation)
  const handleDragOver = useCallback(
    event => {
      // Only process if we're not already processing
      // This prevents the heavy DOM queries from running on every single drag over event
      const { over } = event;

      if (over && over.id && typeof over.id === "string") {
        const droppableId = over.id;

        // Check if we're over a timed calendar area
        if (droppableId.startsWith("calendar-day|") || droppableId.startsWith("calendar-week|")) {
          // Update calendar droppable ref (refs are mutable)
          currentCalendarDroppableRef.current = droppableId;

          // Set up mousemove listener if not already set
          if (!mouseMoveListenerRef.current) {
            // Cache the timed areas to avoid repeated DOM queries
            let cachedTimedAreas = null;
            let cacheTime = 0;
            const CACHE_DURATION = 100; // Cache for 100ms

            const handleMouseMove = e => {
              if (!currentCalendarDroppableRef.current) return;

              const now = Date.now();

              // Refresh cache if expired or doesn't exist
              if (!cachedTimedAreas || now - cacheTime > CACHE_DURATION) {
                cachedTimedAreas = Array.from(document.querySelectorAll('[data-calendar-timed="true"]'));
                cacheTime = now;
              }

              // Find the timed area under the cursor
              const timedArea = cachedTimedAreas.find(el => {
                const rect = el.getBoundingClientRect();
                return (
                  rect.top <= e.clientY && rect.bottom >= e.clientY && rect.left <= e.clientX && rect.right >= e.clientX
                );
              });

              if (timedArea) {
                const rect = timedArea.getBoundingClientRect();
                const y = e.clientY - rect.top;

                // Get HOUR_HEIGHT from data attribute or use default based on view
                const hourHeight =
                  parseInt(timedArea.getAttribute("data-hour-height")) || (calendarView === "day" ? 64 : 48);

                const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / hourHeight) * 60)));
                const snappedMinutes = snapToIncrement(minutes, 15);
                dropTimeRef.current = minutesToTime(snappedMinutes);
              }
            };

            window.addEventListener("mousemove", handleMouseMove);
            mouseMoveListenerRef.current = handleMouseMove;
          }
        } else {
          // Not over timed calendar area - clear
          currentCalendarDroppableRef.current = null;
          if (mouseMoveListenerRef.current) {
            window.removeEventListener("mousemove", mouseMoveListenerRef.current);
            mouseMoveListenerRef.current = null;
          }
          if (droppableId.startsWith("calendar-day-untimed|") || droppableId.startsWith("calendar-week-untimed|")) {
            dropTimeRef.current = null;
          }
        }
      }
    },
    [calendarView]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async result => {
      const { destination, source, draggableId, type } = result;

      // Reset drag state
      setDragState({
        activeId: null,
        activeTask: null,
        offset: { x: 0, y: 0 },
      });

      if (!destination) {
        dropTimeRef.current = null;
        return;
      }

      // Handle section reordering
      if (type === "SECTION") {
        const newSections = Array.from(sections).sort((a, b) => a.order - b.order);
        const [reorderedSection] = newSections.splice(source.index, 1);
        newSections.splice(destination.index, 0, reorderedSection);
        await reorderSections(newSections);
        return;
      }

      // Handle task dragging
      if (type === "TASK") {
        const sourceParsed = parseDroppableId(source.droppableId);
        const destParsed = parseDroppableId(destination.droppableId);

        // Skip Kanban - handled separately
        if (sourceParsed.type === "kanban-column" || destParsed.type === "kanban-column") {
          dropTimeRef.current = null;
          return;
        }

        const taskId = extractTaskId(draggableId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
          dropTimeRef.current = null;
          return;
        }

        // Get calculated drop time
        const calculatedTime = dropTimeRef.current || "09:00";
        dropTimeRef.current = null;

        // Determine what updates to make based on source and destination
        let updates = {};

        // DESTINATION: Backlog - clear date, time, and recurrence
        if (destParsed.type === "backlog") {
          const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";
          const isFromTodaySection = sourceParsed.type === "today-section";
          updates = {
            time: null,
            recurrence: null,
          };
          if (!isRecurring && isFromTodaySection) {
            updates.status = "todo";
            updates.startedAt = null;
          }
        }
        // DESTINATION: Today section
        else if (destParsed.type === "today-section") {
          const targetDate = viewDate || today;
          const targetDateStr = formatLocalDate(targetDate);
          const currentDateStr = task.recurrence?.startDate?.split("T")[0];
          const needsDateUpdate = currentDateStr !== targetDateStr;
          const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

          if (isRecurring) {
            updates = {};
          } else {
            if (needsDateUpdate || !task.recurrence) {
              updates = {
                recurrence: {
                  type: "none",
                  startDate: `${targetDateStr}T00:00:00.000Z`,
                },
              };
            } else {
              updates = {};
            }
          }

          if (!isRecurring && sourceParsed.type === "backlog") {
            updates.status = "in_progress";
            if (!task.startedAt) {
              updates.startedAt = new Date().toISOString();
            }
          }
        }
        // DESTINATION: Calendar (timed area)
        else if (destParsed.type === "calendar" && !destParsed.isUntimed) {
          let dropDateStr;
          if (destParsed.dateStr) {
            dropDateStr = destParsed.dateStr.split("T")[0];
          } else {
            const fallbackDate = selectedDate || new Date();
            dropDateStr = formatLocalDate(fallbackDate);
          }

          let recurrenceUpdate;
          if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
            recurrenceUpdate = task.recurrence;
          } else {
            recurrenceUpdate = {
              type: "none",
              startDate: `${dropDateStr}T00:00:00.000Z`,
            };
          }

          updates = {
            time: calculatedTime,
            recurrence: recurrenceUpdate,
          };
        }
        // DESTINATION: Calendar (untimed area)
        else if (destParsed.type === "calendar" && destParsed.isUntimed) {
          let dropDateStr;
          if (destParsed.dateStr) {
            dropDateStr = destParsed.dateStr.split("T")[0];
          } else {
            const fallbackDate = selectedDate || new Date();
            dropDateStr = formatLocalDate(fallbackDate);
          }

          let recurrenceUpdate;
          if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
            recurrenceUpdate = task.recurrence;
          } else {
            recurrenceUpdate = {
              type: "none",
              startDate: `${dropDateStr}T00:00:00.000Z`,
            };
          }

          updates = {
            time: null,
            recurrence: recurrenceUpdate,
          };
        }

        // Handle reordering when dropping into a section
        if (destParsed.type === "today-section") {
          const targetSectionId = destParsed.sectionId;
          const sourceSectionId = sourceParsed.type === "today-section" ? sourceParsed.sectionId : task.sectionId;

          await reorderTask(taskId, sourceSectionId, targetSectionId, destination.index);

          if (Object.keys(updates).length > 0) {
            await updateTask(taskId, updates);
          }
          updates = {};
        }

        // Apply any remaining updates (for non-section destinations)
        if (Object.keys(updates).length > 0) {
          await updateTask(taskId, updates);
        }
      }
    },
    [tasks, sections, reorderSections, reorderTask, updateTask, today, viewDate, selectedDate]
  );

  // Handle drag end - properly handle @dnd-kit events (includes Kanban logic)
  const handleDragEndNew = useCallback(
    async event => {
      const { active, over } = event;

      // Reset drag state
      setDragState({
        activeId: null,
        activeTask: null,
        offset: { x: 0, y: 0 },
      });

      // Clean up mousemove listener
      if (mouseMoveListenerRef.current) {
        window.removeEventListener("mousemove", mouseMoveListenerRef.current);
        mouseMoveListenerRef.current = null;
      }
      currentCalendarDroppableRef.current = null;

      if (!over) {
        dropTimeRef.current = null;
        return;
      }

      const draggableId = active.id;
      const activeSortable = active.data.current?.sortable;
      const overSortable = over.data.current?.sortable;

      // Get source container ID from sortable data or infer from draggableId
      let sourceContainerId = activeSortable?.containerId;

      // Validate containerId format - it should match our droppable ID patterns
      // If it doesn't look valid (e.g., "Sortable-8"), extract from draggableId instead
      const isValidContainerId =
        sourceContainerId &&
        (sourceContainerId === "backlog" ||
          sourceContainerId.startsWith("today-section|") ||
          sourceContainerId.startsWith("calendar-") ||
          sourceContainerId.startsWith("kanban-column|"));

      if (!sourceContainerId || !isValidContainerId) {
        // Infer from draggableId pattern
        if (draggableId.includes("-kanban-")) {
          // Extract status from kanban draggableId: task-{id}-kanban-{status}
          const match = draggableId.match(/-kanban-(.+)$/);
          if (match) {
            sourceContainerId = `kanban-column|${match[1]}`;
          }
        } else if (draggableId.includes("-backlog")) {
          sourceContainerId = "backlog";
        } else if (draggableId.includes("-today-section-")) {
          // Extract section ID - it's everything after "-today-section-"
          const match = draggableId.match(/-today-section-(.+)$/);
          if (match) {
            sourceContainerId = `today-section|${match[1]}`;
          } else {
            console.warn("Failed to extract section ID from draggableId:", draggableId);
          }
        } else if (draggableId.includes("-calendar-untimed-")) {
          const match = draggableId.match(/-calendar-untimed-(.+)$/);
          if (match) {
            const dateStr = match[1];
            sourceContainerId = dateStr.includes("T")
              ? `calendar-day-untimed|${dateStr}`
              : `calendar-week-untimed|${dateStr}`;
          }
        } else if (draggableId.includes("-calendar-timed-")) {
          const match = draggableId.match(/-calendar-timed-(.+)$/);
          if (match) {
            const dateStr = match[1];
            sourceContainerId = dateStr.includes("T") ? `calendar-day|${dateStr}` : `calendar-week|${dateStr}`;
          }
        }

        // Note: We silently fall back to draggableId extraction when sortable containerId
        // is invalid (e.g., internal "Sortable-X" ids from dnd-kit). This is expected behavior.
      }

      // Determine type early
      let type = active.data.current?.type || "TASK";
      if (draggableId.startsWith("section-")) {
        type = "SECTION";
      }

      // Get destination container ID - check droppable ID first, then sortable container
      let destContainerId = null;

      // Check if dropping on a task drop target (for combining tasks)
      const overDroppable = over.data.current;

      // Priority 1: If over.id is a droppable ID pattern, use it directly
      if (
        over.id &&
        (over.id === "backlog" ||
          over.id.startsWith("today-section|") ||
          over.id.startsWith("calendar-") ||
          over.id.startsWith("kanban-column|"))
      ) {
        destContainerId = over.id;
      }
      // Priority 2: Use the sortable container ID (for tasks within sections)
      // But only if it's a valid containerId pattern, not an internal Sortable-X id
      else if (overSortable?.containerId) {
        const isValidDestContainerId =
          overSortable.containerId === "backlog" ||
          overSortable.containerId.startsWith("today-section|") ||
          overSortable.containerId.startsWith("calendar-") ||
          overSortable.containerId.startsWith("kanban-column|");

        if (isValidDestContainerId) {
          destContainerId = overSortable.containerId;
        }
      }

      // Priority 3: Extract container ID from task draggableId pattern
      if (!destContainerId && over.id && over.id.startsWith("task-")) {
        if (over.id.includes("-kanban-")) {
          // Extract status from kanban draggableId: task-{id}-kanban-{status}
          const match = over.id.match(/-kanban-(.+)$/);
          if (match) destContainerId = `kanban-column|${match[1]}`;
        } else if (over.id.includes("-today-section-")) {
          // Extract section ID - it's everything after "-today-section-"
          const match = over.id.match(/-today-section-(.+)$/);
          if (match) destContainerId = `today-section|${match[1]}`;
        } else if (over.id.includes("-backlog")) {
          destContainerId = "backlog";
        }
      }

      // Subtask dragging is disabled - subtasks can only be managed in the task dialog

      // Check if over is a droppable (not a sortable item)
      // Priority: droppable data > task draggableId pattern > section card > droppable ID pattern
      if (overDroppable?.sectionId) {
        // Dropping directly on a section droppable area
        destContainerId = `today-section|${overDroppable.sectionId}`;
      } else if (over.id && over.id.startsWith("task-") && over.id.includes("-today-section-")) {
        // Dropping on a task in a section - extract section from task's draggableId
        // Extract section ID - it's everything after "-today-section-"
        const match = over.id.match(/-today-section-(.+)$/);
        if (match) {
          destContainerId = `today-section|${match[1]}`;
        }
      } else if (over.id && over.id.startsWith("task-") && over.id.includes("-backlog")) {
        // Dropping on a task in backlog - use backlog container
        destContainerId = "backlog";
      } else if (over.id && over.id.startsWith("section-")) {
        // Dropping on a section card itself - extract section ID
        const sectionId = over.id.replace("section-", "");
        destContainerId = `today-section|${sectionId}`;
      }
      // Task combining is now handled in the task dialog, not via drag-and-drop

      // Final fallback: if destContainerId still isn't set and over.id matches droppable patterns
      if (!destContainerId && over.id) {
        if (over.id === "backlog") {
          destContainerId = "backlog";
        } else if (over.id.startsWith("kanban-column|")) {
          destContainerId = over.id;
        } else if (over.id.startsWith("today-section|")) {
          destContainerId = over.id;
        } else if (over.id.startsWith("calendar-")) {
          destContainerId = over.id;
        }
      }

      // For Kanban, we need to handle all operations in the cross-container section
      // because the sortable indices may not match the actual task order in the column
      const isKanbanDrag =
        sourceContainerId?.startsWith("kanban-column|") || destContainerId?.startsWith("kanban-column|");

      // Handle reordering within the same container using arrayMove
      // Skip Kanban here - we handle all Kanban operations in the cross-container section
      if (
        activeSortable &&
        overSortable &&
        sourceContainerId === destContainerId &&
        sourceContainerId &&
        !isKanbanDrag
      ) {
        const oldIndex = activeSortable.index;
        const newIndex = overSortable.index;

        // Skip if dropped in same position
        if (oldIndex === newIndex) {
          return;
        }

        // Handle section reordering
        if (type === "SECTION" && sourceContainerId === "sections") {
          const sortedSections = [...sections].sort((a, b) => a.order - b.order);
          const reordered = arrayMove(sortedSections, oldIndex, newIndex);
          await reorderSections(reordered);
          return;
        }

        // Handle task reordering within the same section
        if (type === "TASK" && sourceContainerId.startsWith("today-section|")) {
          const sectionId = sourceContainerId.split("|")[1];
          const taskId = extractTaskId(draggableId);

          // Use the reorderTask function which handles the reordering logic
          await reorderTask(taskId, sectionId, sectionId, newIndex);
          return;
        }

        // Handle backlog task reordering
        if (type === "TASK" && sourceContainerId === "backlog") {
          const taskId = extractTaskId(draggableId);
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;

          // Get all backlog tasks sorted by order
          const sortedBacklogTasks = backlogTasks
            .map(t => tasks.find(fullTask => fullTask.id === t.id))
            .filter(Boolean)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          // Use arrayMove to reorder
          const reordered = arrayMove(sortedBacklogTasks, oldIndex, newIndex);

          // Update order for all affected tasks using batch API
          try {
            const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
            await batchReorderTasks(updates);
          } catch {
            toast({
              title: "Error",
              description: "Failed to reorder backlog tasks",
              status: "error",
              duration: 3000,
            });
          }
          return;
        }

        // Subtask reordering is now handled in the task dialog, not via drag-and-drop
      }

      // Handle cross-container moves (backlog ↔ sections ↔ calendar ↔ kanban)
      // Handle kanban column drops (moving between columns or from other containers)
      if (type === "TASK" && destContainerId) {
        const destParsed = parseDroppableId(destContainerId);

        if (destParsed.type === "kanban-column") {
          const newStatus = destParsed.status;
          const taskId = extractTaskId(draggableId);
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;

          const sourceParsed = sourceContainerId ? parseDroppableId(sourceContainerId) : null;
          const isSameColumn = sourceParsed?.type === "kanban-column" && sourceParsed.status === newStatus;

          // Get all tasks in the destination column
          const destColumnTasks = tasks
            .filter(t => {
              if (t.completionType === "note") return false;
              if (t.recurrence && t.recurrence.type !== "none") return false;
              if (t.parentId) return false;
              return t.status === newStatus;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          // If task status is the same, it's a reorder within the same column
          if (isSameColumn) {
            // Find the old and new indices
            const oldIndex = destColumnTasks.findIndex(t => t.id === taskId);
            const newIndex = overSortable?.index ?? destColumnTasks.length;

            // Skip if no change
            if (oldIndex === newIndex || oldIndex === -1) {
              return;
            }

            // Use arrayMove to reorder
            const reordered = arrayMove(destColumnTasks, oldIndex, newIndex);

            // Update order for all affected tasks using batch API
            try {
              const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
              await batchReorderTasks(updates);
            } catch {
              toast({
                title: "Error",
                description: "Failed to reorder Kanban tasks",
                status: "error",
                duration: 3000,
              });
            }
            return;
          }

          // Moving from different column or from outside Kanban
          // Calculate new order position from sortable index
          const destIndex = overSortable?.index ?? destColumnTasks.length;
          const reordered = [...destColumnTasks];
          reordered.splice(destIndex, 0, task);

          // Update status
          await handleStatusChange(taskId, newStatus);

          // Update order for all affected tasks using batch API
          try {
            const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
            await batchReorderTasks(updates);
          } catch {
            toast({
              title: "Error",
              description: "Failed to reorder Kanban tasks",
              status: "error",
              duration: 3000,
            });
          }
          return;
        }
      }

      // Handle section-to-section moves directly
      if (type === "TASK" && sourceContainerId && destContainerId) {
        const sourceParsed = parseDroppableId(sourceContainerId);
        const destParsed = parseDroppableId(destContainerId);

        // Only handle section-to-section moves here (both source and dest must be sections)
        if (sourceParsed.type === "today-section" && destParsed.type === "today-section") {
          const taskId = extractTaskId(draggableId);

          // Find the task to get its current data
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            console.error("Task not found:", taskId);
            return;
          }

          // Get source and target section IDs
          const sourceSectionId = sourceParsed.sectionId;
          const targetSectionId = destParsed.sectionId;

          // Calculate destination index
          // If dropping on a sortable item, use its index
          // If dropping on empty area, use the length of tasks in target section (append to end)
          let destIndex = 0;
          if (overSortable?.index !== undefined && overSortable.index !== null) {
            destIndex = overSortable.index;
          } else {
            // Dropping on empty area - append to end of target section
            const targetSectionTasks = tasksBySection[targetSectionId] || [];
            destIndex = targetSectionTasks.length;
          }

          // Validate section IDs and index
          if (!sourceSectionId || !targetSectionId) {
            console.error("Invalid section IDs", {
              sourceParsed,
              destParsed,
              sourceSectionId,
              targetSectionId,
              taskSectionId: task.sectionId,
              sourceContainerId,
              destContainerId,
              draggableId,
            });
            return;
          }
          if (typeof destIndex !== "number" || destIndex < 0) {
            console.error("Invalid destination index", { destIndex, overSortable });
            return;
          }

          // Verify sections exist
          const sourceSection = sections.find(s => s.id === sourceSectionId);
          const targetSection = sections.find(s => s.id === targetSectionId);
          if (!sourceSection || !targetSection) {
            console.error("Section not found", {
              sourceSectionId,
              targetSectionId,
              availableSections: sections.map(s => s.id),
            });
            return;
          }

          // Clear any drop time since we're moving to a section (not calendar)
          dropTimeRef.current = null;

          // Use the selected date in Today View (todayViewDate), or fall back to today
          const targetDate = viewDate || today;
          const targetDateStr = formatLocalDate(targetDate);

          // Preserve existing recurrence if it exists, otherwise set to none with today's date
          // For recurring tasks, preserve everything. For one-time tasks, update date if different.
          const currentDateStr = task.recurrence?.startDate?.split("T")[0];
          const needsDateUpdate = currentDateStr !== targetDateStr;

          // Reorder the task (this handles section change and order)
          // eslint-disable-next-line no-console
          console.log("Reordering task:", {
            taskId,
            sourceSectionId,
            targetSectionId,
            destIndex,
            sourceContainerId,
            destContainerId,
          });
          await reorderTask(taskId, sourceSectionId, targetSectionId, destIndex);

          // Apply recurrence updates only for one-time tasks when date changed
          // Preserve existing time - don't clear it
          if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
            // Recurring task - no updates needed, preserve everything
          } else if (needsDateUpdate || !task.recurrence) {
            // One-time task - update date if different or initialize recurrence
            const recurrenceUpdate = {
              type: "none",
              startDate: `${targetDateStr}T00:00:00.000Z`,
            };
            await updateTask(taskId, {
              recurrence: recurrenceUpdate,
            });
          }
          // If date is the same and recurrence exists, no updates needed

          return;
        }
      }

      // Convert to the format expected by handleDragEnd for other cross-container moves
      const sourceIndex = activeSortable?.index ?? 0;
      const destIndex = overSortable?.index ?? 0;

      // Ensure destContainerId is set
      if (!destContainerId) {
        console.error("Destination container ID not set", { over, overSortable, overDroppable });
        return;
      }

      const result = {
        draggableId,
        type,
        source: {
          droppableId: sourceContainerId || "unknown",
          index: sourceIndex,
        },
        destination: {
          droppableId: destContainerId,
          index: destIndex,
        },
      };

      await handleDragEnd(result);
    },
    [
      tasks,
      sections,
      backlogTasks,
      tasksBySection,
      reorderTask,
      reorderSections,
      updateTask,
      batchReorderTasks,
      handleStatusChange,
      toast,
      today,
      viewDate,
      setDragState,
      handleDragEnd,
    ]
  );

  // Set drop time from calendar
  const setDropTime = useCallback(time => {
    dropTimeRef.current = time;
  }, []);

  return {
    // State
    dragState,

    // Sensors
    sensors,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEndNew,

    // Time calculation
    dropTimeRef,
    setDropTime,
    currentCalendarDroppableRef,

    // Lookup
    taskLookupMap,
  };
}

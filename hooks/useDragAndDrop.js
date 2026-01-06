"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { parseDroppableId, extractTaskId } from "@/lib/dragHelpers";
import { formatLocalDate, snapToIncrement, minutesToTime } from "@/lib/utils";
import { useGetTasksQuery, useUpdateTaskMutation, useBatchReorderTasksMutation } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery, useReorderSectionsMutation } from "@/lib/store/api/sectionsApi";

/**
 * Manages all drag-and-drop state and handlers
 * Uses Redux directly - no prop drilling needed
 *
 * Some parameters are still passed because they're computed in the parent:
 * - backlogTasks: Computed from tasks based on filters
 * - tasksBySection: Computed from tasks organized by section
 * - handleStatusChange: Comes from useStatusHandlers hook
 * - reorderTask: Complex function that needs coordination with parent state
 */
export function useDragAndDrop({
  // These are passed because they're computed in the parent or from other hooks
  backlogTasks,
  tasksBySection,
  handleStatusChange,
  reorderTask,
}) {
  // Get state from Redux
  const selectedDateISO = useSelector(state => state.ui.selectedDate);
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const calendarView = useSelector(state => state.ui.calendarView);

  // Compute dates
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const selectedDate = useMemo(() => (selectedDateISO ? new Date(selectedDateISO) : null), [selectedDateISO]);
  const viewDate = useMemo(() => (todayViewDateISO ? new Date(todayViewDateISO) : today), [todayViewDateISO, today]);

  // RTK Query hooks
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [batchReorderTasksMutation] = useBatchReorderTasksMutation();
  const [reorderSectionsMutation] = useReorderSectionsMutation();

  // Wrapper functions
  const updateTask = useCallback(
    async (id, taskData) => {
      return await updateTaskMutation({ id, ...taskData }).unwrap();
    },
    [updateTaskMutation]
  );

  const batchReorderTasks = useCallback(
    async updates => {
      return await batchReorderTasksMutation(updates).unwrap();
    },
    [batchReorderTasksMutation]
  );

  const reorderSections = useCallback(
    async newSections => {
      return await reorderSectionsMutation(newSections).unwrap();
    },
    [reorderSectionsMutation]
  );

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
      const { over } = event;

      if (over && over.id && typeof over.id === "string") {
        const droppableId = over.id;

        // Check if we're over a timed calendar area
        if (droppableId.startsWith("calendar-day|") || droppableId.startsWith("calendar-week|")) {
          currentCalendarDroppableRef.current = droppableId;

          // Set up mousemove listener if not already set
          if (!mouseMoveListenerRef.current) {
            let cachedTimedAreas = null;
            let cacheTime = 0;
            const CACHE_DURATION = 100;

            const handleMouseMove = e => {
              if (!currentCalendarDroppableRef.current) return;

              const now = Date.now();

              if (!cachedTimedAreas || now - cacheTime > CACHE_DURATION) {
                cachedTimedAreas = Array.from(document.querySelectorAll('[data-calendar-timed="true"]'));
                cacheTime = now;
              }

              const timedArea = cachedTimedAreas.find(el => {
                const rect = el.getBoundingClientRect();
                return (
                  rect.top <= e.clientY && rect.bottom >= e.clientY && rect.left <= e.clientX && rect.right >= e.clientX
                );
              });

              if (timedArea) {
                const rect = timedArea.getBoundingClientRect();
                const y = e.clientY - rect.top;
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

  // Handle drag end (legacy format)
  const handleDragEnd = useCallback(
    async result => {
      const { destination, source, draggableId, type } = result;

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

        const calculatedTime = dropTimeRef.current || "09:00";
        dropTimeRef.current = null;

        let updates = {};

        // DESTINATION: Backlog
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

        // Apply any remaining updates
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

      // Get source container ID
      let sourceContainerId = activeSortable?.containerId;

      const isValidContainerId =
        sourceContainerId &&
        (sourceContainerId === "backlog" ||
          sourceContainerId.startsWith("today-section|") ||
          sourceContainerId.startsWith("calendar-") ||
          sourceContainerId.startsWith("kanban-column|"));

      if (!sourceContainerId || !isValidContainerId) {
        if (draggableId.includes("-kanban-")) {
          const match = draggableId.match(/-kanban-(.+)$/);
          if (match) {
            sourceContainerId = `kanban-column|${match[1]}`;
          }
        } else if (draggableId.includes("-backlog")) {
          sourceContainerId = "backlog";
        } else if (draggableId.includes("-today-section-")) {
          const match = draggableId.match(/-today-section-(.+)$/);
          if (match) {
            sourceContainerId = `today-section|${match[1]}`;
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
      }

      let type = active.data.current?.type || "TASK";
      if (draggableId.startsWith("section-")) {
        type = "SECTION";
      }

      let destContainerId = null;
      const overDroppable = over.data.current;

      if (
        over.id &&
        (over.id === "backlog" ||
          over.id.startsWith("today-section|") ||
          over.id.startsWith("calendar-") ||
          over.id.startsWith("kanban-column|"))
      ) {
        destContainerId = over.id;
      } else if (overSortable?.containerId) {
        const isValidDestContainerId =
          overSortable.containerId === "backlog" ||
          overSortable.containerId.startsWith("today-section|") ||
          overSortable.containerId.startsWith("calendar-") ||
          overSortable.containerId.startsWith("kanban-column|");

        if (isValidDestContainerId) {
          destContainerId = overSortable.containerId;
        }
      }

      if (!destContainerId && over.id && over.id.startsWith("task-")) {
        if (over.id.includes("-kanban-")) {
          const match = over.id.match(/-kanban-(.+)$/);
          if (match) destContainerId = `kanban-column|${match[1]}`;
        } else if (over.id.includes("-today-section-")) {
          const match = over.id.match(/-today-section-(.+)$/);
          if (match) destContainerId = `today-section|${match[1]}`;
        } else if (over.id.includes("-backlog")) {
          destContainerId = "backlog";
        }
      }

      if (overDroppable?.sectionId) {
        destContainerId = `today-section|${overDroppable.sectionId}`;
      } else if (over.id && over.id.startsWith("task-") && over.id.includes("-today-section-")) {
        const match = over.id.match(/-today-section-(.+)$/);
        if (match) {
          destContainerId = `today-section|${match[1]}`;
        }
      } else if (over.id && over.id.startsWith("task-") && over.id.includes("-backlog")) {
        destContainerId = "backlog";
      } else if (over.id && over.id.startsWith("section-")) {
        const sectionId = over.id.replace("section-", "");
        destContainerId = `today-section|${sectionId}`;
      }

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

      const isKanbanDrag =
        sourceContainerId?.startsWith("kanban-column|") || destContainerId?.startsWith("kanban-column|");

      // Handle reordering within the same container
      if (
        activeSortable &&
        overSortable &&
        sourceContainerId === destContainerId &&
        sourceContainerId &&
        !isKanbanDrag
      ) {
        const oldIndex = activeSortable.index;
        const newIndex = overSortable.index;

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
          await reorderTask(taskId, sectionId, sectionId, newIndex);
          return;
        }

        // Handle backlog task reordering
        if (type === "TASK" && sourceContainerId === "backlog") {
          const taskId = extractTaskId(draggableId);
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;

          const sortedBacklogTasks = backlogTasks
            .map(t => tasks.find(fullTask => fullTask.id === t.id))
            .filter(Boolean)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const reordered = arrayMove(sortedBacklogTasks, oldIndex, newIndex);

          try {
            const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
            await batchReorderTasks(updates);
          } catch {
            console.error("Error: Failed to reorder backlog tasks");
          }
          return;
        }
      }

      // Handle cross-container moves
      if (type === "TASK" && destContainerId) {
        const destParsed = parseDroppableId(destContainerId);

        if (destParsed.type === "kanban-column") {
          const newStatus = destParsed.status;
          const taskId = extractTaskId(draggableId);
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;

          const sourceParsed = sourceContainerId ? parseDroppableId(sourceContainerId) : null;
          const isSameColumn = sourceParsed?.type === "kanban-column" && sourceParsed.status === newStatus;

          const destColumnTasks = tasks
            .filter(t => {
              if (t.completionType === "note") return false;
              if (t.recurrence && t.recurrence.type !== "none") return false;
              if (t.parentId) return false;
              return t.status === newStatus;
            })
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          if (isSameColumn) {
            const oldIndex = destColumnTasks.findIndex(t => t.id === taskId);
            const newIndex = overSortable?.index ?? destColumnTasks.length;

            if (oldIndex === newIndex || oldIndex === -1) {
              return;
            }

            const reordered = arrayMove(destColumnTasks, oldIndex, newIndex);

            try {
              const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
              await batchReorderTasks(updates);
            } catch {
              console.error("Error: Failed to reorder Kanban tasks");
            }
            return;
          }

          const destIndex = overSortable?.index ?? destColumnTasks.length;
          const reordered = [...destColumnTasks];
          reordered.splice(destIndex, 0, task);

          await handleStatusChange(taskId, newStatus);

          try {
            const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
            await batchReorderTasks(updates);
          } catch {
            console.error("Error: Failed to reorder Kanban tasks");
          }
          return;
        }
      }

      // Handle section-to-section moves
      if (type === "TASK" && sourceContainerId && destContainerId) {
        const sourceParsed = parseDroppableId(sourceContainerId);
        const destParsed = parseDroppableId(destContainerId);

        if (sourceParsed.type === "today-section" && destParsed.type === "today-section") {
          const taskId = extractTaskId(draggableId);
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            return;
          }

          const sourceSectionId = sourceParsed.sectionId;
          const targetSectionId = destParsed.sectionId;

          let destIndex = 0;
          if (overSortable?.index !== undefined && overSortable.index !== null) {
            destIndex = overSortable.index;
          } else {
            const targetSectionTasks = tasksBySection[targetSectionId] || [];
            destIndex = targetSectionTasks.length;
          }

          if (!sourceSectionId || !targetSectionId) {
            return;
          }
          if (typeof destIndex !== "number" || destIndex < 0) {
            return;
          }

          const sourceSection = sections.find(s => s.id === sourceSectionId);
          const targetSection = sections.find(s => s.id === targetSectionId);
          if (!sourceSection || !targetSection) {
            return;
          }

          dropTimeRef.current = null;

          const targetDate = viewDate || today;
          const targetDateStr = formatLocalDate(targetDate);
          const currentDateStr = task.recurrence?.startDate?.split("T")[0];
          const needsDateUpdate = currentDateStr !== targetDateStr;

          await reorderTask(taskId, sourceSectionId, targetSectionId, destIndex);

          if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
            // Recurring task - no updates needed
          } else if (needsDateUpdate || !task.recurrence) {
            const recurrenceUpdate = {
              type: "none",
              startDate: `${targetDateStr}T00:00:00.000Z`,
            };
            await updateTask(taskId, {
              recurrence: recurrenceUpdate,
            });
          }

          return;
        }
      }

      // Convert to legacy format for other cross-container moves
      const sourceIndex = activeSortable?.index ?? 0;
      const destIndex = overSortable?.index ?? 0;

      if (!destContainerId) {
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
      today,
      viewDate,
      handleDragEnd,
    ]
  );

  // Set drop time from calendar
  const setDropTime = useCallback(time => {
    dropTimeRef.current = time;
  }, []);

  return useMemo(
    () => ({
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
    }),
    [
      dragState,
      sensors,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragEndNew,
      dropTimeRef,
      setDropTime,
      currentCalendarDroppableRef,
      taskLookupMap,
    ]
  );
}

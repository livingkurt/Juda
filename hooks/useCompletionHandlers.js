"use client";

import { useRef, useCallback, useEffect, useMemo, startTransition } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatLocalDate, minutesToTime } from "@/lib/utils";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useTasksWithDeferred } from "@/hooks/useTasksWithDeferred";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useBatchCreateCompletionsMutation,
  useBatchDeleteCompletionsMutation,
} from "@/lib/store/api/completionsApi";
import { useRolloverTaskMutation } from "@/lib/store/api/tasksApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import {
  addRecentlyCompletedTask,
  removeRecentlyCompletedTask,
  clearRecentlyCompletedTasks,
} from "@/lib/store/slices/uiSlice";

/**
 * Handles task completion, outcomes, and recently completed tracking
 * Uses Redux directly - no prop drilling needed
 */
export function useCompletionHandlers({
  // These are passed from parent because they're managed by useSectionExpansion hook
  autoCollapsedSections,
  setAutoCollapsedSections,
  checkAndAutoCollapseSection,
  tasksOverride,
  skipTasksQuery = false,
} = {}) {
  const dispatch = useDispatch();

  // Get state from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const recentlyCompletedTasksArray = useSelector(state => state.ui.recentlyCompletedTasks);

  // Compute dates
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const viewDate = useMemo(() => {
    return todayViewDateISO ? new Date(todayViewDateISO) : today;
  }, [todayViewDateISO, today]);

  // Get preferences
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // RTK Query hooks with deferred rendering
  // Allow skipping the heavy all-tasks query when tasks are provided by a caller
  const { data: tasksFromQuery = [] } = useTasksWithDeferred(undefined, {
    skip: skipTasksQuery || Boolean(tasksOverride),
  });
  const tasks = tasksOverride || tasksFromQuery;
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [createCompletionMutation] = useCreateCompletionMutation();
  const [deleteCompletionMutation] = useDeleteCompletionMutation();
  const [batchCreateCompletionsMutation] = useBatchCreateCompletionsMutation();
  const [batchDeleteCompletionsMutation] = useBatchDeleteCompletionsMutation();
  const [rolloverTaskMutation] = useRolloverTaskMutation();

  // Completion helpers
  const { isCompletedOnDate } = useCompletionHelpers();

  // Convert array to Set for efficient lookups (maintaining backward compatibility)
  const recentlyCompletedTasks = useMemo(() => new Set(recentlyCompletedTasksArray), [recentlyCompletedTasksArray]);

  // Wrapper functions - fire and forget pattern for instant UI updates
  const updateTask = useCallback(
    (id, taskData) => {
      queueMicrotask(() => {
        startTransition(() => {
          updateTaskMutation({ id, ...taskData })
            .unwrap()
            .catch(err => console.error("Update task failed:", err));
        });
      });
    },
    [updateTaskMutation]
  );

  const createCompletion = useCallback(
    (taskId, date, options = {}) => {
      // Use queueMicrotask for faster execution than setTimeout
      // Wrap in startTransition to mark Redux updates as non-urgent
      queueMicrotask(() => {
        startTransition(() => {
          createCompletionMutation({ taskId, date, ...options })
            .unwrap()
            .catch(err => console.error("Create completion failed:", err));
        });
      });
    },
    [createCompletionMutation]
  );

  const deleteCompletion = useCallback(
    (taskId, date) => {
      queueMicrotask(() => {
        startTransition(() => {
          deleteCompletionMutation({ taskId, date })
            .unwrap()
            .catch(err => console.error("Delete completion failed:", err));
        });
      });
    },
    [deleteCompletionMutation]
  );

  const batchCreateCompletions = useCallback(
    completionsToCreate => {
      queueMicrotask(() => {
        startTransition(() => {
          batchCreateCompletionsMutation(completionsToCreate)
            .unwrap()
            .catch(err => console.error("Batch create completions failed:", err));
        });
      });
    },
    [batchCreateCompletionsMutation]
  );

  const batchDeleteCompletions = useCallback(
    completionsToDelete => {
      queueMicrotask(() => {
        startTransition(() => {
          batchDeleteCompletionsMutation(completionsToDelete)
            .unwrap()
            .catch(err => console.error("Batch delete completions failed:", err));
        });
      });
    },
    [batchDeleteCompletionsMutation]
  );

  // Track global debounced timeout for all recently completed tasks
  // This allows the timeout to reset whenever ANY task is checked
  const globalHideTimeoutRef = useRef(null);
  const sectionsToCheckRef = useRef(new Set());

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (globalHideTimeoutRef.current) {
        clearTimeout(globalHideTimeoutRef.current);
        globalHideTimeoutRef.current = null;
      }
    };
  }, []);

  // Clear recently completed tasks when showCompletedTasks is turned on
  useEffect(() => {
    if (showCompletedTasks) {
      dispatch(clearRecentlyCompletedTasks());
      if (globalHideTimeoutRef.current) {
        clearTimeout(globalHideTimeoutRef.current);
        globalHideTimeoutRef.current = null;
      }
      sectionsToCheckRef.current.clear();
    }
  }, [showCompletedTasks, dispatch]);

  // Remove from recently completed
  const removeFromRecentlyCompleted = useCallback(
    taskId => {
      dispatch(removeRecentlyCompletedTask(taskId));
    },
    [dispatch]
  );

  // Clear all recently completed tasks and check sections for auto-collapse
  const clearAllRecentlyCompleted = useCallback(() => {
    dispatch(clearRecentlyCompletedTasks());

    // Check all sections that had tasks completed
    const sectionsToCheck = Array.from(sectionsToCheckRef.current);
    sectionsToCheckRef.current.clear();

    sectionsToCheck.forEach(sectionId => {
      if (checkAndAutoCollapseSection) {
        setTimeout(() => {
          checkAndAutoCollapseSection(sectionId);
        }, 50);
      }
    });
  }, [dispatch, checkAndAutoCollapseSection]);

  // Add to recently completed with debounced timeout
  // Each new completion RESETS the global timer (Apple Reminders behavior)
  const addToRecentlyCompleted = useCallback(
    (taskId, sectionId) => {
      dispatch(addRecentlyCompletedTask(taskId));

      // Track section for auto-collapse check later
      if (sectionId) {
        sectionsToCheckRef.current.add(sectionId);
      }

      // Clear existing timeout if any
      if (globalHideTimeoutRef.current) {
        clearTimeout(globalHideTimeoutRef.current);
      }

      // Set new timeout - this will be reset if another task is checked
      globalHideTimeoutRef.current = setTimeout(() => {
        clearAllRecentlyCompleted();
        globalHideTimeoutRef.current = null;
      }, 10000);
    },
    [dispatch, clearAllRecentlyCompleted]
  );

  // Collect subtask completions for batch operations
  const collectSubtaskCompletionsToDelete = useCallback(
    (task, targetDate) => {
      const dateStr = formatLocalDate(targetDate);
      const completionsToDelete = [{ taskId: task.id, date: dateStr }];
      if (!task.subtasks || task.subtasks.length === 0) {
        return completionsToDelete;
      }

      for (const subtask of task.subtasks) {
        if (isCompletedOnDate(subtask.id, targetDate)) {
          completionsToDelete.push({ taskId: subtask.id, date: dateStr });
        }
      }
      return completionsToDelete;
    },
    [isCompletedOnDate]
  );

  const collectSubtaskCompletionsToCreate = useCallback(
    (task, targetDate) => {
      const dateStr = formatLocalDate(targetDate);
      const completionsToCreate = [{ taskId: task.id, date: dateStr, outcome: "completed" }];
      if (!task.subtasks || task.subtasks.length === 0) {
        return completionsToCreate;
      }

      for (const subtask of task.subtasks) {
        if (!isCompletedOnDate(subtask.id, targetDate)) {
          completionsToCreate.push({ taskId: subtask.id, date: dateStr, outcome: "completed" });
        }
      }
      return completionsToCreate;
    },
    [isCompletedOnDate]
  );

  // Toggle task completion
  // IMPORTANT: This function handles PARENT task completions and cascades to subtasks
  const handleToggleTask = useCallback(
    async taskId => {
      console.warn("[handleToggleTask] CALLED with taskId:", taskId);
      const task = tasks.find(t => t.id === taskId);
      console.warn("[handleToggleTask] task found:", task?.title, "parentId:", task?.parentId);
      if (!task) {
        const isSubtaskId = tasks.some(t => t.subtasks?.some(st => st.id === taskId));
        if (isSubtaskId) {
          console.error("[handleToggleTask] BLOCKED - subtask ID detected:", taskId);
          return;
        }
        return;
      }

      // If this is a subtask, don't use this function - use handleToggleSubtask instead
      if (task.parentId) {
        console.error("handleToggleTask called with a subtask - use handleToggleSubtask instead");
        return;
      }

      const hasNoRecurrence = !task.recurrence;
      const targetDate = hasNoRecurrence ? today : viewDate;
      const isCompletedOnTargetDate = isCompletedOnDate(taskId, targetDate);

      // Check if we need to temporarily expand a section when checking from backlog
      let wasSectionCollapsed = false;
      let sectionWasAutoCollapsed = false;

      if (hasNoRecurrence && !isCompletedOnTargetDate && task.sectionId) {
        // Check if section is collapsed (Redux state only)
        sectionWasAutoCollapsed = autoCollapsedSections?.has(task.sectionId) || false;
        wasSectionCollapsed = sectionWasAutoCollapsed;

        if (wasSectionCollapsed) {
          // Temporarily expand auto-collapsed section to show the task being checked
          if (sectionWasAutoCollapsed && setAutoCollapsedSections) {
            setAutoCollapsedSections(prev => {
              const newSet = new Set(prev);
              newSet.delete(task.sectionId);
              return newSet;
            });
          }
        }
      }

      try {
        const now = new Date();
        const currentTime = minutesToTime(now.getHours() * 60 + now.getMinutes());
        const isRecurringTask = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (hasNoRecurrence && !isCompletedOnTargetDate) {
          const todayDateStr = formatLocalDate(today);
          const updates = {
            recurrence: {
              type: "none",
              startDate: `${todayDateStr}T00:00:00.000Z`,
            },
            time: currentTime,
            status: "complete",
          };

          // Don't set sectionId - sections are determined by time ranges
          // The UI will display the task in the appropriate section based on its time

          await updateTask(taskId, updates);
        } else if (!isRecurringTask && !task.time && !isCompletedOnTargetDate) {
          const updates = {
            time: currentTime,
            status: "complete",
          };

          // Don't set sectionId - sections are determined by time ranges
          // The UI will display the task in the appropriate section based on its time

          await updateTask(taskId, updates);
        } else if (!isRecurringTask && !isCompletedOnTargetDate) {
          const updates = {
            status: "complete",
          };

          // Don't set sectionId - sections are determined by time ranges
          // The UI will display the task in the appropriate section based on its time

          await updateTask(taskId, updates);
        }

        if (isCompletedOnTargetDate) {
          const completionsToDelete = collectSubtaskCompletionsToDelete(task, targetDate);
          await batchDeleteCompletions(completionsToDelete);

          // For non-recurring tasks, revert status based on whether task was started
          // This syncs unchecking the checkbox with status badge
          // Goals can also have their status synced with completions
          if (!isRecurringTask) {
            // Revert to "in_progress" if task had been started, otherwise "todo"
            const newStatus = task.startedAt ? "in_progress" : "todo";
            await updateTask(taskId, {
              status: newStatus,
            });
          }

          // Unchecking - clear auto-collapse for this section so it expands
          if (task.sectionId && autoCollapsedSections?.has(task.sectionId)) {
            setAutoCollapsedSections(prev => {
              const newSet = new Set(prev);
              newSet.delete(task.sectionId);
              return newSet;
            });
          }

          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }
        } else {
          if (!showCompletedTasks) {
            addToRecentlyCompleted(taskId, task.sectionId);
          }

          try {
            const completionsToCreate = collectSubtaskCompletionsToCreate(task, targetDate);
            await batchCreateCompletions(completionsToCreate);
          } catch (completionError) {
            if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
              removeFromRecentlyCompleted(taskId);
            }
            throw completionError;
          }
        }

        if (wasSectionCollapsed && !showCompletedTasks && task.sectionId) {
          // Auto-collapse will be handled by addToRecentlyCompleted after the delay
          // No need to restore manual collapse state since we're not using database anymore
        }
      } catch (error) {
        console.error("Error toggling task completion:", error);
        if (wasSectionCollapsed && task.sectionId) {
          // Restore auto-collapse state on error
          if (sectionWasAutoCollapsed && setAutoCollapsedSections) {
            setAutoCollapsedSections(prev => {
              const newSet = new Set(prev);
              newSet.add(task.sectionId);
              return newSet;
            });
          }
        }
      }
    },
    [
      tasks,
      today,
      viewDate,
      isCompletedOnDate,
      updateTask,
      batchCreateCompletions,
      batchDeleteCompletions,
      showCompletedTasks,
      recentlyCompletedTasks,
      autoCollapsedSections,
      setAutoCollapsedSections,
      collectSubtaskCompletionsToDelete,
      collectSubtaskCompletionsToCreate,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
    ]
  );

  // Helper to check if all subtasks are complete
  const areAllSubtasksComplete = useCallback(
    (parentTask, targetDate, excludeTaskId = null) => {
      if (!parentTask?.subtasks || parentTask.subtasks.length === 0) {
        return false;
      }

      return parentTask.subtasks.every(st => {
        if (st.id === excludeTaskId) return true; // Exclude the one being completed
        return isCompletedOnDate(st.id, targetDate) || st.status === "complete";
      });
    },
    [isCompletedOnDate]
  );

  // Toggle subtask completion
  // IMPORTANT: This function ONLY handles subtask completions independently
  // It does NOT cascade to other subtasks or create completions for the parent
  const handleToggleSubtask = useCallback(
    async (parentTaskId, subtaskId) => {
      const subtask =
        tasks.find(t => t.id === subtaskId) || tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
      if (!subtask) return;

      // Find parent task
      const parentTask = tasks.find(t => t.id === subtask.parentId);

      const hasNoRecurrence = !subtask.recurrence;
      const targetDate = hasNoRecurrence ? today : viewDate;
      const isCompletedOnTargetDate = isCompletedOnDate(subtaskId, targetDate);

      // Check if parent is non-recurring (for status sync)
      const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");
      const isGoalSubtask = subtask?.completionType === "goal";
      const parentIsGoalTask = parentTask?.completionType === "goal";
      // Allow status updates for goal tasks/subtasks even if parent is recurring
      const shouldAllowStatusUpdate = parentIsNonRecurring || isGoalSubtask || parentIsGoalTask;

      try {
        // Set startDate if subtask has no recurrence and isn't completed yet
        if (hasNoRecurrence && !isCompletedOnTargetDate) {
          const todayDateStr = formatLocalDate(today);
          await updateTask(subtaskId, {
            recurrence: {
              type: "none",
              startDate: `${todayDateStr}T00:00:00.000Z`,
            },
          });
        }

        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(targetDate);

        if (isCompletedOnTargetDate) {
          // UNCHECKING subtask - only affects this subtask
          await deleteCompletion(subtaskId, dateStr);

          // Only update subtask status if parent is non-recurring OR if it's a goal task
          // Recurring parent tasks don't use status system, so their subtasks shouldn't either
          // Exception: Goal tasks/subtasks always use status system
          if (shouldAllowStatusUpdate) {
            await updateTask(subtaskId, { status: "todo" });
          }

          // If parent was "complete", revert to "in_progress"
          if (parentTask && shouldAllowStatusUpdate && parentTask.status === "complete") {
            await updateTask(parentTask.id, { status: "in_progress" });
          }
        } else {
          // CHECKING subtask - only affects this subtask
          await createCompletion(subtaskId, dateStr, { outcome: "completed" });

          // Only update subtask status if parent is non-recurring OR if it's a goal task
          // Recurring parent tasks don't use status system, so their subtasks shouldn't either
          // Exception: Goal tasks/subtasks always use status system
          if (shouldAllowStatusUpdate) {
            await updateTask(subtaskId, { status: "complete" });
          }

          // Update parent status intelligently (status only, NOT completions)
          if (parentTask && shouldAllowStatusUpdate) {
            // If parent was "todo", move to "in_progress"
            if (parentTask.status === "todo") {
              await updateTask(parentTask.id, {
                status: "in_progress",
                startedAt: new Date().toISOString(),
              });
            }

            // Check if ALL subtasks are now completed
            const allSubtasksComplete = areAllSubtasksComplete(parentTask, targetDate, subtaskId);

            if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
              // All subtasks complete - update parent STATUS only (not completion)
              await updateTask(parentTask.id, { status: "complete" });
            }
          }
        }
      } catch (error) {
        console.error("Error toggling subtask completion:", error);
      }
    },
    [tasks, today, viewDate, isCompletedOnDate, updateTask, createCompletion, deleteCompletion, areAllSubtasksComplete]
  );

  const handleSubtaskOutcomeChange = useCallback(
    (parentTaskId, subtaskId, outcome) => {
      const subtask = tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
      if (!subtask) return;

      const parentTask = tasks.find(t => t.id === (parentTaskId || subtask.parentId));
      const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");
      const isGoalSubtask = subtask?.completionType === "goal";
      const parentIsGoalTask = parentTask?.completionType === "goal";
      // Allow status updates for goal tasks/subtasks even if parent is recurring
      const shouldAllowStatusUpdate = parentIsNonRecurring || isGoalSubtask || parentIsGoalTask;

      const subtaskIsNonRecurring = !subtask.recurrence || subtask.recurrence.type === "none";
      const targetDate = subtaskIsNonRecurring ? today : viewDate;
      const dateStr = formatLocalDate(targetDate);

      if (outcome === null) {
        // Fire and forget
        deleteCompletion(subtaskId, dateStr);

        // Only update subtask status if parent is non-recurring OR if it's a goal task
        if (shouldAllowStatusUpdate) {
          updateTask(subtaskId, { status: "todo" });
        }

        if (parentTask && shouldAllowStatusUpdate && parentTask.status === "complete") {
          updateTask(parentTask.id, { status: "in_progress" });
        }

        if (!showCompletedTasks && recentlyCompletedTasks.has(subtaskId)) {
          removeFromRecentlyCompleted(subtaskId);
        }
        return;
      }

      if (outcome === "completed" && !showCompletedTasks) {
        addToRecentlyCompleted(subtaskId, parentTask?.sectionId);
      }

      // Fire and forget
      createCompletion(subtaskId, dateStr, { outcome });

      // Only update subtask status if parent is non-recurring OR if it's a goal task
      if (outcome === "completed" && shouldAllowStatusUpdate) {
        updateTask(subtaskId, { status: "complete" });
      }

      if (parentTask && shouldAllowStatusUpdate && outcome === "completed") {
        if (parentTask.status === "todo") {
          updateTask(parentTask.id, {
            status: "in_progress",
            startedAt: new Date().toISOString(),
          });
        }

        const allSubtasksComplete = areAllSubtasksComplete(parentTask, targetDate, subtaskId);
        if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
          updateTask(parentTask.id, { status: "complete" });
        }
      }
    },
    [
      tasks,
      today,
      viewDate,
      showCompletedTasks,
      recentlyCompletedTasks,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
      updateTask,
      createCompletion,
      deleteCompletion,
      areAllSubtasksComplete,
    ]
  );

  // Handle outcome change (completed/not_completed/rolled_over) - NON-BLOCKING for instant UI
  const handleOutcomeChange = useCallback(
    (taskId, date, outcome) => {
      console.warn("[handleOutcomeChange] START", Date.now());

      const dateObj = date instanceof Date ? date : new Date(date);
      // Format date as YYYY-MM-DD to avoid timezone issues
      const dateStr = formatLocalDate(dateObj);

      // Special handling for rolled_over outcome - use rollover API endpoint
      if (outcome === "rolled_over") {
        console.warn("[handleOutcomeChange] rolled_over outcome detected, calling rollover API");
        rolloverTaskMutation({ taskId, date: dateStr })
          .unwrap()
          .catch(err => console.error("Rollover failed:", err));
        return;
      }

      // Find task - need to search both root tasks AND subtasks
      let task = tasks.find(t => t.id === taskId);
      if (!task) {
        // Search in subtasks
        task = tasks.flatMap(t => t.subtasks || []).find(st => st.id === taskId);
      }

      const isSubtask = task?.parentId != null;
      const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";

      // Find parent if this is a subtask
      const parentTask = isSubtask ? tasks.find(t => t.id === task.parentId) : null;
      const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");
      const isGoalTask = task?.completionType === "goal";
      const parentIsGoalTask = parentTask?.completionType === "goal";
      // Allow status updates for goal tasks/subtasks even if parent is recurring
      const shouldAllowStatusUpdate = parentIsNonRecurring || isGoalTask || parentIsGoalTask;

      console.warn("[handleOutcomeChange] Task found, calling mutation", Date.now());

      if (outcome === null) {
        // Fire and forget - optimistic update handles UI instantly
        deleteCompletion(taskId, dateStr);

        // For non-recurring tasks, revert status based on whether task was started
        if (!isRecurringTask) {
          const newStatus = task?.startedAt ? "in_progress" : "todo";
          updateTask(taskId, { status: newStatus });
        }

        // Handle subtask unchecking - update parent if needed
        if (isSubtask && shouldAllowStatusUpdate && parentTask.status === "complete") {
          updateTask(parentTask.id, { status: "in_progress" });
        }

        if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
          removeFromRecentlyCompleted(taskId);
        }

        // Only cascade to subtasks if this is a PARENT task
        if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
          const deletions = task.subtasks.map(subtask => ({
            taskId: subtask.id,
            date: dateStr,
          }));
          batchDeleteCompletions(deletions);
        }
      } else {
        if (outcome === "completed" && !showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }

        // Fire and forget - optimistic update handles UI instantly
        console.warn("[handleOutcomeChange] Calling createCompletion", Date.now());
        createCompletion(taskId, dateStr, { outcome });
        console.warn("[handleOutcomeChange] createCompletion returned", Date.now());

        // For non-recurring tasks, set status to complete
        if (outcome === "completed" && !isRecurringTask) {
          updateTask(taskId, { status: "complete" });
        }

        // Handle subtask completion - update parent intelligently
        if (isSubtask && parentIsNonRecurring && outcome === "completed") {
          // If parent was "todo", move to "in_progress"
          if (parentTask.status === "todo") {
            updateTask(parentTask.id, {
              status: "in_progress",
              startedAt: new Date().toISOString(),
            });
          }

          // Check if ALL subtasks are now completed
          const allSubtasksComplete = areAllSubtasksComplete(parentTask, dateObj, taskId);

          if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
            // NOTE: We only update the status, NOT create a completion
            updateTask(parentTask.id, { status: "complete" });
          }
        }

        // Only cascade to subtasks if this is a PARENT task
        if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
          const creations = task.subtasks.map(subtask => ({
            taskId: subtask.id,
            date: dateStr,
            outcome,
          }));
          batchCreateCompletions(creations);
        }
      }
      console.warn("[handleOutcomeChange] END", Date.now());
      // Auto-collapse check will happen in addToRecentlyCompleted after the delay
    },
    [
      tasks,
      createCompletion,
      deleteCompletion,
      batchCreateCompletions,
      batchDeleteCompletions,
      updateTask,
      showCompletedTasks,
      recentlyCompletedTasks,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
      areAllSubtasksComplete,
      rolloverTaskMutation,
    ]
  );

  // Mark as not completed
  const handleNotCompletedTask = useCallback(
    async taskId => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(targetDate);
        await createCompletion(taskId, dateStr, { outcome: "not_completed" });

        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }
      } catch (error) {
        console.error("Error marking task as not completed:", error);
      }
    },
    [tasks, today, viewDate, createCompletion, showCompletedTasks, addToRecentlyCompleted]
  );

  // Complete with note (or selection options)
  const handleCompleteWithNote = useCallback(
    async (taskId, noteOrOptions) => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(targetDate);

        // Determine if this is a selection task with multiple options
        const isSelectionTask = task?.completionType === "selection";
        const isArray = Array.isArray(noteOrOptions);

        const completionData = {
          outcome: "completed",
        };

        if (isSelectionTask && isArray) {
          // For selection tasks, save to selectedOptions field
          completionData.selectedOptions = noteOrOptions;
        } else if (isArray) {
          // If array but not selection task, join as string for backward compatibility
          completionData.note = noteOrOptions.join(", ");
        } else {
          // Single value - save to note field
          completionData.note = noteOrOptions;
        }

        await createCompletion(taskId, dateStr, completionData);

        const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";
        if (!isRecurringTask) {
          await updateTask(taskId, { status: "complete" });
        }

        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }
      } catch (error) {
        console.error("Error completing task with note:", error);
      }
    },
    [tasks, today, viewDate, createCompletion, updateTask, showCompletedTasks, addToRecentlyCompleted]
  );

  // Roll over task to next day
  const handleRolloverTask = useCallback(
    async (taskId, date) => {
      try {
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error("Task not found");
        }

        // Verify it's a recurring task
        if (!task.recurrence || task.recurrence.type === "none") {
          throw new Error("Only recurring tasks can be rolled over");
        }

        const targetDate = date instanceof Date ? date : new Date(date);
        const dateStr = formatLocalDate(targetDate);

        // Call the rollover API endpoint
        await rolloverTaskMutation({ taskId, date: dateStr }).unwrap();
      } catch (error) {
        console.error("Error rolling over task:", error);
        throw error;
      }
    },
    [tasks, rolloverTaskMutation]
  );

  return useMemo(
    () => ({
      // State
      recentlyCompletedTasks,
      today,
      viewDate,

      // Handlers
      handleToggleTask,
      handleToggleSubtask,
      handleSubtaskOutcomeChange,
      handleOutcomeChange,
      handleNotCompletedTask,
      handleCompleteWithNote,
      handleRolloverTask,

      // Helpers
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
    }),
    [
      recentlyCompletedTasks,
      today,
      viewDate,
      handleToggleTask,
      handleToggleSubtask,
      handleSubtaskOutcomeChange,
      handleOutcomeChange,
      handleNotCompletedTask,
      handleCompleteWithNote,
      handleRolloverTask,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
    ]
  );
}

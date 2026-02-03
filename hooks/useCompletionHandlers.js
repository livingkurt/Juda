"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatLocalDate, minutesToTime } from "@/lib/utils";
import { useGetTasksQuery, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
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

  // RTK Query hooks
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
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

  // Wrapper functions
  const updateTask = useCallback(
    async (id, taskData) => {
      return await updateTaskMutation({ id, ...taskData }).unwrap();
    },
    [updateTaskMutation]
  );

  const createCompletion = useCallback(
    async (taskId, date, options = {}) => {
      return await createCompletionMutation({ taskId, date, ...options }).unwrap();
    },
    [createCompletionMutation]
  );

  const deleteCompletion = useCallback(
    async (taskId, date) => {
      return await deleteCompletionMutation({ taskId, date }).unwrap();
    },
    [deleteCompletionMutation]
  );

  const batchCreateCompletions = useCallback(
    async completionsToCreate => {
      return await batchCreateCompletionsMutation(completionsToCreate).unwrap();
    },
    [batchCreateCompletionsMutation]
  );

  const batchDeleteCompletions = useCallback(
    async completionsToDelete => {
      return await batchDeleteCompletionsMutation(completionsToDelete).unwrap();
    },
    [batchDeleteCompletionsMutation]
  );

  // Track timeouts for recently completed tasks
  const recentlyCompletedTimeoutsRef = useRef({});

  // Cleanup timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
    };
  }, []);

  // Clear recently completed tasks when showCompletedTasks is turned on
  useEffect(() => {
    if (showCompletedTasks) {
      dispatch(clearRecentlyCompletedTasks());
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
    }
  }, [showCompletedTasks, dispatch]);

  // Remove from recently completed
  const removeFromRecentlyCompleted = useCallback(
    taskId => {
      dispatch(removeRecentlyCompletedTask(taskId));
      if (recentlyCompletedTimeoutsRef.current[taskId]) {
        clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
        delete recentlyCompletedTimeoutsRef.current[taskId];
      }
    },
    [dispatch]
  );

  // Add to recently completed with timeout
  const addToRecentlyCompleted = useCallback(
    (taskId, sectionId) => {
      dispatch(addRecentlyCompletedTask(taskId));

      if (recentlyCompletedTimeoutsRef.current[taskId]) {
        clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
      }

      recentlyCompletedTimeoutsRef.current[taskId] = setTimeout(() => {
        removeFromRecentlyCompleted(taskId);

        // After the delay, check if section should auto-collapse
        if (sectionId) {
          setTimeout(() => {
            if (checkAndAutoCollapseSection) {
              checkAndAutoCollapseSection(sectionId);
            }
          }, 50);
        }
      }, 5000);
    },
    [dispatch, removeFromRecentlyCompleted, checkAndAutoCollapseSection]
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

          // If task doesn't have a sectionId (backlog task), assign it to the first section
          if (!task.sectionId && sections.length > 0) {
            updates.sectionId = sections[0].id;
          }

          await updateTask(taskId, updates);
        } else if (!isRecurringTask && !task.time && !isCompletedOnTargetDate) {
          const updates = {
            time: currentTime,
            status: "complete",
          };

          // If task doesn't have a sectionId (backlog task), assign it to the first section
          if (!task.sectionId && sections.length > 0) {
            updates.sectionId = sections[0].id;
          }

          await updateTask(taskId, updates);
        } else if (!isRecurringTask && !isCompletedOnTargetDate) {
          const updates = {
            status: "complete",
          };

          // If task doesn't have a sectionId (backlog task), assign it to the first section
          if (!task.sectionId && sections.length > 0) {
            updates.sectionId = sections[0].id;
          }

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
      sections,
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

          // Only update subtask status if parent is non-recurring
          // Recurring parent tasks don't use status system, so their subtasks shouldn't either
          if (parentIsNonRecurring) {
            await updateTask(subtaskId, { status: "todo" });
          }

          // If parent was "complete", revert to "in_progress"
          if (parentTask && parentIsNonRecurring && parentTask.status === "complete") {
            await updateTask(parentTask.id, { status: "in_progress" });
          }
        } else {
          // CHECKING subtask - only affects this subtask
          await createCompletion(subtaskId, dateStr, { outcome: "completed" });

          // Only update subtask status if parent is non-recurring
          // Recurring parent tasks don't use status system, so their subtasks shouldn't either
          if (parentIsNonRecurring) {
            await updateTask(subtaskId, { status: "complete" });
          }

          // Update parent status intelligently (status only, NOT completions)
          if (parentTask && parentIsNonRecurring) {
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
    async (parentTaskId, subtaskId, outcome) => {
      try {
        const subtask = tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
        if (!subtask) return;

        const parentTask = tasks.find(t => t.id === (parentTaskId || subtask.parentId));
        const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");

        const subtaskIsNonRecurring = !subtask.recurrence || subtask.recurrence.type === "none";
        const targetDate = subtaskIsNonRecurring ? today : viewDate;
        const dateStr = formatLocalDate(targetDate);

        if (outcome === null) {
          await deleteCompletion(subtaskId, dateStr);

          // Only update subtask status if parent is non-recurring
          // Recurring parent tasks don't use status system, so their subtasks shouldn't either
          if (parentIsNonRecurring) {
            await updateTask(subtaskId, { status: "todo" });
          }

          if (parentTask && parentIsNonRecurring && parentTask.status === "complete") {
            await updateTask(parentTask.id, { status: "in_progress" });
          }

          if (!showCompletedTasks && recentlyCompletedTasks.has(subtaskId)) {
            removeFromRecentlyCompleted(subtaskId);
          }
          return;
        }

        if (outcome === "completed" && !showCompletedTasks) {
          addToRecentlyCompleted(subtaskId, parentTask?.sectionId);
        }

        await createCompletion(subtaskId, dateStr, { outcome });

        // Only update subtask status if parent is non-recurring
        // Recurring parent tasks don't use status system, so their subtasks shouldn't either
        if (outcome === "completed" && parentIsNonRecurring) {
          await updateTask(subtaskId, { status: "complete" });
        }

        if (parentTask && parentIsNonRecurring && outcome === "completed") {
          if (parentTask.status === "todo") {
            await updateTask(parentTask.id, {
              status: "in_progress",
              startedAt: new Date().toISOString(),
            });
          }

          const allSubtasksComplete = areAllSubtasksComplete(parentTask, targetDate, subtaskId);
          if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
            await updateTask(parentTask.id, { status: "complete" });
          }
        }
      } catch (error) {
        console.error("Error updating subtask outcome:", error);
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

  // Handle outcome change (completed/not_completed)
  const handleOutcomeChange = useCallback(
    async (taskId, date, outcome) => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(dateObj);

        // Find task - need to search both root tasks AND subtasks
        let task = tasks.find(t => t.id === taskId);
        const foundInRoot = Boolean(task);
        if (!task) {
          // Search in subtasks
          task = tasks.flatMap(t => t.subtasks || []).find(st => st.id === taskId);
        }

        const isSubtask = task?.parentId != null;
        const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        // Find parent if this is a subtask
        const parentTask = isSubtask ? tasks.find(t => t.id === task.parentId) : null;
        const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");

        // DEBUG: Log values to understand flow
        console.warn("[handleOutcomeChange] DEBUG:", {
          taskId,
          taskTitle: task?.title,
          foundInRoot,
          isSubtask,
          isRecurringTask,
          parentId: task?.parentId,
          parentTaskTitle: parentTask?.title,
          parentIsNonRecurring,
          outcome,
        });

        if (outcome === null) {
          await deleteCompletion(taskId, dateStr);

          // For non-recurring tasks, revert status based on whether task was started
          // This syncs unchecking the checkbox with status badge
          // Goals can also have their status synced with completions
          if (!isRecurringTask) {
            // Revert to "in_progress" if task had been started, otherwise "todo"
            const newStatus = task?.startedAt ? "in_progress" : "todo";
            await updateTask(taskId, { status: newStatus });
          }

          // Handle subtask unchecking - update parent if needed
          if (isSubtask && parentIsNonRecurring && parentTask.status === "complete") {
            await updateTask(parentTask.id, { status: "in_progress" });
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
            await batchDeleteCompletions(deletions);
          }
        } else {
          if (outcome === "completed" && !showCompletedTasks) {
            addToRecentlyCompleted(taskId, task?.sectionId);
          }

          try {
            await createCompletion(taskId, dateStr, { outcome });

            // For non-recurring tasks, set status to complete
            // This syncs checking the checkbox with status badge
            // Goals can also have their status synced with completions
            if (outcome === "completed" && !isRecurringTask) {
              await updateTask(taskId, { status: "complete" });
            }

            // Handle subtask completion - update parent intelligently
            if (isSubtask && parentIsNonRecurring && outcome === "completed") {
              // If parent was "todo", move to "in_progress"
              if (parentTask.status === "todo") {
                await updateTask(parentTask.id, {
                  status: "in_progress",
                  startedAt: new Date().toISOString(),
                });
              }

              // Check if ALL subtasks are now completed
              const allSubtasksComplete = areAllSubtasksComplete(parentTask, dateObj, taskId);

              if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
                // NOTE: We only update the status, NOT create a completion
                // The completion should only be created when the user explicitly checks the parent
                await updateTask(parentTask.id, { status: "complete" });
              }
            }

            // Only cascade to subtasks if this is a PARENT task
            // batchCreateCompletions will upsert (update existing or create new)
            if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
              const creations = task.subtasks.map(subtask => ({
                taskId: subtask.id,
                date: dateStr,
                outcome,
              }));
              await batchCreateCompletions(creations);
            }
          } catch (completionError) {
            if (outcome === "completed" && !showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
              removeFromRecentlyCompleted(taskId);
            }
            throw completionError;
          }
        }
        // Auto-collapse check will happen in addToRecentlyCompleted after the delay
      } catch (error) {
        console.error("Failed to update task:", error.message);
      }
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

  // Complete with note
  const handleCompleteWithNote = useCallback(
    async (taskId, note) => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(targetDate);
        await createCompletion(taskId, dateStr, {
          outcome: "completed",
          note,
        });

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

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
  const handleToggleTask = useCallback(
    async taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

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

          if (!isRecurringTask) {
            await updateTask(taskId, {
              status: "todo",
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

  // Toggle subtask completion
  const handleToggleSubtask = useCallback(
    async (taskId, subtaskId) => {
      const subtask =
        tasks.find(t => t.id === subtaskId) || tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
      if (!subtask) return;

      const hasNoRecurrence = !subtask.recurrence;
      const targetDate = hasNoRecurrence ? today : viewDate;
      const isCompletedOnTargetDate = isCompletedOnDate(subtaskId, targetDate);

      try {
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
          await deleteCompletion(subtaskId, dateStr);
        } else {
          await createCompletion(subtaskId, dateStr);
        }
      } catch (error) {
        console.error("Error toggling subtask completion:", error);
      }
    },
    [tasks, today, viewDate, isCompletedOnDate, updateTask, createCompletion, deleteCompletion]
  );

  // Handle outcome change (completed/not_completed)
  const handleOutcomeChange = useCallback(
    async (taskId, date, outcome) => {
      try {
        const dateObj = date instanceof Date ? date : new Date(date);
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(dateObj);
        const task = tasks.find(t => t.id === taskId);
        const isSubtask = task?.parentId != null;
        const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (outcome === null) {
          await deleteCompletion(taskId, dateStr);

          if (!isRecurringTask) {
            await updateTask(taskId, { status: "todo" });
          }

          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }

          if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
            await Promise.all(task.subtasks.map(subtask => deleteCompletion(subtask.id, dateStr)));
          }
        } else {
          if (outcome === "completed" && !showCompletedTasks) {
            addToRecentlyCompleted(taskId, task?.sectionId);
          }

          try {
            await createCompletion(taskId, dateStr, { outcome });

            if (outcome === "completed" && !isRecurringTask) {
              await updateTask(taskId, { status: "complete" });
            }

            if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
              await Promise.all(task.subtasks.map(subtask => createCompletion(subtask.id, dateStr, { outcome })));
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
      updateTask,
      showCompletedTasks,
      recentlyCompletedTasks,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
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

  // Complete with note (also handles reflection answers)
  const handleCompleteWithNote = useCallback(
    async (taskId, note, additionalData = {}) => {
      try {
        const task = tasks.find(t => t.id === taskId);
        const targetDate = viewDate || today;
        // Format date as YYYY-MM-DD to avoid timezone issues
        const dateStr = formatLocalDate(targetDate);

        console.warn("[useCompletionHandlers] handleCompleteWithNote called:", {
          taskId,
          dateStr,
          note,
          additionalData,
        });

        await createCompletion(taskId, dateStr, {
          outcome: "completed",
          note,
          ...additionalData,
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
      handleOutcomeChange,
      handleNotCompletedTask,
      handleCompleteWithNote,
      handleRolloverTask,
      addToRecentlyCompleted,
      removeFromRecentlyCompleted,
    ]
  );
}

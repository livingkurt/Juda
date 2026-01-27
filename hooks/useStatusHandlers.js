"use client";

import { useCallback } from "react";
import { formatLocalDate, minutesToTime } from "@/lib/utils";
import { useGetTasksQuery, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCreateCompletionMutation, useDeleteCompletionMutation } from "@/lib/store/api/completionsApi";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

/**
 * Handles task status changes (todo/in_progress/complete)
 * Uses Redux directly - no prop drilling needed
 */
export function useStatusHandlers({
  // This is passed from parent because it's managed by useCompletionHandlers hook
  addToRecentlyCompleted,
} = {}) {
  // RTK Query hooks
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [createCompletionMutation] = useCreateCompletionMutation();
  const [deleteCompletionMutation] = useDeleteCompletionMutation();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // Completion helpers
  const { isCompletedOnDate } = useCompletionHelpers();

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

  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      // Helper to find task recursively (including subtasks)
      const findTask = (taskList, id) => {
        for (const task of taskList) {
          if (task.id === id) return task;
          if (task.subtasks && task.subtasks.length > 0) {
            const found = findTask(task.subtasks, id);
            if (found) return found;
          }
        }
        return null;
      };

      const task = findTask(tasks, taskId);
      if (!task) {
        console.error("Task not found:", taskId);
        return;
      }

      console.warn("Status change:", { taskId, currentStatus: task.status, newStatus });

      // Check if this is a subtask
      const isSubtask = task.parentId != null;
      const parentTask = isSubtask ? tasks.find(t => t.id === task.parentId) : null;
      const parentIsNonRecurring = parentTask && (!parentTask.recurrence || parentTask.recurrence.type === "none");

      const updates = { status: newStatus };
      const now = new Date();
      const todayStr = formatLocalDate(now);

      // Check if task is recurring (exclude from completion sync)
      const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

      if (newStatus === "in_progress") {
        // Set startedAt when moving to in_progress
        updates.startedAt = now.toISOString();

        // If task has no date, set it to today (so it appears in Today view)
        if (!task.recurrence || task.recurrence.type === "none") {
          if (!task.recurrence?.startDate) {
            updates.recurrence = { type: "none", startDate: `${todayStr}T00:00:00.000Z` };
          }
        }

        // If task was previously completed, delete completion record for today
        // BUT: Don't delete completions for recurring tasks
        if (task.status === "complete" && !isRecurring) {
          try {
            await deleteCompletion(taskId, todayStr);
          } catch (error) {
            // Ignore if no completion exists
            if (!error?.message?.includes("not found")) {
              console.error("Failed to delete completion when moving to in_progress:", error);
            }
          }
        }

        // If this is a subtask and parent was "todo", update parent to "in_progress"
        if (isSubtask && parentIsNonRecurring && parentTask.status === "todo") {
          await updateTask(parentTask.id, {
            status: "in_progress",
            startedAt: now.toISOString(),
          });
        }

        // If this is a subtask and parent was "complete", update parent to "in_progress"
        if (isSubtask && parentIsNonRecurring && parentTask.status === "complete") {
          await updateTask(parentTask.id, { status: "in_progress" });
        }
      } else if (newStatus === "todo") {
        // Clear startedAt when moving back to todo
        updates.startedAt = null;

        // If task was previously completed, delete completion record for today
        // This syncs "Set to Todo" with unchecking the checkbox
        // BUT: Don't delete completions for recurring tasks
        if (task.status === "complete" && !isRecurring) {
          try {
            await deleteCompletion(taskId, todayStr);
          } catch (error) {
            // Ignore if no completion exists
            if (!error?.message?.includes("not found")) {
              console.error("Failed to delete completion when moving to todo:", error);
            }
          }
        }

        // If this is a subtask and parent was "complete", update parent to "in_progress"
        if (isSubtask && parentIsNonRecurring && parentTask.status === "complete") {
          await updateTask(parentTask.id, { status: "in_progress" });
        }
      } else if (newStatus === "complete") {
        // When completing, create a TaskCompletion record with timing data
        const completedAt = now;
        const startedAt = task.startedAt ? new Date(task.startedAt) : completedAt;

        // Check if task has no recurrence (needs to be set so it appears in Today view)
        const hasNoRecurrence = !task.recurrence;
        const isRecurringTask = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        // If task has no recurrence, set it to today's date so it appears in Today view
        // (same behavior as completing from backlog)
        if (hasNoRecurrence) {
          const todayStr = formatLocalDate(now);
          updates.recurrence = {
            type: "none",
            startDate: `${todayStr}T00:00:00.000Z`,
          };

          // If task doesn't have a sectionId (backlog task), assign it to the first section
          if (!task.sectionId && sections.length > 0) {
            updates.sectionId = sections[0].id;
          }
        }
        // If task is non-recurring (one-time) and doesn't have a startDate, set it to today
        else if (!isRecurringTask && !task.recurrence.startDate) {
          const todayStr = formatLocalDate(now);
          updates.recurrence = {
            ...task.recurrence,
            startDate: `${todayStr}T00:00:00.000Z`,
          };

          // If task doesn't have a sectionId (backlog task), assign it to the first section
          if (!task.sectionId && sections.length > 0) {
            updates.sectionId = sections[0].id;
          }
        }

        // Set the time to the current time so it shows up on the calendar at that specific time
        // Format: "HH:MM" (24-hour format)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        updates.time = minutesToTime(currentMinutes);

        // Create completion record for non-recurring tasks (including goals)
        // This syncs "Set to Complete" with checking the checkbox
        // Goals can have completions created from reflections OR from status changes
        // Recurring tasks use the outcome system, not status field
        if (!isRecurring) {
          try {
            await createCompletion(taskId, todayStr, {
              outcome: "completed",
              startedAt: startedAt.toISOString(),
              completedAt: completedAt.toISOString(),
            });

            // Clear startedAt on task since it's now stored in completion
            updates.startedAt = null;
          } catch (error) {
            // Ignore if completion already exists
            if (!error?.message?.includes("already exists")) {
              console.error("Error creating completion:", error);
            }
          }
        }

        // If this is a subtask, update parent intelligently
        if (isSubtask && parentIsNonRecurring) {
          // If parent was "todo", move to "in_progress"
          if (parentTask.status === "todo") {
            await updateTask(parentTask.id, {
              status: "in_progress",
              startedAt: now.toISOString(),
            });
          }

          // Check if ALL subtasks are now completed (including this one)
          const viewDate = new Date(todayStr);
          const allSubtasksComplete = areAllSubtasksComplete(parentTask, viewDate, taskId);

          if (allSubtasksComplete && parentTask.subtasks?.length > 0) {
            // NOTE: We only update the status, NOT create a completion
            // The completion should only be created when the user explicitly checks the parent
            await updateTask(parentTask.id, { status: "complete" });
          }
        }

        // Add to recently completed for visual feedback
        if (!showCompletedTasks && addToRecentlyCompleted) {
          addToRecentlyCompleted(taskId, task.sectionId);
        }
      }

      console.warn("Updating task with:", updates);
      await updateTask(taskId, updates);
      console.warn("Task updated successfully");
    },
    [
      tasks,
      sections,
      updateTask,
      createCompletion,
      deleteCompletion,
      showCompletedTasks,
      addToRecentlyCompleted,
      areAllSubtasksComplete,
    ]
  );

  return {
    handleStatusChange,
  };
}

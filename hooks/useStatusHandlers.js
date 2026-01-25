"use client";

import { useCallback } from "react";
import { formatLocalDate, minutesToTime } from "@/lib/utils";
import { useGetTasksQuery, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCreateCompletionMutation, useDeleteCompletionMutation } from "@/lib/store/api/completionsApi";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

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

      const updates = { status: newStatus };
      const now = new Date();

      if (newStatus === "in_progress") {
        // Set startedAt when moving to in_progress
        updates.startedAt = now.toISOString();

        // If task has no date, set it to today (so it appears in Today view)
        if (!task.recurrence || task.recurrence.type === "none") {
          const todayStr = formatLocalDate(new Date());
          if (!task.recurrence?.startDate) {
            updates.recurrence = { type: "none", startDate: `${todayStr}T00:00:00.000Z` };
          }
        }

        // If task was previously completed, delete completion records
        // BUT: Don't delete completions for goals - they may contain reflection data
        if (task.status === "complete" && task.completionType !== "goal") {
          try {
            // Fetch all completions for this specific task
            const response = await fetch(`/api/completions?taskId=${taskId}`);
            if (response.ok) {
              const data = await response.json();
              const taskCompletions = data.completions || data || [];
              // Delete each completion
              await Promise.all(
                taskCompletions.map(completion => {
                  const completionDate = new Date(completion.date);
                  const dateStr = formatLocalDate(completionDate);
                  return deleteCompletion(taskId, dateStr);
                })
              );
            }
          } catch (error) {
            console.error("Failed to delete completions when moving to in_progress:", error);
          }
        }
      } else if (newStatus === "todo") {
        // Clear startedAt when moving back to todo
        updates.startedAt = null;

        // If task was previously completed, delete completion records
        // BUT: Don't delete completions for goals - they may contain reflection data
        if (task.status === "complete" && task.completionType !== "goal") {
          try {
            // Fetch all completions for this specific task
            const response = await fetch(`/api/completions?taskId=${taskId}`);
            if (response.ok) {
              const data = await response.json();
              const taskCompletions = data.completions || data || [];
              // Delete each completion
              await Promise.all(
                taskCompletions.map(completion => {
                  const completionDate = new Date(completion.date);
                  const dateStr = formatLocalDate(completionDate);
                  return deleteCompletion(taskId, dateStr);
                })
              );
            }
          } catch (error) {
            console.error("Failed to delete completions when moving to todo:", error);
          }
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

        // Create completion record - format date as YYYY-MM-DD to avoid timezone issues
        // BUT: Don't create completion records for goals - they use status field only
        // Goals get their completion data from reflections, not from status changes
        if (task.completionType !== "goal") {
          const dateStr = formatLocalDate(now);
          await createCompletion(taskId, dateStr, {
            outcome: "completed",
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
          });

          // Clear startedAt on task since it's now stored in completion
          updates.startedAt = null;
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
    [tasks, sections, updateTask, createCompletion, deleteCompletion, showCompletedTasks, addToRecentlyCompleted]
  );

  return {
    handleStatusChange,
  };
}

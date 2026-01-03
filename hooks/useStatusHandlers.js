import { useCallback } from "react";
import { formatLocalDate, minutesToTime } from "@/lib/utils";

export function useStatusHandlers({ tasks, updateTask, createCompletion, showCompletedTasks, addToRecentlyCompleted }) {
  const handleStatusChange = useCallback(
    async (taskId, newStatus) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

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
      } else if (newStatus === "todo") {
        // Clear startedAt when moving back to todo
        updates.startedAt = null;
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
        }
        // If task is non-recurring (one-time) and doesn't have a startDate, set it to today
        else if (!isRecurringTask && !task.recurrence.startDate) {
          const todayStr = formatLocalDate(now);
          updates.recurrence = {
            ...task.recurrence,
            startDate: `${todayStr}T00:00:00.000Z`,
          };
        }

        // Set the time to the current time so it shows up on the calendar at that specific time
        // Format: "HH:MM" (24-hour format)
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        updates.time = minutesToTime(currentMinutes);

        // Create completion record
        await createCompletion(taskId, now.toISOString(), {
          outcome: "completed",
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
        });

        // Clear startedAt on task since it's now stored in completion
        updates.startedAt = null;

        // Add to recently completed for visual feedback
        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task.sectionId);
        }
      }

      await updateTask(taskId, updates);
    },
    [tasks, updateTask, createCompletion, showCompletedTasks, addToRecentlyCompleted]
  );

  return {
    handleStatusChange,
  };
}

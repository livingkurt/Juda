"use client";

import { useDeferredValue } from "react";
import { useGetBacklogTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that fetches ONLY backlog tasks
 * Uses the dedicated /api/tasks/backlog endpoint which is much faster
 * than loading all tasks and filtering client-side.
 *
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useBacklogTasks(options = {}) {
  const { data: tasks = [], isLoading, error, refetch, isFetching } = useGetBacklogTasksQuery(undefined, options);

  // Defer the tasks update to prevent blocking the UI
  const deferredTasks = useDeferredValue(tasks);

  return {
    data: deferredTasks,
    tasks: deferredTasks,
    rawTasks: tasks, // Non-deferred for loading checks
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

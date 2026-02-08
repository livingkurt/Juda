"use client";

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

  return {
    data: tasks,
    tasks,
    rawTasks: tasks, // Non-deferred for loading checks
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

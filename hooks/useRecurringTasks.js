"use client";

import { useDeferredValue } from "react";
import { useGetRecurringTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that fetches ONLY recurring tasks
 * Uses the dedicated /api/tasks/recurring endpoint which is much faster
 * than loading all tasks and filtering client-side.
 *
 * Used by JournalTab and HistoryTab.
 *
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useRecurringTasks(options = {}) {
  const { data: tasks = [], isLoading, error, refetch, isFetching } = useGetRecurringTasksQuery(undefined, options);

  // Defer the tasks update to prevent blocking the UI
  const deferredTasks = useDeferredValue(tasks);

  return {
    data: deferredTasks,
    tasks: deferredTasks,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

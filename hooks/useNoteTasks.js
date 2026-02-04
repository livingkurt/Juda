"use client";

import { useDeferredValue } from "react";
import { useGetNoteTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that fetches ONLY note tasks
 * Uses the dedicated /api/tasks/notes endpoint which is much faster
 * than loading all tasks and filtering client-side.
 *
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useNoteTasks(options = {}) {
  const { data: tasks = [], isLoading, error, refetch, isFetching } = useGetNoteTasksQuery(undefined, options);

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

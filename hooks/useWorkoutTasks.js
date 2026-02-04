"use client";

import { useDeferredValue } from "react";
import { useGetWorkoutTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that fetches ONLY workout tasks
 * Uses the dedicated /api/tasks/workout endpoint which is much faster
 * than loading all tasks and filtering client-side.
 *
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useWorkoutTasks(options = {}) {
  const { data: tasks = [], isLoading, error, refetch, isFetching } = useGetWorkoutTasksQuery(undefined, options);

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

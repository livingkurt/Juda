"use client";

import { useDeferredValue } from "react";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that provides tasks with deferred value to prevent UI blocking
 * Use this instead of useGetTasksQuery directly for better performance
 */
export function useTasksWithDeferred(params, options) {
  const { data: tasks = [], isLoading, error, refetch } = useGetTasksQuery(params, options);

  // Defer the tasks update to prevent blocking the UI
  // This tells React: "This update is low priority, don't block user interactions"
  const deferredTasks = useDeferredValue(tasks);

  return {
    data: deferredTasks,
    tasks: deferredTasks, // Alias for convenience
    isLoading,
    error,
    refetch,
  };
}

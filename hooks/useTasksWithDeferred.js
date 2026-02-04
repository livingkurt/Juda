"use client";

import { useDeferredValue } from "react";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that provides tasks with deferred value to prevent UI blocking
 * Use this instead of useGetTasksQuery directly for better performance
 *
 * NOTE: We still load all tasks because the app architecture requires it:
 * - Today view needs tasks for the current date
 * - Backlog needs tasks without dates
 * - Calendar needs tasks for date ranges
 * All these filter from the same task list
 *
 * Performance is optimized through:
 * - Database indexes (added in migration 0044)
 * - useDeferredValue (prevents UI blocking during updates)
 * - Client-side caching (RTK Query)
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
    isLoadingMore: false, // Not using pagination currently
    error,
    refetch,
  };
}

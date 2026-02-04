"use client";

import { useDeferredValue } from "react";
import { useGetCalendarTasksQuery } from "@/lib/store/api/tasksApi";

/**
 * Hook that fetches ONLY calendar tasks for a date range
 * Uses the dedicated /api/tasks/calendar endpoint.
 *
 * @param {Object} range - { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useCalendarTasks(range, options = {}) {
  const shouldSkip = !range?.start || !range?.end || options.skip;
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetCalendarTasksQuery(range, {
    skip: shouldSkip,
    ...options,
  });

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

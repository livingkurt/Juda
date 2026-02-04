"use client";

import { useDeferredValue, useMemo } from "react";
import { useGetTasksForDateQuery } from "@/lib/store/api/tasksApi";
import { formatLocalDate } from "@/lib/utils";

/**
 * Hook that fetches ONLY tasks for a specific date
 * Uses the dedicated /api/tasks/today endpoint which is much faster
 * than loading all tasks and filtering client-side.
 *
 * @param {Date} date - The date to fetch tasks for
 * @param {Object} options - RTK Query options (skip, etc.)
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export function useTasksForToday(date, options = {}) {
  // Format date as YYYY-MM-DD
  const dateStr = useMemo(() => {
    const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    return formatLocalDate(safeDate);
  }, [date]);

  // Fetch tasks for this specific date only
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetTasksForDateQuery(dateStr, { skip: !dateStr || options.skip, ...options });

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

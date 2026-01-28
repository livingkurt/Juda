"use client";

import { useMemo } from "react";
import { useGetCompletionsQuery } from "@/lib/store/api/completionsApi";
import { useAuth } from "@/hooks/useAuth";

// Helper function to normalize date to UTC midnight for consistent comparison
// Handles Date objects, ISO strings, and date strings (YYYY-MM-DD)
const normalizeDate = date => {
  if (!date) {
    // Use local date parts for "today"
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }

  // If it's already a date string in YYYY-MM-DD format, parse it as UTC
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  // If it's an ISO string (contains T or Z), it's already in UTC - use UTC parts
  if (typeof date === "string" && (date.includes("T") || date.includes("Z"))) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  // For Date objects, use LOCAL date parts (the date the user sees)
  // This ensures Jan 7 local time becomes Jan 7 UTC midnight, not Jan 6
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
};

// Helper function to create lookup key from taskId and date
const createLookupKey = (taskId, date) => {
  const normalized = normalizeDate(date);
  return `${taskId}|${normalized.toISOString()}`;
};

const getDateRangeForView = (viewType = "today", viewDate = null) => {
  const end = viewDate ? new Date(viewDate) : new Date();
  const start = new Date(end);

  // Performance optimization: Fetch only what's needed based on view
  let daysBack, daysForward;
  switch (viewType) {
    case "today":
      daysBack = 7; // Only need recent history for today view
      daysForward = 1;
      break;
    case "week":
      daysBack = 7;
      daysForward = 7;
      break;
    case "month":
      daysBack = 35; // Need more history for month view
      daysForward = 7;
      break;
    case "calendar":
      daysBack = 30; // Default for calendar views
      daysForward = 30;
      break;
    default:
      daysBack = 30; // Default fallback
      daysForward = 7;
  }

  start.setDate(start.getDate() - daysBack);
  const startOfDay = normalizeDate(start);
  const endDateObj = new Date(end);
  endDateObj.setDate(endDateObj.getDate() + daysForward);
  const endOfDay = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate(), 23, 59, 59, 999);

  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
};

/**
 * Hook that provides helper functions for working with completions
 * This maintains the same API as the old useCompletions hook
 *
 * Performance optimization: Date range is now view-specific to reduce
 * data load and improve performance:
 * - today: 7 days back, 1 day forward
 * - week: 7 days back, 7 days forward
 * - month: 35 days back, 7 days forward
 * - calendar: 30 days back, 30 days forward
 */
export function useCompletionHelpers(viewType = "today", viewDate = null) {
  const { isAuthenticated } = useAuth();
  // View-specific date range for better performance
  const { startDate, endDate } = getDateRangeForView(viewType, viewDate);
  const {
    data: completionsData,
    isLoading,
    error,
  } = useGetCompletionsQuery(
    { startDate, endDate, limit: 10000 },
    {
      skip: !isAuthenticated,
    }
  );

  // Extract completions array from paginated response
  const completions = useMemo(() => {
    if (!completionsData) return [];
    // Handle both old format (array) and new format (object with completions array)
    if (Array.isArray(completionsData)) return completionsData;
    return completionsData.completions || [];
  }, [completionsData]);

  // Memoized lookup maps for O(1) access instead of O(n) array searches
  const completionsByTaskAndDate = useMemo(() => {
    const map = new Map();
    completions.forEach(completion => {
      const key = createLookupKey(completion.taskId, completion.date);
      map.set(key, completion);
    });
    return map;
  }, [completions]);

  // Map of taskId -> Set of dates (for hasAnyCompletion)
  const completionsByTask = useMemo(() => {
    const map = new Map();
    completions.forEach(completion => {
      if (!map.has(completion.taskId)) {
        map.set(completion.taskId, new Set());
      }
      map.get(completion.taskId).add(normalizeDate(completion.date).toISOString());
    });
    return map;
  }, [completions]);

  // Check if a task is completed on a specific date (only counts 'completed' outcome) - O(1) lookup
  const isCompletedOnDate = (taskId, date) => {
    const key = createLookupKey(taskId, date);
    const completion = completionsByTaskAndDate.get(key);
    return completion?.outcome === "completed" || (completion && !completion.outcome);
  };

  // Get the full completion object for a task on a specific date (O(1) lookup)
  const getCompletionForDate = (taskId, date) => {
    const key = createLookupKey(taskId, date);
    return completionsByTaskAndDate.get(key) || null;
  };

  // Check if a task has any record on a specific date (regardless of outcome) - O(1) lookup
  const hasRecordOnDate = (taskId, date) => {
    const key = createLookupKey(taskId, date);
    return completionsByTaskAndDate.has(key);
  };

  // Get the outcome for a task on a specific date - O(1) lookup
  const getOutcomeOnDate = (taskId, date) => {
    const key = createLookupKey(taskId, date);
    const completion = completionsByTaskAndDate.get(key);
    return completion?.outcome || null;
  };

  // Check if a task has ANY completion record (regardless of date) - O(1) lookup
  // Used for one-time tasks to determine if they should stay hidden from backlog
  const hasAnyCompletion = taskId => {
    return completionsByTask.has(taskId);
  };

  return {
    completions,
    loading: isLoading,
    error,
    isCompletedOnDate,
    getCompletionForDate,
    hasRecordOnDate,
    getOutcomeOnDate,
    hasAnyCompletion,
  };
}

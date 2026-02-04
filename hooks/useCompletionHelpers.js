"use client";

import { useMemo, useDeferredValue, useCallback } from "react";
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

// Cache for normalized date strings to avoid repeated computation
const normalizedDateCache = new Map();

// Helper function to get normalized date string (cached)
const getNormalizedDateString = date => {
  // Use a cache key based on the input
  const cacheKey = date instanceof Date ? date.getTime() : String(date);

  if (normalizedDateCache.has(cacheKey)) {
    return normalizedDateCache.get(cacheKey);
  }

  const normalized = normalizeDate(date).toISOString();

  // Limit cache size to prevent memory leaks
  if (normalizedDateCache.size > 100) {
    // Clear oldest entries (simple strategy)
    const firstKey = normalizedDateCache.keys().next().value;
    normalizedDateCache.delete(firstKey);
  }

  normalizedDateCache.set(cacheKey, normalized);
  return normalized;
};

// Helper function to create lookup key from taskId and date
const createLookupKey = (taskId, date) => {
  return `${taskId}|${getNormalizedDateString(date)}`;
};

const getRecentDateRange = (daysBack = 90) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  const startOfDay = normalizeDate(start);
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return {
    startDate: startOfDay.toISOString(),
    endDate: endOfDay.toISOString(),
  };
};

/**
 * Hook that provides helper functions for working with completions
 * This maintains the same API as the old useCompletions hook
 */
export function useCompletionHelpers() {
  const { isAuthenticated } = useAuth();
  const { startDate, endDate } = getRecentDateRange(90);
  const {
    data: completionsData,
    isLoading,
    error,
  } = useGetCompletionsQuery(
    { startDate, endDate, limit: 5000 },
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

  // Defer the completions update to prevent blocking the UI
  // This tells React: "This update is low priority, don't block user interactions"
  const deferredCompletions = useDeferredValue(completions);

  // Memoized lookup maps for O(1) access instead of O(n) array searches
  // Use deferredCompletions to prevent blocking UI during re-computation
  const completionsByTaskAndDate = useMemo(() => {
    const map = new Map();
    deferredCompletions.forEach(completion => {
      const key = createLookupKey(completion.taskId, completion.date);
      map.set(key, completion);
    });
    return map;
  }, [deferredCompletions]);

  // Map of taskId -> Set of dates (for hasAnyCompletion)
  const completionsByTask = useMemo(() => {
    const map = new Map();
    deferredCompletions.forEach(completion => {
      if (!map.has(completion.taskId)) {
        map.set(completion.taskId, new Set());
      }
      map.get(completion.taskId).add(normalizeDate(completion.date).toISOString());
    });
    return map;
  }, [deferredCompletions]);

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

  // OPTIMIZATION: Get lookup functions bound to a specific date
  // This pre-computes the normalized date string ONCE, then reuses it for all tasks
  // Use this when processing many tasks for the same date
  const getLookupsForDate = useCallback(
    date => {
      const normalizedDateStr = getNormalizedDateString(date);

      return {
        isCompleted: taskId => {
          const key = `${taskId}|${normalizedDateStr}`;
          const completion = completionsByTaskAndDate.get(key);
          return completion?.outcome === "completed" || (completion && !completion.outcome);
        },
        getOutcome: taskId => {
          const key = `${taskId}|${normalizedDateStr}`;
          const completion = completionsByTaskAndDate.get(key);
          return completion?.outcome || null;
        },
        hasRecord: taskId => {
          const key = `${taskId}|${normalizedDateStr}`;
          return completionsByTaskAndDate.has(key);
        },
      };
    },
    [completionsByTaskAndDate]
  );

  return {
    completions: deferredCompletions, // Return deferred version
    loading: isLoading,
    error,
    isCompletedOnDate,
    getCompletionForDate,
    hasRecordOnDate,
    getLookupsForDate, // NEW: Optimized batch lookups
    getOutcomeOnDate,
    hasAnyCompletion,
  };
}

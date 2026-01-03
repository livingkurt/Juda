"use client";

import { useMemo } from "react";
import { useGetCompletionsQuery } from "@/lib/store/api/completionsApi";
import { useAuth } from "@/hooks/useAuth";

// Helper function to normalize date to UTC midnight for consistent comparison
const normalizeDate = date => {
  const d = date ? new Date(date) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// Helper function to create lookup key from taskId and date
const createLookupKey = (taskId, date) => {
  const normalized = normalizeDate(date);
  return `${taskId}|${normalized.toISOString()}`;
};

/**
 * Hook that provides helper functions for working with completions
 * This maintains the same API as the old useCompletions hook
 */
export function useCompletionHelpers() {
  const { isAuthenticated } = useAuth();
  const {
    data: completions = [],
    isLoading,
    error,
  } = useGetCompletionsQuery(undefined, {
    skip: !isAuthenticated,
  });

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

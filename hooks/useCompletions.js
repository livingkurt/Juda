"use client";

import { useState, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/hooks/useAuth";

export const useCompletions = () => {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();

  const fetchCompletions = useCallback(
    async (filters = {}) => {
      if (!isAuthenticated) {
        setCompletions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.taskId) params.append("taskId", filters.taskId);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const response = await authFetch(`/api/completions?${params}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch completions (${response.status})`);
        }
        const data = await response.json();
        setCompletions(data);
        setError(null);
        return data;
      } catch (err) {
        setError(err.message);
        console.error("Error fetching completions:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authFetch, isAuthenticated]
  );

  const createCompletion = async (taskId, date, options = {}) => {
    // Support both old signature (outcome as third param) and new signature (options object)
    let outcome = "completed";
    let note = null;
    let skipped = false;

    if (typeof options === "string") {
      // Old signature: createCompletion(taskId, date, outcome)
      outcome = options;
    } else {
      // New signature: createCompletion(taskId, date, { outcome, note, skipped })
      outcome = options.outcome || "completed";
      note = options.note || null;
      skipped = options.skipped || false;
    }

    // Validate outcome
    if (!["completed", "not_completed"].includes(outcome)) {
      throw new Error("Invalid outcome value");
    }

    // Normalize date for consistent comparison - use UTC to avoid timezone issues
    const completionDate = date ? new Date(date) : new Date();
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Optimistic update
    const optimisticCompletion = {
      id: `temp-${Date.now()}`,
      taskId,
      date: utcDate.toISOString(),
      outcome,
      note,
      skipped,
      createdAt: new Date().toISOString(),
    };

    const previousCompletions = [...completions];

    // Check if record exists - update it, otherwise add new
    const existingIndex = completions.findIndex(c => {
      const cDate = new Date(c.date);
      const cUtcDate = new Date(Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0));
      return c.taskId === taskId && cUtcDate.getTime() === utcDate.getTime();
    });

    if (existingIndex >= 0) {
      setCompletions(prev => prev.map((c, i) => (i === existingIndex ? { ...c, outcome, note, skipped } : c)));
    } else {
      setCompletions(prev => [...prev, optimisticCompletion]);
    }

    try {
      const response = await authFetch("/api/completions", {
        method: "POST",
        body: JSON.stringify({ taskId, date: utcDate.toISOString(), outcome, note, skipped }),
      });
      if (!response.ok) throw new Error("Failed to create completion");
      const newCompletion = await response.json();

      // Replace optimistic/existing with real completion
      setCompletions(prev => {
        const filtered = prev.filter(c => {
          if (c.id === optimisticCompletion.id) return false;
          const cDate = new Date(c.date);
          const cUtcDate = new Date(
            Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0)
          );
          return !(c.taskId === taskId && cUtcDate.getTime() === utcDate.getTime());
        });
        return [...filtered, newCompletion];
      });

      return newCompletion;
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  const updateCompletionNote = async (taskId, date, note) => {
    // Normalize date for consistent comparison - use UTC to avoid timezone issues
    const completionDate = date ? new Date(date) : new Date();
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Optimistic update
    const previousCompletions = [...completions];
    const existingIndex = completions.findIndex(c => {
      const cDate = new Date(c.date);
      const cUtcDate = new Date(Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0));
      return c.taskId === taskId && cUtcDate.getTime() === utcDate.getTime();
    });

    if (existingIndex >= 0) {
      setCompletions(prev => prev.map((c, i) => (i === existingIndex ? { ...c, note } : c)));
    }

    try {
      const response = await authFetch("/api/completions", {
        method: "PUT",
        body: JSON.stringify({ taskId, date: utcDate.toISOString(), note }),
      });
      if (!response.ok) throw new Error("Failed to update completion note");
      const updatedCompletion = await response.json();

      // Replace optimistic with real completion
      setCompletions(prev => {
        const filtered = prev.filter(c => {
          const cDate = new Date(c.date);
          const cUtcDate = new Date(
            Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0)
          );
          return !(c.taskId === taskId && cUtcDate.getTime() === utcDate.getTime());
        });
        return [...filtered, updatedCompletion];
      });

      return updatedCompletion;
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  // Get the full completion object for a task on a specific date
  const getCompletionForDate = useCallback(
    (taskId, date) => {
      const checkDate = new Date(date);
      const utcCheckDate = new Date(
        Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0, 0)
      );
      return completions.find(c => {
        const completionDate = new Date(c.date);
        const utcCompletionDate = new Date(
          Date.UTC(
            completionDate.getUTCFullYear(),
            completionDate.getUTCMonth(),
            completionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return c.taskId === taskId && utcCompletionDate.getTime() === utcCheckDate.getTime();
      });
    },
    [completions]
  );

  const deleteCompletion = async (taskId, date) => {
    // Normalize date for consistent comparison - use UTC to avoid timezone issues
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Optimistic delete - store previous state for rollback
    const previousCompletions = [...completions];
    setCompletions(prev =>
      prev.filter(c => {
        const cDate = new Date(c.date);
        const cUtcDate = new Date(
          Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0)
        );
        return c.taskId !== taskId || cUtcDate.getTime() !== utcDate.getTime();
      })
    );

    try {
      const params = new URLSearchParams({ taskId, date: utcDate.toISOString() });
      const response = await authFetch(`/api/completions?${params}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete completion");
      // State already updated optimistically
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  // Check if a task is completed on a specific date
  // Batch create multiple completions at once
  const batchCreateCompletions = async completionsToCreate => {
    if (!Array.isArray(completionsToCreate) || completionsToCreate.length === 0) {
      return;
    }

    // Generate a unique batch ID for this operation
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Normalize dates and create optimistic completions
    const optimisticCompletions = completionsToCreate.map(({ taskId, date }, index) => {
      const completionDate = date ? new Date(date) : new Date();
      const utcDate = new Date(
        Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
      );
      return {
        id: `temp-${batchId}-${index}`,
        taskId,
        date: utcDate.toISOString(),
        outcome: "completed",
        createdAt: new Date().toISOString(),
      };
    });

    const previousCompletions = [...completions];

    // Create a set of optimistic IDs for fast lookup during replacement
    const optimisticIds = new Set(optimisticCompletions.map(c => c.id));

    // Add all optimistic completions in a single state update
    setCompletions(prev => [...prev, ...optimisticCompletions]);

    try {
      const response = await authFetch("/api/completions/batch", {
        method: "POST",
        body: JSON.stringify({
          completions: completionsToCreate.map(({ taskId, date }) => {
            const completionDate = date ? new Date(date) : new Date();
            const utcDate = new Date(
              Date.UTC(
                completionDate.getUTCFullYear(),
                completionDate.getUTCMonth(),
                completionDate.getUTCDate(),
                0,
                0,
                0,
                0
              )
            );
            return { taskId, date: utcDate.toISOString() };
          }),
        }),
      });
      if (!response.ok) throw new Error("Failed to create completions");
      const result = await response.json();

      // Replace ONLY the optimistic completions from this batch with real ones
      // This prevents removing optimistic completions from other concurrent operations
      setCompletions(prev => {
        // Remove only the optimistic completions from THIS batch
        const withoutThisBatch = prev.filter(c => !optimisticIds.has(c.id));
        // Add real completions
        return [...withoutThisBatch, ...result.completions];
      });

      return result.completions;
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  // Batch delete multiple completions at once
  const batchDeleteCompletions = async completionsToDelete => {
    if (!Array.isArray(completionsToDelete) || completionsToDelete.length === 0) {
      return;
    }

    // Normalize dates for comparison
    const normalizedToDelete = completionsToDelete.map(({ taskId, date }) => {
      const completionDate = new Date(date);
      const utcDate = new Date(
        Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
      );
      return { taskId, date: utcDate.toISOString() };
    });

    // Create a set of keys for fast lookup during filtering
    const deleteKeys = new Set(normalizedToDelete.map(d => `${d.taskId}|${d.date}`));

    // Optimistic delete - single state update
    const previousCompletions = [...completions];
    setCompletions(prev =>
      prev.filter(c => {
        const cDate = new Date(c.date);
        const cUtcDate = new Date(
          Date.UTC(cDate.getUTCFullYear(), cDate.getUTCMonth(), cDate.getUTCDate(), 0, 0, 0, 0)
        );
        const cDateStr = cUtcDate.toISOString();
        const key = `${c.taskId}|${cDateStr}`;
        return !deleteKeys.has(key);
      })
    );

    try {
      const response = await authFetch("/api/completions/batch", {
        method: "DELETE",
        body: JSON.stringify({ completions: normalizedToDelete }),
      });
      if (!response.ok) throw new Error("Failed to delete completions");
      // State already updated optimistically
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  // Check if a task is completed on a specific date (only counts 'completed' outcome)
  const isCompletedOnDate = useCallback(
    (taskId, date) => {
      const checkDate = new Date(date);
      const utcCheckDate = new Date(
        Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0, 0)
      );
      return completions.some(c => {
        const completionDate = new Date(c.date);
        const utcCompletionDate = new Date(
          Date.UTC(
            completionDate.getUTCFullYear(),
            completionDate.getUTCMonth(),
            completionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return (
          c.taskId === taskId && utcCompletionDate.getTime() === utcCheckDate.getTime() && c.outcome === "completed"
        );
      });
    },
    [completions]
  );

  // Check if a task has any record on a specific date (regardless of outcome)
  const hasRecordOnDate = useCallback(
    (taskId, date) => {
      const checkDate = new Date(date);
      const utcCheckDate = new Date(
        Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0, 0)
      );
      return completions.some(c => {
        const completionDate = new Date(c.date);
        const utcCompletionDate = new Date(
          Date.UTC(
            completionDate.getUTCFullYear(),
            completionDate.getUTCMonth(),
            completionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return c.taskId === taskId && utcCompletionDate.getTime() === utcCheckDate.getTime();
      });
    },
    [completions]
  );

  // Get the outcome for a task on a specific date
  const getOutcomeOnDate = useCallback(
    (taskId, date) => {
      const checkDate = new Date(date);
      const utcCheckDate = new Date(
        Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), checkDate.getUTCDate(), 0, 0, 0, 0)
      );
      const record = completions.find(c => {
        const completionDate = new Date(c.date);
        const utcCompletionDate = new Date(
          Date.UTC(
            completionDate.getUTCFullYear(),
            completionDate.getUTCMonth(),
            completionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
        return c.taskId === taskId && utcCompletionDate.getTime() === utcCheckDate.getTime();
      });
      return record?.outcome || null;
    },
    [completions]
  );

  // Check if a task has ANY completion record (regardless of date)
  // Used for one-time tasks to determine if they should stay hidden from backlog
  const hasAnyCompletion = useCallback(
    taskId => {
      return completions.some(c => c.taskId === taskId);
    },
    [completions]
  );

  return {
    completions,
    loading,
    error,
    fetchCompletions,
    createCompletion,
    deleteCompletion,
    updateCompletionNote,
    batchCreateCompletions,
    batchDeleteCompletions,
    isCompletedOnDate,
    hasRecordOnDate,
    getOutcomeOnDate,
    getCompletionForDate,
    hasAnyCompletion,
    refetch: fetchCompletions,
  };
};

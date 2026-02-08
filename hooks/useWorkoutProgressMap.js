"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "./useAuthFetch.js";

/**
 * Batch check workout progress for multiple tasks on a date.
 * Returns a Map of taskId -> boolean.
 */
export const useWorkoutProgressMap = ({ taskIds = [], date, enabled = true } = {}) => {
  const authFetch = useAuthFetch();
  const [progressMap, setProgressMap] = useState(new Map());

  const normalizedTaskIds = useMemo(() => {
    const unique = new Set(taskIds.filter(Boolean));
    return Array.from(unique);
  }, [taskIds]);

  const shouldBeEmpty = !enabled || !date || normalizedTaskIds.length === 0;
  if (shouldBeEmpty && progressMap.size !== 0) {
    setProgressMap(new Map());
  }

  useEffect(() => {
    if (shouldBeEmpty) {
      return;
    }

    let ignore = false;
    const dateKey = date.toISOString().split("T")[0];

    const fetchProgress = async () => {
      try {
        const results = await Promise.all(
          normalizedTaskIds.map(async taskId => {
            const response = await authFetch(`/api/workout-set-completions?taskId=${taskId}&date=${dateKey}`);
            if (!response.ok) {
              return { taskId, hasProgress: false };
            }
            const data = await response.json();
            return { taskId, hasProgress: Boolean(data?.completions?.length) };
          })
        );

        if (ignore) return;
        const nextMap = new Map();
        results.forEach(result => {
          nextMap.set(result.taskId, result.hasProgress);
        });
        setProgressMap(nextMap);
      } catch (err) {
        if (ignore) return;
        console.error("Failed to check workout progress:", err);
        setProgressMap(new Map());
      }
    };

    fetchProgress();

    return () => {
      ignore = true;
    };
  }, [authFetch, date, normalizedTaskIds, shouldBeEmpty]);

  return progressMap;
};

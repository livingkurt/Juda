"use client";

import { useEffect, useState } from "react";
import { useAuthFetch } from "./useAuthFetch.js";

/**
 * Batch check workout progress for multiple tasks on a date.
 * Returns a Map of taskId -> boolean.
 */
export const useWorkoutProgressMap = ({ taskIds = [], date, enabled = true } = {}) => {
  const authFetch = useAuthFetch();
  const [progressMap, setProgressMap] = useState(new Map());

  const idsKey =
    taskIds && taskIds.length > 0
      ? Array.from(new Set(taskIds.filter(Boolean)))
          .sort()
          .join(",")
      : "";
  const dateKey = date ? date.toISOString().split("T")[0] : "";

  const shouldBeEmpty = !enabled || !dateKey || idsKey.length === 0;
  if (shouldBeEmpty && progressMap.size !== 0) {
    setProgressMap(new Map());
  }

  useEffect(() => {
    if (shouldBeEmpty) {
      return;
    }

    let ignore = false;
    const taskIdsForFetch = idsKey.split(",");

    const fetchProgress = async () => {
      try {
        const results = await Promise.all(
          taskIdsForFetch.map(async taskId => {
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
  }, [authFetch, dateKey, idsKey, shouldBeEmpty]);

  return progressMap;
};

"use client";

import { useState, useEffect } from "react";
import { useAuthFetch } from "./useAuthFetch.js";

/**
 * Hook to check if a workout task has in-progress workout data for a specific date
 * @param {string} taskId - The task ID
 * @param {Date} date - The date to check for progress
 * @param {boolean} isWorkoutTask - Whether this is a workout-type task
 * @returns {boolean} - Whether the task has workout progress for this date
 */
export const useWorkoutProgress = (taskId, date, isWorkoutTask) => {
  const [hasProgress, setHasProgress] = useState(false);
  const authFetch = useAuthFetch();

  useEffect(() => {
    // If required props are missing, don't fetch
    if (!taskId || !date || !isWorkoutTask) {
      return;
    }

    let ignore = false;

    const checkProgress = async () => {
      try {
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const response = await authFetch(`/api/workout-set-completions?taskId=${taskId}&date=${dateKey}`);

        if (ignore) return;

        if (response.ok) {
          const data = await response.json();
          // Has progress if there are any completions
          setHasProgress(data.completions && data.completions.length > 0);
        } else {
          setHasProgress(false);
        }
      } catch (err) {
        if (ignore) return;
        console.error("Failed to check workout progress:", err);
        setHasProgress(false);
      }
    };

    checkProgress();

    return () => {
      ignore = true;
    };
  }, [taskId, date, isWorkoutTask, authFetch]);

  return hasProgress;
};

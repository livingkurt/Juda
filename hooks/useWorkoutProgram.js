"use client";

import { useState, useCallback } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export function useWorkoutProgram() {
  const authFetch = useAuthFetch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch workout program for a task
   */
  const fetchWorkoutProgram = useCallback(
    async taskId => {
      if (!taskId) return null;

      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/workout-programs?taskId=${taskId}`);
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error("Failed to fetch workout program");
        }
        return await response.json();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  /**
   * Save workout program (create or update)
   */
  const saveWorkoutProgram = useCallback(
    async (taskId, programData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch("/api/workout-programs", {
          method: "POST",
          body: JSON.stringify({
            taskId,
            name: programData.name,
            numberOfWeeks: programData.numberOfWeeks,
            sections: programData.sections,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save workout program");
        }

        return await response.json();
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  /**
   * Delete workout program
   */
  const deleteWorkoutProgram = useCallback(
    async taskId => {
      setLoading(true);
      setError(null);

      try {
        const response = await authFetch(`/api/workout-programs?taskId=${taskId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete workout program");
        }

        return true;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  return {
    loading,
    error,
    fetchWorkoutProgram,
    saveWorkoutProgram,
    deleteWorkoutProgram,
  };
}

import { useState, useEffect, useCallback } from "react";

export const useCompletions = () => {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCompletions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.taskId) params.append("taskId", filters.taskId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/completions?${params}`);
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
  }, []);

  const createCompletion = async (taskId, date) => {
    try {
      const response = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date }),
      });
      if (!response.ok) throw new Error("Failed to create completion");
      const newCompletion = await response.json();
      setCompletions(prev => [...prev, newCompletion]);
      return newCompletion;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCompletion = async (taskId, date) => {
    try {
      const params = new URLSearchParams({ taskId, date });
      const response = await fetch(`/api/completions?${params}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete completion");
      setCompletions(prev =>
        prev.filter(
          c =>
            c.taskId !== taskId ||
            new Date(c.date).toDateString() !== new Date(date).toDateString()
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Check if a task is completed on a specific date
  const isCompletedOnDate = useCallback(
    (taskId, date) => {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return completions.some(c => {
        const completionDate = new Date(c.date);
        completionDate.setHours(0, 0, 0, 0);
        return c.taskId === taskId && completionDate.getTime() === checkDate.getTime();
      });
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
    isCompletedOnDate,
    refetch: fetchCompletions,
  };
};


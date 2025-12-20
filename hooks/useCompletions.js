import { useState, useCallback } from "react";

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
    // Normalize date for consistent comparison
    const completionDate = date ? new Date(date) : new Date();
    completionDate.setHours(0, 0, 0, 0);

    // Optimistic update
    const optimisticCompletion = {
      id: `temp-${Date.now()}`,
      taskId,
      date: completionDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    const previousCompletions = [...completions];
    setCompletions(prev => [...prev, optimisticCompletion]);

    try {
      const response = await fetch("/api/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date }),
      });
      if (!response.ok) throw new Error("Failed to create completion");
      const newCompletion = await response.json();
      // Replace optimistic with real completion
      setCompletions(prev => prev.map(c => (c.id === optimisticCompletion.id ? newCompletion : c)));
      return newCompletion;
    } catch (err) {
      // Rollback on error
      setCompletions(previousCompletions);
      setError(err.message);
      throw err;
    }
  };

  const deleteCompletion = async (taskId, date) => {
    // Normalize date for consistent comparison
    const completionDate = new Date(date);
    completionDate.setHours(0, 0, 0, 0);

    // Optimistic delete - store previous state for rollback
    const previousCompletions = [...completions];
    setCompletions(prev =>
      prev.filter(c => {
        const cDate = new Date(c.date);
        cDate.setHours(0, 0, 0, 0);
        return c.taskId !== taskId || cDate.getTime() !== completionDate.getTime();
      })
    );

    try {
      const params = new URLSearchParams({ taskId, date });
      const response = await fetch(`/api/completions?${params}`, {
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

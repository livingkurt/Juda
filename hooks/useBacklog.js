import { useState, useEffect, useCallback } from "react";

export const useBacklog = () => {
  const [backlog, setBacklog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBacklog = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/backlog");
      if (!response.ok) throw new Error("Failed to fetch backlog");
      const data = await response.json();
      setBacklog(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching backlog:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBacklog();
  }, [fetchBacklog]);

  const createBacklogItem = async title => {
    try {
      const response = await fetch("/api/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to create backlog item");
      const newItem = await response.json();
      setBacklog(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateBacklogItem = async (id, completed) => {
    try {
      const response = await fetch("/api/backlog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed }),
      });
      if (!response.ok) throw new Error("Failed to update backlog item");
      const updatedItem = await response.json();
      setBacklog(prev =>
        prev.map(item => (item.id === id ? updatedItem : item))
      );
      return updatedItem;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteBacklogItem = async id => {
    try {
      const response = await fetch(`/api/backlog?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete backlog item");
      setBacklog(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    backlog,
    loading,
    error,
    createBacklogItem,
    updateBacklogItem,
    deleteBacklogItem,
    refetch: fetchBacklog,
  };
};

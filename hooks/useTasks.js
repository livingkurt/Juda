import { useState, useEffect, useCallback } from "react";

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async taskData => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error("Failed to create task");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTask = async (id, taskData, optimisticUpdate = null) => {
    // Store previous state for rollback
    let previousTask = null;
    if (optimisticUpdate) {
      previousTask = tasks.find(t => t.id === id);
      // Optimistically update state immediately
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, ...optimisticUpdate } : t))
      );
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...taskData }),
      });
      if (!response.ok) throw new Error("Failed to update task");
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));
      return updatedTask;
    } catch (err) {
      // Rollback on error
      if (optimisticUpdate && previousTask) {
        setTasks(prev => prev.map(t => (t.id === id ? previousTask : t)));
      }
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async id => {
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const reorderTask = async (
    taskId,
    sourceSectionId,
    targetSectionId,
    newOrder,
    optimisticUpdate = null
  ) => {
    // Store previous state for rollback
    const previousTasks = [...tasks];
    if (optimisticUpdate) {
      // Optimistically update state immediately
      const taskToMove = tasks.find(t => t.id === taskId);
      if (taskToMove) {
        setTasks(prev => {
          const updated = prev.map(t =>
            t.id === taskId ? { ...t, ...optimisticUpdate } : t
          );
          // Reorder within the same section or move between sections
          if (sourceSectionId === targetSectionId) {
            const sectionTasks = updated
              .filter(t => t.sectionId === targetSectionId)
              .sort((a, b) => a.order - b.order);
            const taskIndex = sectionTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
              const [movedTask] = sectionTasks.splice(taskIndex, 1);
              sectionTasks.splice(newOrder, 0, movedTask);
              return updated.map(t => {
                const newIndex = sectionTasks.findIndex(st => st.id === t.id);
                return newIndex !== -1 && t.sectionId === targetSectionId
                  ? { ...t, order: newIndex }
                  : t;
              });
            }
          }
          return updated;
        });
      }
    }

    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          sourceSectionId,
          targetSectionId,
          newOrder,
        }),
      });
      if (!response.ok) throw new Error("Failed to reorder task");
      await fetchTasks(); // Refresh tasks
    } catch (err) {
      // Rollback on error
      if (optimisticUpdate) {
        setTasks(previousTasks);
      }
      setError(err.message);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    refetch: fetchTasks,
  };
};

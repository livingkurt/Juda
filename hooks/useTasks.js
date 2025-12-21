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

  const updateTask = async (id, taskData) => {
    // Store previous state for potential rollback
    const previousTasks = [...tasks];

    // Optimistically update immediately
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...taskData } : t)));

    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...taskData }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to update task (${response.status})`;
        throw new Error(errorMessage);
      }
      const updatedTask = await response.json();
      // Update with server response to ensure consistency
      setTasks(prev => prev.map(t => (t.id === id ? updatedTask : t)));
      return updatedTask;
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
      setError(err.message);
      throw err;
    }
  };

  const deleteTask = async id => {
    const previousTasks = [...tasks];

    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
      setError(err.message);
      throw err;
    }
  };

  const reorderTask = async (taskId, sourceSectionId, targetSectionId, newOrder) => {
    const previousTasks = [...tasks];

    // Optimistic update
    setTasks(prev => {
      const updated = prev.map(t => (t.id === taskId ? { ...t, sectionId: targetSectionId, order: newOrder } : t));
      return updated;
    });

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
      // Refresh to get correct order from server
      await fetchTasks();
    } catch (err) {
      setTasks(previousTasks);
      setError(err.message);
      throw err;
    }
  };

  const duplicateTask = async taskId => {
    const taskToDuplicate = tasks.find(t => t.id === taskId);
    if (!taskToDuplicate) {
      throw new Error("Task not found");
    }

    try {
      // Create a copy of the task with "Copy of" prefix
      const duplicatedTaskData = {
        title: `Copy of ${taskToDuplicate.title}`,
        sectionId: taskToDuplicate.sectionId,
        time: taskToDuplicate.time,
        duration: taskToDuplicate.duration,
        color: taskToDuplicate.color,
        recurrence: taskToDuplicate.recurrence,
        subtasks: taskToDuplicate.subtasks
          ? taskToDuplicate.subtasks.map(st => ({
              ...st,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            }))
          : [],
        order: taskToDuplicate.order,
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatedTaskData),
      });
      if (!response.ok) throw new Error("Failed to duplicate task");
      const newTask = await response.json();
      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
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
    duplicateTask,
    refetch: fetchTasks,
  };
};

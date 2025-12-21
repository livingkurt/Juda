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

      // Organize tasks with subtasks
      const tasksMap = new Map(data.map(t => [t.id, { ...t, subtasks: [] }]));
      const rootTasks = [];

      data.forEach(task => {
        const taskWithSubtasks = tasksMap.get(task.id);
        if (task.parentId && tasksMap.has(task.parentId)) {
          // This is a subtask - add it to its parent
          tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
        } else {
          // This is a root task
          rootTasks.push(taskWithSubtasks);
        }
      });

      setTasks(rootTasks);
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
    const previousTasks = JSON.parse(JSON.stringify(tasks));

    // Helper to recursively update a task in the tree
    const updateTaskInTree = (taskList, taskId, updates) => {
      return taskList.map(t => {
        if (t.id === taskId) {
          return { ...t, ...updates };
        }
        if (t.subtasks && t.subtasks.length > 0) {
          return { ...t, subtasks: updateTaskInTree(t.subtasks, taskId, updates) };
        }
        return t;
      });
    };

    // Optimistically update immediately (handles nested tasks)
    setTasks(prev => updateTaskInTree(prev, id, taskData));

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
      // Update with server response, preserving subtasks array
      setTasks(prev =>
        updateTaskInTree(prev, id, {
          ...updatedTask,
          subtasks:
            prev.find(t => t.id === id)?.subtasks ||
            prev.flatMap(t => t.subtasks || []).find(st => st.id === id)?.subtasks ||
            [],
        })
      );
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

    // Optimistic delete - handle both root tasks and subtasks
    setTasks(prev => {
      // First check if it's a root task
      if (prev.some(t => t.id === id)) {
        return prev.filter(t => t.id !== id);
      }

      // If not a root task, it must be a subtask - remove it from parent's subtasks
      return prev.map(task => ({
        ...task,
        subtasks: task.subtasks ? task.subtasks.filter(st => st.id !== id) : task.subtasks,
      }));
    });

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
    // Search for task in root tasks and subtasks
    let taskToDuplicate = tasks.find(t => t.id === taskId);

    // If not found in root tasks, search in subtasks
    if (!taskToDuplicate) {
      for (const task of tasks) {
        if (task.subtasks && task.subtasks.length > 0) {
          taskToDuplicate = task.subtasks.find(st => st.id === taskId);
          if (taskToDuplicate) break;
        }
      }
    }

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
        parentId: taskToDuplicate.parentId, // Preserve parent relationship for subtasks
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

      // Update state based on whether it's a subtask or root task
      if (newTask.parentId) {
        // It's a subtask - add it to the parent's subtasks array
        setTasks(prev =>
          prev.map(task =>
            task.id === newTask.parentId
              ? { ...task, subtasks: [...(task.subtasks || []), newTask] }
              : task
          )
        );
      } else {
        // It's a root task - add it to the root tasks array
        setTasks(prev => [...prev, newTask]);
      }

      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const combineAsSubtask = async (sourceTaskId, targetTaskId) => {
    // Find tasks recursively
    const findTask = (taskList, id) => {
      for (const task of taskList) {
        if (task.id === id) return task;
        if (task.subtasks && task.subtasks.length > 0) {
          const found = findTask(task.subtasks, id);
          if (found) return found;
        }
      }
      return null;
    };

    const sourceTask = findTask(tasks, sourceTaskId);
    const targetTask = findTask(tasks, targetTaskId);

    if (!sourceTask || !targetTask) {
      throw new Error("Source or target task not found");
    }

    // Prevent dropping task on itself or on its own subtask
    if (sourceTaskId === targetTaskId) {
      throw new Error("Cannot combine task with itself");
    }

    // Check for circular references (prevent dropping task on its own subtask)
    const checkCircular = (task, targetId) => {
      if (task.id === targetId) return true;
      if (task.subtasks && task.subtasks.length > 0) {
        return task.subtasks.some(st => checkCircular(st, targetId));
      }
      return false;
    };

    if (checkCircular(sourceTask, targetTaskId)) {
      throw new Error("Cannot create circular reference");
    }

    const previousTasks = [...tasks];

    try {
      // Update source task to set parentId
      const updateResponse = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sourceTaskId,
          parentId: targetTaskId,
          order: targetTask.subtasks?.length || 0,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update source task");
      }

      // Expand target task to show new subtask
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetTaskId,
          expanded: true,
        }),
      });

      // Refresh to get server state
      await fetchTasks();
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
      setError(err.message);
      throw err;
    }
  };

  const promoteSubtask = async (taskId, additionalData = {}) => {
    const previousTasks = [...tasks];

    try {
      // Clear parentId to promote to root task, and apply any additional updates
      const updateResponse = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          parentId: null,
          ...additionalData,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to promote subtask");
      }

      // Refresh to get server state
      await fetchTasks();
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
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
    combineAsSubtask,
    promoteSubtask,
    refetch: fetchTasks,
  };
};

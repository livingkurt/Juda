"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/contexts/AuthContext";

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch("/api/tasks");
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
  }, [authFetch, isAuthenticated]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async taskData => {
    try {
      const response = await authFetch("/api/tasks", {
        method: "POST",
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

  const saveTask = useCallback(
    async taskData => {
      const { tagIds, subtasks: subtasksData, ...taskFields } = taskData;

      try {
        let savedTask;

        if (taskData.id) {
          // Update existing task
          const response = await authFetch("/api/tasks", {
            method: "PUT",
            body: JSON.stringify(taskFields),
          });
          if (!response.ok) throw new Error("Failed to update task");
          savedTask = await response.json();
        } else {
          // Create new task
          const response = await authFetch("/api/tasks", {
            method: "POST",
            body: JSON.stringify(taskFields),
          });
          if (!response.ok) throw new Error("Failed to create task");
          savedTask = await response.json();
        }

        // Handle subtasks if provided
        if (subtasksData !== undefined) {
          // Get existing subtasks for this task
          const existingSubtasks = tasks.find(t => t.id === savedTask.id)?.subtasks || [];
          const existingSubtaskIds = existingSubtasks.map(st => st.id);
          const newSubtaskIds = subtasksData.map(st => st.id);

          // Delete removed subtasks
          const subtasksToDelete = existingSubtaskIds.filter(id => !newSubtaskIds.includes(id));
          for (const subtaskId of subtasksToDelete) {
            await authFetch(`/api/tasks?id=${subtaskId}`, {
              method: "DELETE",
            });
          }

          // Create or update subtasks
          for (const subtask of subtasksData) {
            const subtaskPayload = {
              ...subtask,
              parentId: savedTask.id,
              sectionId: savedTask.sectionId, // Subtasks inherit parent's section
            };

            if (subtask.id && existingSubtaskIds.includes(subtask.id)) {
              // Update existing subtask
              await authFetch("/api/tasks", {
                method: "PUT",
                body: JSON.stringify(subtaskPayload),
              });
            } else {
              // Create new subtask (remove id if it's a temporary one)
              const { id, ...newSubtaskData } = subtaskPayload;
              // Only include id if it looks like a real database ID (starts with 'c')
              const createPayload = id && id.startsWith("c") ? subtaskPayload : newSubtaskData;
              await authFetch("/api/tasks", {
                method: "POST",
                body: JSON.stringify(createPayload),
              });
            }
          }
        }

        // Handle tag assignments if tagIds provided
        if (tagIds !== undefined) {
          const currentTagIds = savedTask.tags?.map(t => t.id) || [];

          // Tags to add
          const tagsToAdd = tagIds.filter(id => !currentTagIds.includes(id));
          // Tags to remove
          const tagsToRemove = currentTagIds.filter(id => !tagIds.includes(id));

          // Add new tags
          for (const tagId of tagsToAdd) {
            await authFetch("/api/task-tags", {
              method: "POST",
              body: JSON.stringify({ taskId: savedTask.id, tagId }),
            });
          }

          // Remove old tags
          for (const tagId of tagsToRemove) {
            await authFetch(`/api/task-tags?taskId=${savedTask.id}&tagId=${tagId}`, {
              method: "DELETE",
            });
          }
        }

        // Refetch to get updated task with tags and subtasks
        await fetchTasks();
        return savedTask;
      } catch (err) {
        console.error("Error saving task:", err);
        throw err;
      }
    },
    [fetchTasks, authFetch, tasks]
  );

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
      const response = await authFetch("/api/tasks", {
        method: "PUT",
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
      const response = await authFetch(`/api/tasks?id=${id}`, {
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
      const response = await authFetch("/api/tasks/reorder", {
        method: "PUT",
        body: JSON.stringify({
          taskId,
          sourceSectionId,
          targetSectionId,
          newOrder,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to reorder task (${response.status})`;
        throw new Error(errorMessage);
      }
      // Refresh to get correct order from server
      await fetchTasks();
    } catch (err) {
      setTasks(previousTasks);
      setError(err.message);
      console.error("Error reordering task:", err, { taskId, sourceSectionId, targetSectionId, newOrder });
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

      const response = await authFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify(duplicatedTaskData),
      });
      if (!response.ok) throw new Error("Failed to duplicate task");
      const newTask = await response.json();

      // Update state based on whether it's a subtask or root task
      if (newTask.parentId) {
        // It's a subtask - add it to the parent's subtasks array
        setTasks(prev =>
          prev.map(task =>
            task.id === newTask.parentId ? { ...task, subtasks: [...(task.subtasks || []), newTask] } : task
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
      const updateResponse = await authFetch("/api/tasks", {
        method: "PUT",
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
      await authFetch("/api/tasks", {
        method: "PUT",
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
      const updateResponse = await authFetch("/api/tasks", {
        method: "PUT",
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

  const batchReorderTasks = async updates => {
    const previousTasks = [...tasks];

    // Optimistically update task orders
    setTasks(prev => {
      const updatesMap = new Map(updates.map(u => [u.id, u.order]));
      return prev.map(task => {
        if (updatesMap.has(task.id)) {
          return { ...task, order: updatesMap.get(task.id) };
        }
        return task;
      });
    });

    try {
      const response = await authFetch("/api/tasks/batch-reorder", {
        method: "PUT",
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to batch reorder tasks (${response.status})`;
        throw new Error(errorMessage);
      }

      // Success - state is already updated optimistically
      return await response.json();
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
    saveTask,
    batchReorderTasks,
    refetch: fetchTasks,
  };
};

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const fetchTasks = useCallback(
    async (skipLoading = false) => {
      if (!isAuthenticated) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        if (!skipLoading) {
          setLoading(true);
        }
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
        if (!skipLoading) {
          setLoading(false);
        }
      }
    },
    [authFetch, isAuthenticated]
  );

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
      toast({
        title: "Task created",
        status: "success",
        duration: 2000,
      });
      return newTask;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const saveTask = useCallback(
    async taskData => {
      const { tagIds, subtasks: subtasksData, ...taskFields } = taskData;
      const previousTasks = JSON.parse(JSON.stringify(tasks));
      const needsRefetch = subtasksData !== undefined || tagIds !== undefined;

      try {
        let savedTask;

        if (taskData.id) {
          // Update existing task - optimistically update
          const response = await authFetch("/api/tasks", {
            method: "PUT",
            body: JSON.stringify(taskFields),
          });
          if (!response.ok) throw new Error("Failed to update task");
          savedTask = await response.json();

          // Optimistically update the task in state, preserving existing subtasks and tags
          setTasks(prev => {
            const updateTaskInTree = (taskList, taskId, updates) => {
              return taskList.map(t => {
                if (t.id === taskId) {
                  const currentTask = t;
                  return {
                    ...currentTask,
                    ...updates,
                    // Preserve subtasks and tags from current state if not in updates
                    subtasks: Array.isArray(updates.subtasks)
                      ? updates.subtasks
                      : Array.isArray(currentTask.subtasks)
                        ? currentTask.subtasks
                        : [],
                    tags: Array.isArray(updates.tags)
                      ? updates.tags
                      : Array.isArray(currentTask.tags)
                        ? currentTask.tags
                        : Array.isArray(savedTask.tags)
                          ? savedTask.tags
                          : [],
                  };
                }
                if (t.subtasks && t.subtasks.length > 0) {
                  return { ...t, subtasks: updateTaskInTree(t.subtasks, taskId, updates) };
                }
                return t;
              });
            };
            return updateTaskInTree(prev, taskData.id, savedTask);
          });

          // Show toast for update
          toast({
            title: "Task updated",
            status: "success",
            duration: 2000,
          });
        } else {
          // Create new task - optimistically add
          const response = await authFetch("/api/tasks", {
            method: "POST",
            body: JSON.stringify(taskFields),
          });
          if (!response.ok) throw new Error("Failed to create task");
          savedTask = await response.json();

          // Optimistically add the new task to state
          setTasks(prev => [...prev, { ...savedTask, subtasks: [], tags: [] }]);

          // Show toast for create
          toast({
            title: "Task created",
            status: "success",
            duration: 2000,
          });
        }

        // Handle subtasks if provided - use batch operations
        if (subtasksData !== undefined) {
          // Get existing subtasks for this task
          const existingSubtasks = tasks.find(t => t.id === savedTask.id)?.subtasks || [];
          const existingSubtaskIds = existingSubtasks.map(st => st.id);
          const newSubtaskIds = subtasksData.map(st => st.id);

          // Delete removed subtasks in batch
          const subtasksToDelete = existingSubtaskIds.filter(id => !newSubtaskIds.includes(id));
          if (subtasksToDelete.length > 0) {
            await authFetch("/api/tasks/batch-save", {
              method: "DELETE",
              body: JSON.stringify({ taskIds: subtasksToDelete }),
            });
          }

          // Prepare subtasks for batch create/update
          const subtasksToSave = subtasksData.map(subtask => ({
            ...subtask,
            parentId: savedTask.id,
            sectionId: savedTask.sectionId, // Subtasks inherit parent's section
          }));

          // Batch create/update subtasks
          if (subtasksToSave.length > 0) {
            await authFetch("/api/tasks/batch-save", {
              method: "POST",
              body: JSON.stringify({ tasks: subtasksToSave }),
            });
          }

          // Optimistically update subtasks in state
          setTasks(prev => {
            const updateTaskInTree = (taskList, taskId, newSubtasks) => {
              return taskList.map(t => {
                if (t.id === taskId) {
                  return { ...t, subtasks: newSubtasks };
                }
                if (t.subtasks && t.subtasks.length > 0) {
                  return { ...t, subtasks: updateTaskInTree(t.subtasks, taskId, newSubtasks) };
                }
                return t;
              });
            };
            return updateTaskInTree(prev, savedTask.id, subtasksData);
          });
        }

        // Handle tag assignments if tagIds provided - use batch operation
        if (tagIds !== undefined) {
          // Use batch endpoint to update all tags at once
          await authFetch("/api/task-tags/batch", {
            method: "POST",
            body: JSON.stringify({ taskId: savedTask.id, tagIds }),
          });

          // Optimistically update tags in state (we'll need to fetch tags separately)
          // For now, we'll refetch only if tags were changed
        }

        // Only refetch if we need updated relationships (tags/subtasks)
        // This prevents unnecessary rerenders when just updating task fields
        // Skip loading state to avoid showing spinner during background refetch
        if (needsRefetch) {
          await fetchTasks(true);
        }

        return savedTask;
      } catch (err) {
        // Rollback on error
        setTasks(previousTasks);
        console.error("Error saving task:", err);
        throw err;
      }
    },
    [fetchTasks, authFetch, tasks, toast]
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
      // Update with server response, preserving subtasks and tags arrays
      setTasks(prev => {
        // Find the task in the current state to preserve its relations
        const findTaskInTree = (taskList, taskId) => {
          for (const t of taskList) {
            if (t.id === taskId) return t;
            if (t.subtasks && t.subtasks.length > 0) {
              const found = findTaskInTree(t.subtasks, taskId);
              if (found) return found;
            }
          }
          return null;
        };

        const currentTask = findTaskInTree(prev, id);

        return updateTaskInTree(prev, id, {
          ...updatedTask,
          // Preserve subtasks from current state if they exist
          subtasks: Array.isArray(currentTask?.subtasks) ? currentTask.subtasks : [],
          // Preserve tags from current state if they exist (server response includes tags)
          tags: Array.isArray(updatedTask.tags)
            ? updatedTask.tags
            : Array.isArray(currentTask?.tags)
              ? currentTask.tags
              : [],
        });
      });
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
      // Refresh to get correct order from server (skip loading since we already optimistically updated)
      await fetchTasks(true);
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

      // Refresh to get server state (skip loading to avoid spinner flash)
      await fetchTasks(true);
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

      // Refresh to get server state (skip loading to avoid spinner flash)
      await fetchTasks(true);
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

  const updateTaskStatus = async (taskId, status) => {
    if (!["todo", "in_progress", "complete"].includes(status)) {
      throw new Error("Invalid status value");
    }
    return updateTask(taskId, { status });
  };

  const batchUpdateTasks = async (taskIds, updates) => {
    const previousTasks = [...tasks];

    try {
      const response = await authFetch("/api/tasks/batch-update", {
        method: "POST",
        body: JSON.stringify({ taskIds, updates }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to batch update tasks (${response.status})`;
        throw new Error(errorMessage);
      }

      const { tasks: updatedTasks } = await response.json();

      // Update tasks in state
      setTasks(prev => {
        const updatedTasksMap = new Map(updatedTasks.map(t => [t.id, t]));
        return prev.map(task => {
          if (updatedTasksMap.has(task.id)) {
            const updated = updatedTasksMap.get(task.id);
            return {
              ...updated,
              // Preserve subtasks from current state
              subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            };
          }
          return task;
        });
      });

      return updatedTasks;
    } catch (err) {
      // Rollback on error
      setTasks(previousTasks);
      setError(err.message);
      throw err;
    }
  };

  // Update tag references in tasks when a tag is updated
  const updateTagInTasks = useCallback((tagId, updatedTag) => {
    setTasks(prevTasks => {
      const updateTaskTags = task => {
        const updatedTags = task.tags?.map(tag => (tag.id === tagId ? updatedTag : tag));
        return {
          ...task,
          tags: updatedTags,
          subtasks: task.subtasks?.map(updateTaskTags) || [],
        };
      };
      return prevTasks.map(updateTaskTags);
    });
  }, []);

  // Remove tag references from tasks when a tag is deleted
  const removeTagFromTasks = useCallback(tagId => {
    setTasks(prevTasks => {
      const removeTagFromTask = task => {
        const filteredTags = task.tags?.filter(tag => tag.id !== tagId) || [];
        return {
          ...task,
          tags: filteredTags,
          subtasks: task.subtasks?.map(removeTagFromTask) || [],
        };
      };
      return prevTasks.map(removeTagFromTask);
    });
  }, []);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    reorderTask,
    duplicateTask,
    combineAsSubtask,
    promoteSubtask,
    saveTask,
    batchReorderTasks,
    batchUpdateTasks,
    refetch: fetchTasks,
    updateTagInTasks,
    removeTagFromTasks,
  };
};

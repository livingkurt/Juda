"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatLocalDate } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useUpdateTaskTagsMutation } from "@/lib/store/api/tagsApi";
import {
  openTaskDialog,
  setEditingTask,
  setEditingWorkoutTask,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,
} from "@/lib/store/slices/uiSlice";

/**
 * Task operation handlers (edit, delete, duplicate, etc.)
 * Uses Redux directly - no prop drilling needed
 */
export function useTaskOperations() {
  const dispatch = useDispatch();
  const { toast } = useToast();

  // Get viewDate from Redux (or compute today if not set)
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = useMemo(() => {
    return todayViewDateISO ? new Date(todayViewDateISO) : new Date();
  }, [todayViewDateISO]);

  // RTK Query hooks
  const { data: tasks = [], refetch: fetchTasks } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const [createTaskMutation] = useCreateTaskMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();
  const [updateTaskTagsMutation] = useUpdateTaskTagsMutation();

  // Wrapper functions for mutations
  const createTask = useCallback(
    async taskData => {
      return await createTaskMutation(taskData).unwrap();
    },
    [createTaskMutation]
  );

  const updateTask = useCallback(
    async (id, taskData) => {
      return await updateTaskMutation({ id, ...taskData }).unwrap();
    },
    [updateTaskMutation]
  );

  const deleteTask = useCallback(
    async id => {
      return await deleteTaskMutation(id).unwrap();
    },
    [deleteTaskMutation]
  );

  const batchUpdateTaskTags = useCallback(
    async (taskId, tagIds) => {
      return await updateTaskTagsMutation({ taskId, tagIds }).unwrap();
    },
    [updateTaskTagsMutation]
  );

  // Duplicate task
  const duplicateTask = useCallback(
    async taskId => {
      // Find task in tasks array (including subtasks)
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

      const taskToDuplicate = findTask(tasks, taskId);
      if (!taskToDuplicate) {
        throw new Error("Task not found");
      }

      const duplicatedTaskData = {
        title: `Copy of ${taskToDuplicate.title}`,
        sectionId: taskToDuplicate.sectionId,
        time: taskToDuplicate.time,
        duration: taskToDuplicate.duration,
        recurrence: taskToDuplicate.recurrence,
        parentId: taskToDuplicate.parentId,
        order: taskToDuplicate.order,
      };

      return await createTaskMutation(duplicatedTaskData).unwrap();
    },
    [tasks, createTaskMutation]
  );

  // Save task (create or update with tags and subtasks)
  const saveTask = useCallback(
    async taskData => {
      const { tagIds, subtasks: _subtasksData, ...taskFields } = taskData;

      let savedTask;
      if (taskData.id) {
        savedTask = await updateTaskMutation({ id: taskData.id, ...taskFields }).unwrap();
      } else {
        savedTask = await createTaskMutation(taskFields).unwrap();
      }

      // Handle tag assignments if tagIds provided
      if (tagIds !== undefined) {
        await updateTaskTagsMutation({ taskId: savedTask.id, tagIds }).unwrap();
      }

      return savedTask;
    },
    [createTaskMutation, updateTaskMutation, updateTaskTagsMutation]
  );

  // Edit task - opens dialog with task data
  const handleEditTask = useCallback(
    task => {
      dispatch(setEditingTask(task));
      dispatch(setDefaultSectionId(null));
      dispatch(setDefaultTime(null));
      dispatch(openTaskDialog());
    },
    [dispatch]
  );

  // Edit workout
  const handleEditWorkout = useCallback(
    task => {
      dispatch(setEditingWorkoutTask(task));
    },
    [dispatch]
  );

  // Update task title (inline edit)
  const handleUpdateTaskTitle = useCallback(
    async (taskId, newTitle) => {
      if (!newTitle.trim()) return;
      await updateTask(taskId, { title: newTitle.trim() });
    },
    [updateTask]
  );

  // Delete task
  const handleDeleteTask = useCallback(
    async taskId => {
      await deleteTask(taskId);
    },
    [deleteTask]
  );

  // Duplicate task with toast
  const handleDuplicateTask = useCallback(
    async taskId => {
      try {
        await duplicateTask(taskId);
        toast({
          title: "Task duplicated",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Failed to duplicate task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [duplicateTask, toast]
  );

  // Save task (from dialog)
  const handleSaveTask = useCallback(
    async taskData => {
      await saveTask(taskData);
      dispatch(setEditingTask(null));
    },
    [saveTask, dispatch]
  );

  // Add task to specific section
  const handleAddTask = useCallback(
    sectionId => {
      dispatch(setEditingTask(null));
      dispatch(setDefaultSectionId(sectionId));
      dispatch(setDefaultTime(null));
      dispatch(setDefaultDate(formatLocalDate(viewDate || new Date())));
      dispatch(openTaskDialog());
    },
    [dispatch, viewDate]
  );

  // Add task to backlog
  const handleAddTaskToBacklog = useCallback(() => {
    dispatch(setEditingTask(null));
    dispatch(setDefaultSectionId(sections[0]?.id));
    dispatch(setDefaultTime(null));
    dispatch(setDefaultDate(null));
    dispatch(openTaskDialog());
  }, [dispatch, sections]);

  // Create task from calendar
  const handleCreateTaskFromCalendar = useCallback(
    (time, day) => {
      dispatch(setDefaultTime(time));
      dispatch(setDefaultDate(day ? formatLocalDate(day) : null));
      dispatch(setDefaultSectionId(sections[0]?.id));
      dispatch(setEditingTask(null));
      dispatch(openTaskDialog());
    },
    [dispatch, sections]
  );

  // Task time/duration changes
  const handleTaskTimeChange = useCallback(
    async (taskId, newTime) => {
      await updateTask(taskId, { time: newTime });
    },
    [updateTask]
  );

  const handleTaskDurationChange = useCallback(
    async (taskId, newDuration) => {
      await updateTask(taskId, { duration: newDuration });
    },
    [updateTask]
  );

  // Tag handlers
  const handleTaskTagsChange = useCallback(
    async (taskId, newTagIds) => {
      try {
        await batchUpdateTaskTags(taskId, newTagIds);
        await fetchTasks();
      } catch (error) {
        console.error("Error updating task tags:", error);
        toast({
          title: "Failed to update tags",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [batchUpdateTaskTags, fetchTasks, toast]
  );

  // Create task inline
  const handleCreateTaskInline = useCallback(
    async (sectionId, title) => {
      if (!title.trim()) return;

      try {
        const taskDate = new Date(viewDate || new Date());
        taskDate.setHours(0, 0, 0, 0);
        const now = new Date();

        await createTask({
          title: title.trim(),
          sectionId,
          time: null,
          duration: 0,
          color: "#3b82f6",
          status: "in_progress",
          startedAt: now.toISOString(),
          recurrence: {
            type: "none",
            startDate: taskDate.toISOString(),
          },
          subtasks: [],
          order: 999,
        });
      } catch (error) {
        toast({
          title: "Failed to create task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [createTask, viewDate, toast]
  );

  // Create subtask
  const handleCreateSubtask = useCallback(
    async (parentTaskId, subtaskTitle) => {
      if (!subtaskTitle.trim()) return;

      try {
        const parentTask = tasks.find(t => t.id === parentTaskId);
        if (!parentTask) return;

        await createTask({
          title: subtaskTitle.trim(),
          sectionId: parentTask.sectionId,
          parentId: parentTaskId,
          time: null,
          duration: 30,
          color: "#3b82f6",
          recurrence: null,
          subtasks: [],
          order: 999,
        });

        await fetchTasks();

        toast({
          title: "Subtask created",
          status: "success",
          duration: 2000,
        });
      } catch (error) {
        toast({
          title: "Failed to create subtask",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [tasks, createTask, fetchTasks, toast]
  );

  // Create backlog task inline
  const handleCreateBacklogTaskInline = useCallback(
    async (title, tagIds = []) => {
      if (!title.trim()) return;

      try {
        const newTask = await createTask({
          title: title.trim(),
          sectionId: sections[0]?.id,
          time: null,
          duration: 0,
          color: "#3b82f6",
          recurrence: null,
          subtasks: [],
          order: 999,
        });

        // Apply tags if provided
        if (tagIds && tagIds.length > 0) {
          await batchUpdateTaskTags(newTask.id, tagIds);
        }
      } catch (error) {
        toast({
          title: "Failed to create task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [createTask, sections, batchUpdateTaskTags, toast]
  );

  // Create kanban task inline
  const handleCreateKanbanTaskInline = useCallback(
    async (status, title) => {
      if (!title.trim()) return;

      try {
        const now = new Date();
        await createTask({
          title: title.trim(),
          sectionId: sections[0]?.id,
          time: null,
          duration: 0,
          color: "#3b82f6",
          status: status,
          startedAt: status === "in_progress" ? now.toISOString() : null,
          recurrence: null,
          subtasks: [],
          order: 999,
        });
      } catch (error) {
        toast({
          title: "Failed to create task",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [createTask, sections, toast]
  );

  // Toggle task expand
  const handleToggleExpand = useCallback(
    async taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      await updateTask(taskId, { expanded: !task.expanded });
    },
    [tasks, updateTask]
  );

  return {
    // Data
    tasks,
    sections,
    viewDate,

    // Raw operations (for other hooks to use)
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    saveTask,
    batchUpdateTaskTags,
    fetchTasks,

    // Handler functions
    handleEditTask,
    handleEditWorkout,
    handleUpdateTaskTitle,
    handleDeleteTask,
    handleDuplicateTask,
    handleSaveTask,
    handleAddTask,
    handleAddTaskToBacklog,
    handleCreateTaskFromCalendar,
    handleTaskTimeChange,
    handleTaskDurationChange,
    handleTaskTagsChange,
    handleCreateTaskInline,
    handleCreateSubtask,
    handleCreateBacklogTaskInline,
    handleCreateKanbanTaskInline,
    handleToggleExpand,
  };
}

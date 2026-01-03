"use client";

import { useCallback } from "react";
import { formatLocalDate } from "@/lib/utils";

/**
 * Task operation handlers (edit, delete, duplicate, etc.)
 */
export function useTaskOperations({
  tasks,
  sections,
  updateTask,
  deleteTask,
  duplicateTask,
  saveTask,
  createTask,
  fetchTasks,
  batchUpdateTaskTags,
  toast,
  // Dialog state setters
  setEditingTask,
  setEditingWorkoutTask,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,
  openTaskDialog,
  viewDate,
}) {
  // Edit task
  const handleEditTask = useCallback(
    task => {
      setEditingTask(task);
      setDefaultSectionId(null);
      setDefaultTime(null);
      openTaskDialog();
    },
    [setEditingTask, setDefaultSectionId, setDefaultTime, openTaskDialog]
  );

  // Edit workout
  const handleEditWorkout = useCallback(
    task => {
      setEditingWorkoutTask(task);
    },
    [setEditingWorkoutTask]
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

  // Duplicate task
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
      setEditingTask(null);
    },
    [saveTask, setEditingTask]
  );

  // Add task to specific section
  const handleAddTask = useCallback(
    sectionId => {
      setEditingTask(null);
      setDefaultSectionId(sectionId);
      setDefaultTime(null);
      setDefaultDate(formatLocalDate(viewDate || new Date()));
      openTaskDialog();
    },
    [setEditingTask, setDefaultSectionId, setDefaultTime, setDefaultDate, openTaskDialog, viewDate]
  );

  // Add task to backlog
  const handleAddTaskToBacklog = useCallback(() => {
    setEditingTask(null);
    setDefaultSectionId(sections[0]?.id);
    setDefaultTime(null);
    setDefaultDate(null);
    openTaskDialog();
  }, [setEditingTask, setDefaultSectionId, setDefaultTime, setDefaultDate, openTaskDialog, sections]);

  // Create task from calendar
  const handleCreateTaskFromCalendar = useCallback(
    (time, day) => {
      setDefaultTime(time);
      setDefaultDate(day ? formatLocalDate(day) : null);
      setDefaultSectionId(sections[0]?.id);
      setEditingTask(null);
      openTaskDialog();
    },
    [setDefaultTime, setDefaultDate, setDefaultSectionId, setEditingTask, openTaskDialog, sections]
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
        const taskDate = viewDate || new Date();
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

        await fetchTasks(true);

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
    async title => {
      if (!title.trim()) return;

      try {
        await createTask({
          title: title.trim(),
          sectionId: sections[0]?.id,
          time: null,
          duration: 0,
          color: "#3b82f6",
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

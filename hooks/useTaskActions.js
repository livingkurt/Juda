"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatLocalDate } from "@/lib/utils";
import { useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from "@/lib/store/api/tasksApi";
import { useTaskLookups } from "@/hooks/useTaskLookups";
import {
  openEditTaskDialog,
  setEditingTask,
  setEditingWorkoutTask,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,
  openTaskDialog,
} from "@/lib/store/slices/uiSlice";

/**
 * Lightweight task actions hook.
 * Does not fetch tasks; callers must provide tasks for lookups.
 */
export function useTaskActions({ tasks = [] } = {}) {
  const dispatch = useDispatch();
  const todayViewDateISO = useSelector(state => state.ui.selectedDate);
  const goalsViewType = useSelector(state => state.ui.goalsViewType);
  const goalsSelectedWeekStart = useSelector(state => state.ui.goalsSelectedWeekStart);
  const viewDate = useMemo(() => {
    if (goalsViewType === "weekly" && goalsSelectedWeekStart) {
      return new Date(goalsSelectedWeekStart);
    }
    return todayViewDateISO ? new Date(todayViewDateISO) : new Date();
  }, [todayViewDateISO, goalsViewType, goalsSelectedWeekStart]);

  const [createTaskMutation] = useCreateTaskMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();
  const { taskById } = useTaskLookups({ tasks });

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

  const duplicateTask = useCallback(
    async taskId => {
      const taskToDuplicate = taskById.get(taskId);
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

      return await createTask(duplicatedTaskData);
    },
    [taskById, createTask]
  );

  const handleEditTask = useCallback(
    (task, clickedDate = null) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[handleEditTask] Called", {
          taskId: task?.id,
          clickedDate,
          stack: new Error().stack,
        });
      }
      dispatch(
        openEditTaskDialog({
          task,
          defaultDate: clickedDate ? formatLocalDate(clickedDate) : null,
          clickedRecurringDate: clickedDate ? clickedDate.toISOString() : null,
        })
      );
    },
    [dispatch]
  );

  const handleEditWorkout = useCallback(
    task => {
      dispatch(setEditingWorkoutTask(task));
    },
    [dispatch]
  );

  const handleUpdateTaskTitle = useCallback(
    async (taskId, newTitle) => {
      if (!newTitle.trim()) return;
      await updateTask(taskId, { title: newTitle.trim() });
    },
    [updateTask]
  );

  const handleDeleteTask = useCallback(
    async taskId => {
      await deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleDuplicateTask = useCallback(
    async taskId => {
      try {
        await duplicateTask(taskId);
        console.warn("Task duplicated");
      } catch (error) {
        console.error("Failed to duplicate task:", error.message);
      }
    },
    [duplicateTask]
  );

  const handleCreateSubtask = useCallback(
    async (parentTaskId, subtaskTitle) => {
      if (!subtaskTitle.trim()) return;

      const parentTask = taskById.get(parentTaskId);
      if (!parentTask) return;

      const isGoalParent = parentTask.completionType === "goal";

      if (isGoalParent) {
        const weekStart = new Date(viewDate || new Date());
        weekStart.setHours(0, 0, 0, 0);
        const day = weekStart.getDay(); // 0=Sun ... 6=Sat
        const mondayOffset = day === 0 ? -6 : 1 - day;
        weekStart.setDate(weekStart.getDate() + mondayOffset);
        const weekStartDate = formatLocalDate(weekStart);
        const isYearlyGoalParent =
          !parentTask.goalMonths || !Array.isArray(parentTask.goalMonths) || parentTask.goalMonths.length === 0;
        const parentWeekStartDate = parentTask.goalData?.weekStartDate || null;

        const nextGoalData = {
          ...(parentTask.goalData || {}),
          createdFromParentGoalId: parentTaskId,
        };

        // Yearly -> monthly subgoal, Monthly/Weekly -> weekly subgoal.
        if (isYearlyGoalParent) {
          delete nextGoalData.weekStartDate;
        } else {
          nextGoalData.weekStartDate = parentWeekStartDate || weekStartDate;
        }

        const taskData = {
          title: subtaskTitle.trim(),
          sectionId: parentTask.sectionId,
          parentId: parentTaskId,
          time: null,
          duration: 30,
          recurrence: null,
          order: 999,
          completionType: "goal",
          status: "todo",
          goalYear: parentTask.goalYear || weekStart.getFullYear(),
          goalMonths: isYearlyGoalParent
            ? [weekStart.getMonth() + 1]
            : parentTask.goalMonths && Array.isArray(parentTask.goalMonths) && parentTask.goalMonths.length > 0
              ? parentTask.goalMonths
              : [weekStart.getMonth() + 1],
          goalData: nextGoalData,
        };

        await createTask(taskData);
        return;
      }

      const taskData = {
        title: subtaskTitle.trim(),
        sectionId: parentTask.sectionId,
        parentId: parentTaskId,
        time: null,
        duration: 30,
        color: "#3b82f6",
        recurrence: null,
        subtasks: [],
        order: 999,
      };

      await createTask(taskData);
      console.warn("Subtask created");
    },
    [taskById, createTask, viewDate]
  );

  const handleToggleExpand = useCallback(
    async taskId => {
      const task = taskById.get(taskId);
      if (!task) return;
      await updateTask(taskId, { expanded: !task.expanded });
    },
    [taskById, updateTask]
  );

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

  const handleAddTaskToBacklog = useCallback(() => {
    dispatch(setEditingTask(null));
    dispatch(setDefaultSectionId(null));
    dispatch(setDefaultTime(null));
    dispatch(setDefaultDate(null));
    dispatch(openTaskDialog());
  }, [dispatch]);

  return {
    // raw operations
    createTask,
    updateTask,
    deleteTask,

    // handlers used by TaskItem
    handleEditTask,
    handleEditWorkout,
    handleUpdateTaskTitle,
    handleDeleteTask,
    handleDuplicateTask,
    handleCreateSubtask,
    handleToggleExpand,
    handleAddTask,
    handleAddTaskToBacklog,
  };
}

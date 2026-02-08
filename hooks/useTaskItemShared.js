"use client";

import { useMemo } from "react";
import { getRecurrenceLabel, isOverdue } from "@/lib/utils";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useDialogState } from "@/hooks/useDialogState";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { usePriorityHandlers } from "@/hooks/usePriorityHandlers";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useWorkoutProgressMap } from "@/hooks/useWorkoutProgressMap";

const collectTasks = tasks => {
  const collected = [];
  const walk = list => {
    list.forEach(task => {
      collected.push(task);
      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        walk(task.subtasks);
      }
    });
  };
  walk(tasks);
  return collected;
};

/**
 * Shared data + handlers for TaskItem lists.
 * Creates O(1) lookups and stable handlers once per list.
 */
export const useTaskItemShared = ({
  allTasks = [],
  viewDate,
  tags = [],
  onCreateTag,
  completionHandlers: completionHandlersProp,
  selectionState: selectionStateProp,
} = {}) => {
  const taskActions = useTaskActions({ tasks: allTasks });
  const internalSelectionState = useSelectionState();
  const selectionState = selectionStateProp || internalSelectionState;
  const dialogState = useDialogState();
  const internalCompletionHandlers = useCompletionHandlers({
    tasksOverride: allTasks,
    skipTasksQuery: true,
  });
  const completionHandlers = completionHandlersProp || internalCompletionHandlers;
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
    tasksOverride: allTasks,
    skipTasksQuery: true,
  });
  const priorityHandlers = usePriorityHandlers();
  const { getCompletionForDate, getLookupsForDate } = useCompletionHelpers();

  const lookups = useMemo(() => {
    if (!viewDate) return null;
    return getLookupsForDate(viewDate);
  }, [viewDate, getLookupsForDate]);

  const allTasksFlat = useMemo(() => collectTasks(allTasks), [allTasks]);

  const taskById = useMemo(() => {
    const map = new Map();
    allTasksFlat.forEach(task => {
      map.set(task.id, task);
    });
    return map;
  }, [allTasksFlat]);

  const workoutTaskIds = useMemo(() => {
    return allTasksFlat.filter(task => task.completionType === "workout").map(task => task.id);
  }, [allTasksFlat]);

  const workoutProgressById = useWorkoutProgressMap({
    taskIds: workoutTaskIds,
    date: viewDate,
    enabled: Boolean(viewDate) && workoutTaskIds.length > 0,
  });

  const taskMetaById = useMemo(() => {
    const map = new Map();

    allTasksFlat.forEach(task => {
      const parentTask = task.parentId ? taskById.get(task.parentId) : null;
      const displayTags =
        task.parentId && (!task.tags || task.tags.length === 0) && parentTask?.tags?.length
          ? parentTask.tags
          : task.tags || [];

      const subtaskTotal = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
      const subtaskCompletedCount = subtaskTotal > 0 ? task.subtasks.filter(st => st.completed).length : 0;
      const allSubtasksComplete = subtaskTotal > 0 && subtaskCompletedCount === subtaskTotal;

      const completion = viewDate ? getCompletionForDate(task.id, viewDate) : null;
      const completionForStartDate =
        task.recurrence?.startDate && getCompletionForDate
          ? getCompletionForDate(task.id, new Date(task.recurrence.startDate))
          : null;
      const outcome = viewDate && lookups ? lookups.getOutcome(task.id) : null;
      const hasRecord = viewDate && lookups ? lookups.hasRecord(task.id) : false;
      const isCompleted = viewDate && lookups ? lookups.isCompleted(task.id) : Boolean(task.completed);

      const isTextTask = task.completionType === "text";
      const isSelectionTask = task.completionType === "selection";
      const isGoalTask = task.completionType === "goal";
      const isWorkoutTask = task.completionType === "workout";

      const isNotCompleted = completion?.outcome === "not_completed" || false;
      const isTextTaskCompleted =
        isTextTask &&
        (completion?.outcome === "completed" ||
          (completion && completion.outcome !== "not_completed" && completion.note));
      const isSelectionTaskCompleted =
        isSelectionTask &&
        (completion?.outcome === "completed" ||
          (completion && completion.outcome !== "not_completed" && completion.note));
      const isGoalTaskCompleted = isGoalTask && completion?.outcome === "completed";
      const isWorkoutTaskCompleted = isWorkoutTask && completion?.outcome === "completed";

      const isChecked = task.parentId ? Boolean(task.completed) : Boolean(task.completed) || allSubtasksComplete;
      const hasAnyOutcome = outcome !== null;
      const shouldShowStrikethrough = isChecked || hasAnyOutcome;

      const isRecurring = task.recurrence && task.recurrence.type !== "none";
      const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
      const parentIsRecurring = parentTask?.recurrence && parentTask.recurrence.type !== "none";
      const effectivelyRecurring = isRecurring || (task.parentId && parentIsRecurring);

      const recurrenceLabel = task.recurrence ? getRecurrenceLabel(task.recurrence) : null;
      const isOverdueValue = viewDate ? isOverdue(task, viewDate, hasRecord) : false;

      map.set(task.id, {
        displayTags,
        subtaskTotal,
        subtaskCompletedCount,
        allSubtasksComplete,
        completion,
        completionForStartDate,
        outcome,
        hasRecord,
        isCompleted,
        isNotCompleted,
        isTextTask,
        isSelectionTask,
        isGoalTask,
        isWorkoutTask,
        isTextTaskCompleted,
        isSelectionTaskCompleted,
        isGoalTaskCompleted,
        isWorkoutTaskCompleted,
        isChecked,
        hasAnyOutcome,
        shouldShowStrikethrough,
        isRecurring,
        parentIsRecurring,
        effectivelyRecurring,
        recurrenceLabel,
        isOverdue: isOverdueValue,
        hasWorkoutProgress: workoutProgressById.get(task.id) || false,
        canEditCompletion: isNonRecurring && Boolean(completionForStartDate) && !task.parentId,
      });
    });

    return map;
  }, [allTasksFlat, taskById, viewDate, getCompletionForDate, lookups, workoutProgressById]);

  return {
    taskActions,
    completionHandlers,
    selectionState,
    dialogState,
    statusHandlers,
    priorityHandlers,
    tags,
    onCreateTag,
    removeFromParent: async taskId => {
      if (!taskId) return;
      await taskActions.updateTask(taskId, { parentId: null });
    },
    taskMetaById,
  };
};

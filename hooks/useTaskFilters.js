"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { shouldShowOnDate, hasFutureDateTime } from "@/lib/utils";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

/**
 * Task filtering logic using Redux directly
 *
 * @param {Object} options
 * @param {Set} options.recentlyCompletedTasks - Set of recently completed task IDs (from useCompletionHandlers)
 */
export function useTaskFilters({ recentlyCompletedTasks } = {}) {
  // Get state from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const todaySearchTerm = useSelector(state => state.ui.todaySearchTerm);
  const todaySelectedTagIds = useSelector(state => state.ui.todaySelectedTagIds);

  // Compute dates
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const viewDate = useMemo(() => {
    return todayViewDateISO ? new Date(todayViewDateISO) : today;
  }, [todayViewDateISO, today]);

  // Get preferences
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // RTK Query hooks
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();

  // Completion helpers
  const { isCompletedOnDate, getOutcomeOnDate, hasRecordOnDate, hasAnyCompletion } = useCompletionHelpers();

  // Default empty set if not provided - wrap in useMemo for stable reference
  const recentlyCompleted = useMemo(() => recentlyCompletedTasks || new Set(), [recentlyCompletedTasks]);

  // Today's tasks: tasks that should show on the selected date
  const todaysTasks = useMemo(
    () =>
      tasks
        .filter(task => {
          // Exclude notes from today's tasks
          if (task.completionType === "note") return false;
          // Exclude subtasks (handled by parent)
          if (task.parentId) return false;

          // Include in-progress non-recurring tasks regardless of date
          const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
          if (isNonRecurring && task.status === "in_progress") {
            return true;
          }

          // Normal date-based filtering
          return shouldShowOnDate(task, viewDate);
        })
        .map(task => ({
          ...task,
          // Override completed field with the selected date's completion record status
          completed: isCompletedOnDate(task.id, viewDate),
          // Add outcome and hasRecord for outcome menu
          outcome: getOutcomeOnDate(task.id, viewDate),
          hasRecord: hasRecordOnDate(task.id, viewDate),
          // Also update subtasks with completion status
          subtasks: task.subtasks
            ? task.subtasks.map(subtask => ({
                ...subtask,
                completed: isCompletedOnDate(subtask.id, viewDate),
                outcome: getOutcomeOnDate(subtask.id, viewDate),
                hasRecord: hasRecordOnDate(subtask.id, viewDate),
              }))
            : undefined,
        })),
    [tasks, viewDate, isCompletedOnDate, getOutcomeOnDate, hasRecordOnDate]
  );

  // Filter today's tasks by search term and tags
  const filteredTodaysTasks = useMemo(() => {
    let result = todaysTasks;

    // Filter by search term
    if (todaySearchTerm.trim()) {
      const lowerSearch = todaySearchTerm.toLowerCase();
      result = result.filter(task => task.title.toLowerCase().includes(lowerSearch));
    }

    // Filter by tags
    if (todaySelectedTagIds.length > 0) {
      result = result.filter(task => task.tags?.some(tag => todaySelectedTagIds.includes(tag.id)));
    }

    return result;
  }, [todaysTasks, todaySearchTerm, todaySelectedTagIds]);

  // Group today's tasks by section, optionally filtering out completed tasks
  const tasksBySection = useMemo(() => {
    const grouped = {};
    sections.forEach(s => {
      let sectionTasks = filteredTodaysTasks.filter(t => t.sectionId === s.id);
      // Filter out completed/not completed tasks if showCompletedTasks is false
      // But keep recently completed tasks visible for a delay period
      if (!showCompletedTasks) {
        sectionTasks = sectionTasks.filter(t => {
          const isCompleted =
            t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed));
          // Check if task has any outcome (completed or not completed)
          const hasOutcome = t.outcome !== null && t.outcome !== undefined;
          // Keep task visible if it's recently completed (within delay period)
          if (isCompleted && recentlyCompleted.has(t.id)) {
            return true;
          }
          // Hide if completed or has any outcome (not completed)
          return !isCompleted && !hasOutcome;
        });
      }
      grouped[s.id] = sectionTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [filteredTodaysTasks, sections, showCompletedTasks, recentlyCompleted]);

  // Tasks for backlog
  const backlogTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // If task shows on today's calendar/today view, don't show in backlog
        if (shouldShowOnDate(task, today)) return false;
        // Exclude tasks with future date/time
        if (hasFutureDateTime(task)) return false;

        // For one-time tasks (type: "none"), if they've been completed on ANY date,
        // they should stay on that date's calendar view, not reappear in backlog
        if (task.recurrence?.type === "none" && hasAnyCompletion(task.id)) {
          // Keep task visible if it's recently completed (within delay period)
          if (recentlyCompleted.has(task.id)) {
            return true;
          }
          return false;
        }

        // For recurring tasks (daily, weekly, monthly, interval), they should NEVER appear in backlog
        if (task.recurrence?.type && task.recurrence.type !== "none") {
          return false;
        }

        // Exclude notes from backlog
        if (task.completionType === "note") return false;

        // For tasks without recurrence (null), check if completed today
        const outcome = getOutcomeOnDate(task.id, today);
        if (outcome !== null) {
          if (recentlyCompleted.has(task.id)) {
            return true;
          }
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(task => ({
        ...task,
        completed: isCompletedOnDate(task.id, today),
        subtasks: task.subtasks
          ? task.subtasks.map(subtask => ({
              ...subtask,
              completed: isCompletedOnDate(subtask.id, today),
            }))
          : undefined,
      }));
  }, [tasks, today, isCompletedOnDate, getOutcomeOnDate, hasAnyCompletion, recentlyCompleted]);

  // Filter tasks that are notes (completionType === "note")
  const noteTasks = useMemo(() => {
    return tasks.filter(task => task.completionType === "note");
  }, [tasks]);

  return {
    // Data
    tasks,
    sections,
    today,
    viewDate,

    // Filtered results
    todaysTasks,
    filteredTodaysTasks,
    tasksBySection,
    backlogTasks,
    noteTasks,
  };
}

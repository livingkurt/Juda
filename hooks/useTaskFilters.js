"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { shouldShowOnDate, hasFutureDateTime, timeToMinutes } from "@/lib/utils";
import { useTasksWithDeferred } from "@/hooks/useTasksWithDeferred";
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

  // RTK Query hooks with deferred rendering
  const { data: tasks = [] } = useTasksWithDeferred();
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
          // Exclude goal-type tasks from today's tasks (they have their own Goals tab)
          if (task.completionType === "goal") return false;
          // Exclude subtasks (handled by parent)
          if (task.parentId) return false;

          // Include in-progress non-recurring tasks ONLY if they have no date assigned
          // If they have a date, they should only show on that date and after (handled by shouldShowOnDate)
          const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
          if (isNonRecurring && task.status === "in_progress") {
            // Only show if task has no date (no recurrence or no startDate)
            const hasNoDate = !task.recurrence || !task.recurrence.startDate;
            if (hasNoDate) {
              return true;
            }
          }

          // For one-time tasks (type === "none") that have been completed,
          // only show them on dates where they have a completion record
          if (task.recurrence?.type === "none" && hasAnyCompletion(task.id)) {
            return hasRecordOnDate(task.id, viewDate);
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
    [tasks, viewDate, isCompletedOnDate, getOutcomeOnDate, hasRecordOnDate, hasAnyCompletion]
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

    // Helper to check if a time falls within a range
    const isTimeInRange = (taskTime, startTime, endTime) => {
      if (!taskTime || !startTime || !endTime) return false;
      const taskMinutes = timeToMinutes(taskTime);
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Handle overnight ranges (e.g., 22:00 - 06:00)
      if (endMinutes < startMinutes) {
        return taskMinutes >= startMinutes || taskMinutes < endMinutes;
      }
      return taskMinutes >= startMinutes && taskMinutes < endMinutes;
    };

    // Helper to sort tasks by time
    const sortByTime = tasks => {
      return [...tasks].sort((a, b) => {
        // Tasks with time come before tasks without time
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (!a.time && !b.time) {
          // Both have no time - sort by order as fallback
          return (a.order || 0) - (b.order || 0);
        }
        // Both have time - sort by time
        const aMinutes = timeToMinutes(a.time);
        const bMinutes = timeToMinutes(b.time);
        if (aMinutes !== bMinutes) return aMinutes - bMinutes;
        // Same time - use order as tiebreaker
        return (a.order || 0) - (b.order || 0);
      });
    };

    // Track which tasks have been assigned to time-ranged sections
    const assignedTaskIds = new Set();

    // Sort sections by order to ensure consistent assignment priority
    const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));

    // First pass: assign tasks to time-ranged sections
    for (const section of sortedSections) {
      if (section.startTime && section.endTime) {
        // This section has a time range - filter tasks by time
        const sectionTasks = filteredTodaysTasks.filter(task => {
          if (assignedTaskIds.has(task.id)) return false;
          if (isTimeInRange(task.time, section.startTime, section.endTime)) {
            assignedTaskIds.add(task.id);
            return true;
          }
          return false;
        });

        // Filter out completed/not completed tasks if showCompletedTasks is false
        let filteredSectionTasks = sectionTasks;
        if (!showCompletedTasks) {
          filteredSectionTasks = sectionTasks.filter(t => {
            const isCompleted =
              t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed));
            const hasOutcome = t.outcome !== null && t.outcome !== undefined;
            if (isCompleted && recentlyCompleted.has(t.id)) {
              return true;
            }
            return !isCompleted && !hasOutcome;
          });
        }

        grouped[section.id] = sortByTime(filteredSectionTasks);
      }
    }

    // Second pass: assign remaining tasks by sectionId (non-time-ranged sections)
    for (const section of sortedSections) {
      if (!section.startTime || !section.endTime) {
        // This section has no time range - use sectionId assignment
        let sectionTasks = filteredTodaysTasks.filter(task => {
          if (assignedTaskIds.has(task.id)) return false;
          return task.sectionId === section.id;
        });

        // Mark as assigned
        sectionTasks.forEach(t => assignedTaskIds.add(t.id));

        // Filter out completed/not completed tasks if showCompletedTasks is false
        if (!showCompletedTasks) {
          sectionTasks = sectionTasks.filter(t => {
            const isCompleted =
              t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed));
            const hasOutcome = t.outcome !== null && t.outcome !== undefined;
            if (isCompleted && recentlyCompleted.has(t.id)) {
              return true;
            }
            return !isCompleted && !hasOutcome;
          });
        }

        grouped[section.id] = sortByTime(sectionTasks);
      }
    }

    // Handle "no-section" virtual section
    let noSectionTasks = filteredTodaysTasks.filter(t => {
      if (assignedTaskIds.has(t.id)) return false;
      return !t.sectionId;
    });

    if (!showCompletedTasks) {
      noSectionTasks = noSectionTasks.filter(t => {
        const isCompleted =
          t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed));
        const hasOutcome = t.outcome !== null && t.outcome !== undefined;
        if (isCompleted && recentlyCompleted.has(t.id)) {
          return true;
        }
        return !isCompleted && !hasOutcome;
      });
    }

    grouped["no-section"] = sortByTime(noSectionTasks);

    return grouped;
  }, [filteredTodaysTasks, sections, showCompletedTasks, recentlyCompleted]);

  // Tasks for backlog
  const backlogTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // CRITICAL: Tasks with a sectionId should NEVER appear in backlog
        // They belong to a specific section in the Today view
        if (task.sectionId) return false;

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

        // Exclude Goal type tasks from backlog
        if (task.completionType === "goal") return false;

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

  return useMemo(
    () => ({
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
    }),
    [tasks, sections, today, viewDate, todaysTasks, filteredTodaysTasks, tasksBySection, backlogTasks, noteTasks]
  );
}

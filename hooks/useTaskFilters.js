"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { timeToMinutes } from "@/lib/utils";
import { useTasksForToday } from "@/hooks/useTasksForToday";
import { useBacklogTasks } from "@/hooks/useBacklogTasks";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

/**
 * Task filtering logic using SEPARATE API endpoints for each view
 *
 * ARCHITECTURE CHANGE:
 * - Today's tasks: Loaded via /api/tasks/today?date=YYYY-MM-DD
 * - Backlog tasks: Loaded via /api/tasks/backlog
 * - Each view loads ONLY what it needs - much faster!
 *
 * @param {Object} options
 * @param {Set} options.recentlyCompletedTasks - Set of recently completed task IDs
 */
export function useTaskFilters({ recentlyCompletedTasks } = {}) {
  // Get state from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const todaySearchTerm = useSelector(state => state.ui.todaySearchTerm);
  const todaySelectedTagIds = useSelector(state => state.ui.todaySelectedTagIds);
  const recentlyCompletedTasksArray = useSelector(state => state.ui.recentlyCompletedTasks);

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

  // SEPARATE API CALLS - Each loads only what's needed
  const { data: todayTasksRaw = [], isLoading: todayLoading } = useTasksForToday(viewDate);
  const { data: backlogTasksRaw = [], isLoading: backlogLoading } = useBacklogTasks();
  const { data: sections = [] } = useGetSectionsQuery();

  // Completion helpers
  const { hasAnyCompletion, getLookupsForDate } = useCompletionHelpers();

  // Default to Redux state if not provided
  const recentlyCompleted = useMemo(() => {
    if (recentlyCompletedTasks) return recentlyCompletedTasks;
    return new Set(recentlyCompletedTasksArray || []);
  }, [recentlyCompletedTasks, recentlyCompletedTasksArray]);

  // Today's tasks - already filtered by API, just add completion status
  const todaysTasks = useMemo(() => {
    const lookups = getLookupsForDate(viewDate);

    return todayTasksRaw
      .filter(task => {
        // For one-time tasks that have completions, only show on dates with a record
        if (task.recurrence?.type === "none" && hasAnyCompletion(task.id)) {
          return lookups.hasRecord(task.id);
        }
        return true;
      })
      .map(task => ({
        ...task,
        completed: lookups.isCompleted(task.id),
        outcome: lookups.getOutcome(task.id),
        hasRecord: lookups.hasRecord(task.id),
        subtasks: task.subtasks
          ? task.subtasks.map(subtask => ({
              ...subtask,
              completed: lookups.isCompleted(subtask.id),
              outcome: lookups.getOutcome(subtask.id),
              hasRecord: lookups.hasRecord(subtask.id),
            }))
          : undefined,
      }));
  }, [todayTasksRaw, viewDate, getLookupsForDate, hasAnyCompletion]);

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

  // Group today's tasks by section
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

    // Track which tasks have been assigned to sections
    const assignedTaskIds = new Set();

    // Process each section
    sections.forEach(section => {
      // Get tasks explicitly assigned to this section
      let sectionTasks = filteredTodaysTasks.filter(t => t.sectionId === section.id);

      // Also get tasks that fall within this section's time range (if defined)
      if (section.startTime && section.endTime) {
        const timeRangeTasks = filteredTodaysTasks.filter(t => {
          // Skip if already assigned to a specific section
          if (t.sectionId) return false;
          // Skip if already assigned to another section
          if (assignedTaskIds.has(t.id)) return false;
          // Check if task time falls within section time range
          return isTimeInRange(t.time, section.startTime, section.endTime);
        });
        sectionTasks = [...sectionTasks, ...timeRangeTasks];
      }

      // Apply completed task filtering
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

      // Sort and store
      grouped[section.id] = sortByTime(sectionTasks);

      // Track assigned task IDs
      sectionTasks.forEach(t => assignedTaskIds.add(t.id));
    });

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

  // Backlog tasks - already filtered by API, just add completion status
  const backlogTasks = useMemo(() => {
    const todayLookups = getLookupsForDate(today);

    return backlogTasksRaw
      .filter(task => {
        // For one-time tasks that have been completed on ANY date,
        // filter them out unless recently completed
        if (task.recurrence?.type === "none" && hasAnyCompletion(task.id)) {
          if (recentlyCompleted.has(task.id)) {
            return true;
          }
          return false;
        }

        // For tasks without recurrence (null), check if completed today
        const outcome = todayLookups.getOutcome(task.id);
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
        completed: todayLookups.isCompleted(task.id),
        subtasks: task.subtasks
          ? task.subtasks.map(subtask => ({
              ...subtask,
              completed: todayLookups.isCompleted(subtask.id),
            }))
          : undefined,
      }));
  }, [backlogTasksRaw, today, getLookupsForDate, hasAnyCompletion, recentlyCompleted]);

  // Note tasks - still need legacy query for now
  // TODO: Create separate /api/tasks/notes endpoint
  const noteTasks = useMemo(() => {
    // Notes are not included in today or backlog endpoints
    // For now, return empty array - notes tab will need its own query
    return [];
  }, []);

  return useMemo(
    () => ({
      // Data
      tasks: [...todayTasksRaw, ...backlogTasksRaw], // Combined for components that need all
      sections,
      today,
      viewDate,

      // Loading states
      isLoading: todayLoading || backlogLoading,
      todayLoading,
      backlogLoading,

      // Filtered results
      todaysTasks,
      filteredTodaysTasks,
      tasksBySection,
      backlogTasks,
      noteTasks,
    }),
    [
      todayTasksRaw,
      backlogTasksRaw,
      sections,
      today,
      viewDate,
      todayLoading,
      backlogLoading,
      todaysTasks,
      filteredTodaysTasks,
      tasksBySection,
      backlogTasks,
      noteTasks,
    ]
  );
}

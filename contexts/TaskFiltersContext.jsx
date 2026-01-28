"use client";

import { createContext, useContext, useMemo } from "react";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useSelector } from "react-redux";
import { shouldShowOnDate } from "@/lib/utils";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

const TaskFiltersContext = createContext(null);

/**
 * Provider that computes task filters once and shares them across components
 * Performance optimization: Prevents multiple useTaskFilters instantiations
 */
export function TaskFiltersProvider({ children, viewDate }) {
  // Get preferences
  const { preferences } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;

  // Get today view date from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const computedViewDate = viewDate || (todayViewDateISO ? new Date(todayViewDateISO) : new Date());

  // Initialize section expansion early (will be updated when tasksBySection is available)
  const taskOps = useTaskOperations();
  const sectionExpansionInitial = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: {},
    viewDate: computedViewDate,
    todaysTasks: [],
  });

  // Initialize completion handlers (needs sectionExpansionInitial callbacks)
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
  });

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Get completion helpers for filtering completed one-time tasks
  const { hasRecordOnDate, hasAnyCompletion } = useCompletionHelpers("calendar", computedViewDate);

  // Recreate section expansion with actual tasksBySection
  const sectionExpansion = useSectionExpansion({
    sections: taskOps.sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
    viewDate: computedViewDate,
    todaysTasks: taskFilters.todaysTasks,
  });

  // Pre-compute tasksByDateRange for calendar views (performance optimization)
  // This eliminates O(n×days) filtering operations in calendar components
  // Uses the same filtering logic as useTaskFilters to exclude completed one-time tasks
  const tasksByDateRange = useMemo(() => {
    const map = new Map();
    const tasks = taskFilters.tasks;

    // Get date range we care about (current month ± 1 week buffer for calendar views)
    const startDate = new Date(computedViewDate);
    startDate.setDate(startDate.getDate() - 7); // 7 days back
    const endDate = new Date(computedViewDate);
    endDate.setDate(endDate.getDate() + 42); // ~6 weeks forward (covers month view)

    // Single pass through tasks, bucket by all applicable dates
    tasks.forEach(task => {
      // Skip subtasks (handled by parent)
      if (task.parentId) return;
      // Skip notes
      if (task.completionType === "note") return;

      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = current.toDateString();

        // Apply same filtering logic as useTaskFilters
        let shouldShow = false;

        // Include in-progress non-recurring tasks ONLY if they have no date assigned
        const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
        if (isNonRecurring && task.status === "in_progress") {
          const hasNoDate = !task.recurrence || !task.recurrence.startDate;
          if (hasNoDate) {
            shouldShow = true;
          }
        }

        // Handle off-schedule tasks (created from history tab)
        // Off-schedule tasks should ONLY show if they have a completion record for their specific date
        if (!shouldShow && task.isOffSchedule) {
          const taskDateStr = task.recurrence?.startDate?.split("T")[0];
          const currentDateStr = current.toISOString().split("T")[0];
          
          // Only show if viewing the exact date AND there's a completion record
          if (taskDateStr === currentDateStr) {
            shouldShow = hasRecordOnDate(task.id, current);
          }
          // Don't show on any other date (shouldShow stays false)
        }

        // Handle regular one-time tasks (type === "none")
        if (!shouldShow && task.recurrence?.type === "none" && !task.isOffSchedule) {
          const hasStartDate = task.recurrence?.startDate;
          if (hasStartDate) {
            const hasRecordToday = hasRecordOnDate(task.id, current);
            if (hasRecordToday) {
              shouldShow = true;
            } else {
              const hasCompletionInRange = hasAnyCompletion(task.id);
              const isCompleted = task.status === "complete";
              // If completed but not on this date, don't show
              if (isCompleted || hasCompletionInRange) {
                shouldShow = false;
              } else {
                // Not completed, check if date >= startDate
                shouldShow = shouldShowOnDate(task, current);
              }
            }
          } else {
            shouldShow = shouldShowOnDate(task, current);
          }
        }

        // Handle recurring tasks with additionalDates (off-schedule completions)
        // Off-schedule tasks should ONLY show if they have a completion record for that date
        if (!shouldShow && task.recurrence?.additionalDates && Array.isArray(task.recurrence.additionalDates) && task.recurrence.additionalDates.length > 0) {
          const currentDateStr = current.toISOString().split("T")[0];
          const isInAdditionalDates = task.recurrence.additionalDates.some(additionalDate => {
            const additionalDateStr = additionalDate.split("T")[0];
            return additionalDateStr === currentDateStr;
          });
          
          // If this date is in additionalDates, require a completion record
          if (isInAdditionalDates) {
            shouldShow = hasRecordOnDate(task.id, current);
          }
        }

        // Normal date-based filtering for recurring tasks
        if (!shouldShow) {
          shouldShow = shouldShowOnDate(task, current);
        }

        if (shouldShow) {
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          // Only add if not already in array (avoid duplicates)
          const dayTasks = map.get(dateKey);
          if (!dayTasks.find(t => t.id === task.id)) {
            dayTasks.push(task);
          }
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    });

    return map;
  }, [taskFilters.tasks, computedViewDate, hasRecordOnDate, hasAnyCompletion]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      taskFilters,
      sectionExpansion,
      taskOps,
      completionHandlers,
      viewDate: computedViewDate,
      showCompletedTasks,
      tasksByDateRange, // Pre-computed date-indexed task map
    }),
    [taskFilters, sectionExpansion, taskOps, completionHandlers, computedViewDate, showCompletedTasks, tasksByDateRange]
  );

  return <TaskFiltersContext.Provider value={value}>{children}</TaskFiltersContext.Provider>;
}

/**
 * Hook to access task filters context
 * Falls back to computing filters locally if context is not available (backward compatibility)
 * 
 * Note: Always calls hooks (React rules) but uses context values if available
 */
export function useTaskFiltersContext() {
  const context = useContext(TaskFiltersContext);
  
  // Always call hooks (React rules) - use context values if available
  const completionHandlersFallback = useCompletionHandlers();
  const taskFiltersFallback = useTaskFilters({
    recentlyCompletedTasks: completionHandlersFallback.recentlyCompletedTasks,
  });
  
  // Use context if available, otherwise use fallback hooks
  if (context) {
    return context;
  }
  
  // Return fallback values
  return {
    taskFilters: taskFiltersFallback,
    completionHandlers: completionHandlersFallback,
    // Return null for other values to indicate context not available
    sectionExpansion: null,
    taskOps: null,
    viewDate: null,
    showCompletedTasks: null,
    tasksByDateRange: null,
  };
}

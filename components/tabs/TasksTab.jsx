"use client";

import { useMemo, useCallback } from "react";
import { Box, Tabs, Tab, Typography, useMediaQuery, Collapse, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { List, Dashboard as LayoutDashboard, CalendarToday as Calendar } from "@mui/icons-material";
import { DragDropContext } from "@hello-pangea/dnd";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { TodayView } from "@/components/tabs/TodayView";
import { CalendarViewTab } from "@/components/tabs/CalendarViewTab";
import { useDispatch, useSelector } from "react-redux";
import { setMobileActiveView, setBacklogWidth } from "@/lib/store/slices/uiSlice";
import { createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { timeToMinutes, minutesToTime, formatLocalDate } from "@/lib/utils";
import { getPriorityConfig } from "@/lib/constants";
import { useViewState } from "@/hooks/useViewState";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useResizeHandlers } from "@/hooks/useResizeHandlers";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import {
  useGetTasksQuery,
  useReorderTaskMutation,
  useBatchReorderTasksMutation,
  useUpdateTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery, useReorderSectionsMutation } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useColorMode } from "@/hooks/useColorMode";
import { useLoadingTab } from "@/components/MainTabs";

export function TasksTab() {
  const theme = useTheme();
  const { mode: colorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useDispatch();

  // Get loading state
  const { loadingTab } = useLoadingTab();
  const isLoading = loadingTab === 0;

  // Redux state
  const backlogOpen = useSelector(state => state.ui.backlogOpen);
  const mainContentView = useSelector(state => state.ui.mainContentView);
  const mobileActiveView = useSelector(state => state.ui.mobileActiveView);
  const backlogWidth = useSelector(state => state.ui.backlogWidth);
  const backlogSortByPriority = useSelector(state => state.ui.backlogSortByPriority);
  const backlogSortByTag = useSelector(state => state.ui.backlogSortByTag);
  const backlogSearchTerm = useSelector(state => state.ui.backlogSearchTerm);
  const backlogSelectedTagIds = useSelector(state => state.ui.backlogSelectedTagIds);
  const backlogSelectedPriorities = useSelector(state => state.ui.backlogSelectedPriorities);

  // View state
  const viewState = useViewState();
  const {
    today,
    selectedDate,
    todayViewDate,
    viewDate,
    todaySearchTerm,
    setTodaySearchTerm,
    todaySelectedTagIds,
    handleTodayTagSelect,
    handleTodayTagDeselect,
    handleTodayViewDateChange,
    navigateTodayView,
    handleTodayViewToday,
    setSelectedDate,
    navigateCalendar,
    getCalendarTitle,
    calendarView,
    setCalendarView,
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    handleCalendarTagSelect,
    handleCalendarTagDeselect,
  } = viewState;

  // Preferences
  const { preferences, updatePreference } = usePreferencesContext();
  const showCompletedTasks = preferences.showCompletedTasks;
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar;
  const showRecurringTasks = preferences.showRecurringTasks;
  const calendarZoom = preferences.calendarZoom;

  const setShowCompletedTasks = useCallback(value => updatePreference("showCompletedTasks", value), [updatePreference]);

  const setShowCompletedTasksCalendar = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showCompletedTasksCalendar);
      updatePreference("showCompletedTasksCalendar", newValue);
    } else {
      updatePreference("showCompletedTasksCalendar", updater);
    }
  };

  const setShowRecurringTasks = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showRecurringTasks);
      updatePreference("showRecurringTasks", newValue);
    } else {
      updatePreference("showRecurringTasks", updater);
    }
  };

  const setCalendarZoom = updater => {
    if (typeof updater === "function") {
      const newZoom = updater(calendarZoom);
      updatePreference("calendarZoom", newZoom);
    } else {
      updatePreference("calendarZoom", updater);
    }
  };

  // Data queries
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [batchReorderTasksMutation] = useBatchReorderTasksMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [reorderSectionsMutation] = useReorderSectionsMutation();

  const createTag = useCallback(
    async (name, color) => {
      return await createTagMutation({ name, color }).unwrap();
    },
    [createTagMutation]
  );

  const [reorderTaskMutation] = useReorderTaskMutation();

  const reorderTask = useCallback(
    async (taskId, sourceSectionId, targetSectionId, newOrder) => {
      try {
        await reorderTaskMutation({
          taskId,
          sourceSectionId,
          targetSectionId,
          newOrder,
        }).unwrap();
      } catch (err) {
        console.error("Error reordering task:", err);
        throw err;
      }
    },
    [reorderTaskMutation]
  );

  // Completion handlers (needed for taskFilters)
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: new Set(),
    setAutoCollapsedSections: () => {},
    checkAndAutoCollapseSection: () => {},
  });

  // Task filters
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const backlogTasks = taskFilters.backlogTasks;
  const tasksBySection = taskFilters.tasksBySection;

  /**
   * Calculate time for a task dropped into a time-ranged section
   * Always interpolates based on drop position between neighboring tasks
   */
  const getSectionDropTime = useCallback(({ targetSection, targetSectionTasks, destIndex, taskId }) => {
    console.warn("getSectionDropTime called:", { targetSection, targetSectionTasks, destIndex, taskId });
    if (!targetSection?.startTime || !targetSection?.endTime) return null;

    // Filter out the task being moved (for reordering within same section)
    const tasksWithoutCurrent = targetSectionTasks.filter(t => t.id !== taskId);

    // Dropping at the beginning
    if (destIndex <= 0) {
      return targetSection.startTime;
    }

    // Dropping at the end
    if (destIndex >= tasksWithoutCurrent.length) {
      const lastTask = tasksWithoutCurrent[tasksWithoutCurrent.length - 1];
      if (lastTask?.time) {
        const lastMinutes = timeToMinutes(lastTask.time);
        const endMinutes = timeToMinutes(targetSection.endTime);
        // Add 1 minute after last task, but don't exceed section end
        const newMinutes = Math.min(lastMinutes + 1, endMinutes - 1);
        return minutesToTime(newMinutes);
      }
      return targetSection.startTime;
    }

    // Dropping between tasks - interpolate
    const prevTask = tasksWithoutCurrent[destIndex - 1];
    const nextTask = tasksWithoutCurrent[destIndex];

    if (prevTask?.time && nextTask?.time) {
      const prevMinutes = timeToMinutes(prevTask.time);
      const nextMinutes = timeToMinutes(nextTask.time);
      // Interpolate between the two times
      const midMinutes = Math.floor((prevMinutes + nextMinutes) / 2);
      return minutesToTime(midMinutes);
    }

    if (prevTask?.time) {
      const prevMinutes = timeToMinutes(prevTask.time);
      const endMinutes = timeToMinutes(targetSection.endTime);
      // Add 1 minute after previous task
      const newMinutes = Math.min(prevMinutes + 1, endMinutes - 1);
      return minutesToTime(newMinutes);
    }

    return targetSection.startTime;
  }, []);

  // Drag handler for @hello-pangea/dnd
  // Note: We don't await API calls here - optimistic updates in RTK Query handle the UI instantly
  // The mutations have onQueryStarted handlers that update the cache immediately
  const handleDragEnd = useCallback(
    async result => {
      const { destination, source, type, draggableId } = result;

      // Dropped outside a droppable area
      if (!destination) return;

      // Dropped in the same position
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      // Handle section reordering
      if (type === "SECTION") {
        const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
        const [removed] = sortedSections.splice(source.index, 1);
        sortedSections.splice(destination.index, 0, removed);

        const reorderedSections = sortedSections.map((section, index) => ({
          ...section,
          order: index,
        }));

        // Fire and forget - optimistic update handles UI
        reorderSectionsMutation(reorderedSections);
        return;
      }

      // Handle task dragging - full implementation below
      const taskId = extractTaskId(draggableId);
      const sourceId = source.droppableId;
      const destId = destination.droppableId;

      // Find the task
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error("Task not found:", taskId);
        return;
      }

      // Backlog to Backlog (reorder within backlog)
      if (sourceId === "backlog" && destId === "backlog") {
        // Get filtered tasks (same logic as BacklogDrawer uses)
        let filteredBacklogTasks = [...taskFilters.backlogTasks];

        // Apply same filters as BacklogDrawer
        if (backlogSearchTerm.trim()) {
          const lowerSearch = backlogSearchTerm.toLowerCase();
          filteredBacklogTasks = filteredBacklogTasks.filter(task => task.title.toLowerCase().includes(lowerSearch));
        }

        if (backlogSelectedTagIds.length > 0) {
          const hasUntaggedFilter = backlogSelectedTagIds.includes("__UNTAGGED__");
          const regularTagIds = backlogSelectedTagIds.filter(id => id !== "__UNTAGGED__");

          if (hasUntaggedFilter && regularTagIds.length > 0) {
            filteredBacklogTasks = filteredBacklogTasks.filter(
              task => !task.tags || task.tags.length === 0 || task.tags.some(tag => regularTagIds.includes(tag.id))
            );
          } else if (hasUntaggedFilter) {
            filteredBacklogTasks = filteredBacklogTasks.filter(task => !task.tags || task.tags.length === 0);
          } else if (regularTagIds.length > 0) {
            filteredBacklogTasks = filteredBacklogTasks.filter(task =>
              task.tags?.some(tag => regularTagIds.includes(tag.id))
            );
          }
        }

        if (backlogSelectedPriorities.length > 0) {
          filteredBacklogTasks = filteredBacklogTasks.filter(task => backlogSelectedPriorities.includes(task.priority));
        }

        // Sort tasks (same as BacklogDrawer)
        let sortedTasks = [...filteredBacklogTasks];
        if (backlogSortByPriority || backlogSortByTag) {
          sortedTasks.sort((a, b) => {
            // Sort by priority first if enabled
            if (backlogSortByPriority) {
              const priorityA = getPriorityConfig(a.priority).sortOrder;
              const priorityB = getPriorityConfig(b.priority).sortOrder;
              if (priorityA !== priorityB) return priorityA - priorityB;
            }

            // Then sort by tag if enabled
            if (backlogSortByTag) {
              const tagA = a.tags && a.tags.length > 0 ? a.tags[0].name : "";
              const tagB = b.tags && b.tags.length > 0 ? b.tags[0].name : "";
              if (tagA !== tagB) {
                if (!tagA) return 1; // Untagged goes to end
                if (!tagB) return -1;
                return tagA.localeCompare(tagB);
              }
            }

            // Finally sort by order
            return (a.order || 0) - (b.order || 0);
          });
        } else {
          sortedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        const taskIndex = sortedTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;

        const [removed] = sortedTasks.splice(taskIndex, 1);
        sortedTasks.splice(destination.index, 0, removed);

        // If priority sort is on, determine new priority based on position
        if (backlogSortByPriority && sortedTasks.length > 0) {
          // Find which priority section the task is now in
          // Look at the task before and after to determine priority
          let newPriority = task.priority; // Default to current priority

          if (destination.index > 0) {
            // Check the task before to see what priority section we're in
            const prevTask = sortedTasks[destination.index - 1];
            newPriority = prevTask.priority;
          } else if (destination.index < sortedTasks.length - 1) {
            // Check the task after
            const nextTask = sortedTasks[destination.index + 1];
            newPriority = nextTask.priority;
          }

          // If priority changed, update it
          if (newPriority !== task.priority) {
            updateTaskMutation({
              id: taskId,
              priority: newPriority,
            });
          }
        }

        // Reorder tasks based on their new positions
        const updates = sortedTasks.map((t, idx) => ({ id: t.id, order: idx }));
        batchReorderTasksMutation(updates);
        return;
      }

      // Backlog to Section
      if (sourceId === "backlog" && destId.startsWith("section-")) {
        const destSectionId = destId.replace("section-", "");
        const destSection = sections.find(s => s.id === destSectionId);

        if (!destSection) {
          console.error("Destination section not found:", destSectionId);
          return;
        }

        const sectionTasks = tasksBySection[destSectionId] || [];
        const destTasks = [...sectionTasks]
          .filter(t => !t.parentId && t.id !== taskId)
          .sort((a, b) => {
            if (a.time && b.time) {
              const aMinutes = timeToMinutes(a.time);
              const bMinutes = timeToMinutes(b.time);
              if (aMinutes !== bMinutes) return aMinutes - bMinutes;
            }
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            return (a.order || 0) - (b.order || 0);
          });

        let timeUpdate = {};
        if (destSection?.startTime && destSection?.endTime) {
          const newTime = getSectionDropTime({
            targetSection: destSection,
            targetSectionTasks: destTasks,
            destIndex: destination.index,
            taskId,
          });
          if (newTime !== null) {
            timeUpdate.time = newTime;
          }
        }

        const today = new Date(viewDate);
        today.setHours(0, 0, 0, 0);
        const targetDateStr = formatLocalDate(today);

        // Calculate the order for the new position
        destTasks.splice(destination.index, 0, task);
        const newOrder = destination.index;

        const allUpdates = {
          id: taskId,
          ...timeUpdate,
          sectionId: destSectionId,
          order: newOrder,
          recurrence: {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          },
          status: "in_progress",
        };

        // Update task with all properties including order
        updateTaskMutation(allUpdates);

        // Reorder all tasks in the section to fix orders
        const updates = destTasks.map((t, idx) => ({ id: t.id, order: idx }));
        batchReorderTasksMutation(updates);
        return;
      }

      // Section to Backlog
      if (sourceId.startsWith("section-") && destId === "backlog") {
        // Get filtered tasks (same logic as BacklogDrawer uses)
        let filteredBacklogTasks = [...taskFilters.backlogTasks].filter(t => t.id !== taskId);

        // Apply same filters as BacklogDrawer
        if (backlogSearchTerm.trim()) {
          const lowerSearch = backlogSearchTerm.toLowerCase();
          filteredBacklogTasks = filteredBacklogTasks.filter(task => task.title.toLowerCase().includes(lowerSearch));
        }

        if (backlogSelectedTagIds.length > 0) {
          const hasUntaggedFilter = backlogSelectedTagIds.includes("__UNTAGGED__");
          const regularTagIds = backlogSelectedTagIds.filter(id => id !== "__UNTAGGED__");

          if (hasUntaggedFilter && regularTagIds.length > 0) {
            filteredBacklogTasks = filteredBacklogTasks.filter(
              task => !task.tags || task.tags.length === 0 || task.tags.some(tag => regularTagIds.includes(tag.id))
            );
          } else if (hasUntaggedFilter) {
            filteredBacklogTasks = filteredBacklogTasks.filter(task => !task.tags || task.tags.length === 0);
          } else if (regularTagIds.length > 0) {
            filteredBacklogTasks = filteredBacklogTasks.filter(task =>
              task.tags?.some(tag => regularTagIds.includes(tag.id))
            );
          }
        }

        if (backlogSelectedPriorities.length > 0) {
          filteredBacklogTasks = filteredBacklogTasks.filter(task => backlogSelectedPriorities.includes(task.priority));
        }

        // Sort tasks (same as BacklogDrawer)
        let sortedTasks = [...filteredBacklogTasks];
        if (backlogSortByPriority || backlogSortByTag) {
          sortedTasks.sort((a, b) => {
            // Sort by priority first if enabled
            if (backlogSortByPriority) {
              const priorityA = getPriorityConfig(a.priority).sortOrder;
              const priorityB = getPriorityConfig(b.priority).sortOrder;
              if (priorityA !== priorityB) return priorityA - priorityB;
            }

            // Then sort by tag if enabled
            if (backlogSortByTag) {
              const tagA = a.tags && a.tags.length > 0 ? a.tags[0].name : "";
              const tagB = b.tags && b.tags.length > 0 ? b.tags[0].name : "";
              if (tagA !== tagB) {
                if (!tagA) return 1; // Untagged goes to end
                if (!tagB) return -1;
                return tagA.localeCompare(tagB);
              }
            }

            // Finally sort by order
            return (a.order || 0) - (b.order || 0);
          });
        } else {
          sortedTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        sortedTasks.splice(destination.index, 0, task);

        // If priority sort is on, determine priority based on position
        let newPriority = task.priority; // Default to current priority
        if (backlogSortByPriority && sortedTasks.length > 0) {
          // Find which priority section the task is being dropped into
          if (destination.index > 0) {
            // Check the task before to see what priority section we're in
            const prevTask = sortedTasks[destination.index - 1];
            newPriority = prevTask.priority;
          } else if (destination.index < sortedTasks.length - 1) {
            // Check the task after
            const nextTask = sortedTasks[destination.index + 1];
            newPriority = nextTask.priority;
          }
        }

        const updates = sortedTasks.map((t, idx) => ({ id: t.id, order: idx }));

        // Update task with all properties including order and priority
        updateTaskMutation({
          id: taskId,
          sectionId: null,
          order: destination.index,
          time: null,
          recurrence: null,
          status: "todo",
          priority: newPriority,
        });

        // Reorder all backlog tasks to fix orders
        batchReorderTasksMutation(updates);
        return;
      }

      // Section to Section (same or different)
      if (sourceId.startsWith("section-") && destId.startsWith("section-")) {
        const sourceSectionId = sourceId.replace("section-", "");
        const destSectionId = destId.replace("section-", "");

        const destSection = sections.find(s => s.id === destSectionId);

        if (!destSection) {
          console.error("Destination section not found:", destSectionId);
          return;
        }

        const destSectionTasks = tasksBySection[destSectionId] || [];
        const destTasks = [...destSectionTasks]
          .filter(t => !t.parentId && t.id !== taskId)
          .sort((a, b) => {
            if (a.time && b.time) {
              const aMinutes = timeToMinutes(a.time);
              const bMinutes = timeToMinutes(b.time);
              if (aMinutes !== bMinutes) return aMinutes - bMinutes;
            }
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            return (a.order || 0) - (b.order || 0);
          });

        let timeUpdate = {};
        if (destSection?.startTime && destSection?.endTime) {
          const newTime = getSectionDropTime({
            targetSection: destSection,
            targetSectionTasks: destTasks,
            destIndex: destination.index,
            taskId,
          });
          if (newTime !== null) {
            timeUpdate.time = newTime;
          }
        }

        const allUpdates = {
          id: taskId,
          ...timeUpdate,
          sectionId: destSectionId,
        };

        const viewDateObj = viewDate || new Date();
        const today = new Date(viewDateObj);
        today.setHours(0, 0, 0, 0);
        const targetDateStr = formatLocalDate(today);
        const currentDateStr = task.recurrence?.startDate?.split("T")[0];
        const needsDateUpdate = currentDateStr !== targetDateStr;
        const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (!isRecurring && (needsDateUpdate || !task.recurrence)) {
          allUpdates.recurrence = {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          };
        }

        updateTaskMutation(allUpdates);

        // Update sectionId and order via reorderTask
        await reorderTask(taskId, sourceSectionId, destSectionId, destination.index);

        if (sourceSectionId === destSectionId) {
          const sourceTasks = [...destSectionTasks]
            .filter(t => !t.parentId)
            .sort((a, b) => {
              if (a.time && b.time) {
                const aMinutes = timeToMinutes(a.time);
                const bMinutes = timeToMinutes(b.time);
                if (aMinutes !== bMinutes) return aMinutes - bMinutes;
              }
              if (a.time && !b.time) return -1;
              if (!a.time && b.time) return 1;
              return (a.order || 0) - (b.order || 0);
            });

          const currentIndex = sourceTasks.findIndex(t => t.id === taskId);
          if (currentIndex !== -1) {
            sourceTasks.splice(currentIndex, 1);
          }

          sourceTasks.splice(destination.index, 0, task);

          const updates = sourceTasks.map((t, idx) => ({ id: t.id, order: idx }));
          batchReorderTasksMutation(updates);
          return;
        }

        const sourceSectionTasks = tasksBySection[sourceSectionId] || [];
        const sourceTasks = [...sourceSectionTasks]
          .filter(t => !t.parentId && t.id !== taskId)
          .sort((a, b) => {
            if (a.time && b.time) {
              const aMinutes = timeToMinutes(a.time);
              const bMinutes = timeToMinutes(b.time);
              if (aMinutes !== bMinutes) return aMinutes - bMinutes;
            }
            if (a.time && !b.time) return -1;
            if (!a.time && b.time) return 1;
            return (a.order || 0) - (b.order || 0);
          });

        const sourceUpdates = sourceTasks.map((t, idx) => ({ id: t.id, order: idx }));

        destTasks.splice(destination.index, 0, task);
        const destUpdates = destTasks.map((t, idx) => ({ id: t.id, order: idx }));

        // Update sectionId and order via reorderTask
        await reorderTask(taskId, sourceSectionId, destSectionId, destination.index);
        batchReorderTasksMutation([...sourceUpdates, ...destUpdates]);
        return;
      }
    },
    [
      sections,
      tasks,
      viewDate,
      taskFilters,
      backlogTasks,
      tasksBySection,
      reorderSectionsMutation,
      batchReorderTasksMutation,
      updateTaskMutation,
      getSectionDropTime,
      reorderTask,
      backlogSearchTerm,
      backlogSelectedTagIds,
      backlogSelectedPriorities,
      backlogSortByPriority,
      backlogSortByTag,
    ]
  );

  // Completion helpers
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  const filteredTodaysTasks = taskFilters.filteredTodaysTasks;
  const todaysTasks = taskFilters.todaysTasks;

  // Section expansion
  const sectionExpansion = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection,
    viewDate,
    todaysTasks,
  });

  // Resize handlers
  const resizeHandlers = useResizeHandlers({
    backlogWidth,
    setBacklogWidth: width => dispatch(setBacklogWidth(width)),
  });

  // Auto scroll
  const autoScroll = useAutoScroll({
    todayViewDate,
    computedSections: sectionExpansion.computedSections,
    tasksBySection,
    isMobile,
  });

  const todayScrollContainerRefCallback = useCallback(
    node => {
      autoScroll.setTodayScrollContainerRef(node);
    },
    [autoScroll]
  );

  // Task operations
  const taskOps = useTaskOperations();

  // Progress calculation
  const { totalTasks, completedTasks, completedPercent, notCompletedPercent, uncheckedPercent } = useMemo(() => {
    const total = filteredTodaysTasks.length;

    const completed = filteredTodaysTasks.filter(t => {
      const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
      const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
      return isCompletedOnViewDate || allSubtasksComplete;
    }).length;

    const notCompleted = filteredTodaysTasks.filter(t => {
      const outcome = getOutcomeOnDate(t.id, viewDate);
      return outcome === "not_completed";
    }).length;

    const unchecked = total - completed - notCompleted;

    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const notCompletedPct = total > 0 ? Math.round((notCompleted / total) * 100) : 0;
    const uncheckedPct = total > 0 ? Math.round((unchecked / total) * 100) : 0;

    return {
      totalTasks: total,
      completedTasks: completed,
      completedPercent: completedPct,
      notCompletedPercent: notCompletedPct,
      uncheckedPercent: uncheckedPct,
    };
  }, [filteredTodaysTasks, isCompletedOnDate, getOutcomeOnDate, viewDate]);

  // Map mobileActiveView to tab index
  const getTabIndex = useCallback(() => {
    switch (mobileActiveView) {
      case "backlog":
        return 0;
      case "today":
        return 1;
      case "calendar":
        return 2;
      default:
        return 0;
    }
  }, [mobileActiveView]);

  // Map tab index to mobileActiveView
  const handleTabChange = useCallback(
    (e, newValue) => {
      switch (newValue) {
        case 0:
          dispatch(setMobileActiveView("backlog"));
          break;
        case 1:
          dispatch(setMobileActiveView("today"));
          break;
        case 2:
          dispatch(setMobileActiveView("calendar"));
          break;
        default:
          dispatch(setMobileActiveView("backlog"));
      }
    },
    [dispatch]
  );

  if (isMobile) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Mobile Tab Bar */}
        <Tabs
          value={getTabIndex()}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Tab
            icon={<List fontSize="small" />}
            iconPosition="start"
            label={"Backlog"}
            sx={{
              fontSize: "0.875rem",
              minHeight: 48,
              "& .MuiTab-wrapper": {
                width: "100%",
              },
            }}
          />
          <Tab
            icon={<LayoutDashboard fontSize="small" />}
            iconPosition="start"
            label="Today"
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
          <Tab
            icon={<Calendar fontSize="small" />}
            iconPosition="start"
            label="Calendar"
            sx={{ fontSize: "0.875rem", minHeight: 48 }}
          />
        </Tabs>

        {/* Mobile Content Area */}
        <Box sx={{ flex: 1, overflow: "hidden" }}>
          {mobileActiveView === "backlog" && (
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
              {isLoading ? (
                <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CircularProgress size={48} />
                </Box>
              ) : (
                <BacklogDrawer createDraggableId={createDraggableId} />
              )}
            </Box>
          )}

          {mobileActiveView === "today" && (
            <Box sx={{ height: "100%", overflow: "auto", p: 1 }}>
              {/* Mobile Today View - Progress bar */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    mb: 1,
                  }}
                >
                  <Typography variant="caption">
                    {viewDate && viewDate.toDateString() === today.toDateString()
                      ? "Today's Progress"
                      : `${viewDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })} Progress`}
                  </Typography>
                  <Typography variant="caption">
                    {completedTasks}/{totalTasks} ({completedPercent}%)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: "action.hover",
                    borderRadius: "9999px",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                  }}
                >
                  {/* Completed segment */}
                  {completedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        background: `linear-gradient(to right, ${
                          colorMode === "dark" ? "#48BB78" : "#38A169"
                        }, ${colorMode === "dark" ? "#4299E1" : "#3182CE"})`,
                        transition: "width 0.3s ease-in-out",
                        width: `${completedPercent}%`,
                      }}
                    />
                  )}
                  {/* Not completed segment */}
                  {notCompletedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        background: `linear-gradient(to right, ${
                          colorMode === "dark" ? "#E53E3E" : "#C53030"
                        }, ${colorMode === "dark" ? "#FC8181" : "#E53E3E"})`,
                        transition: "width 0.3s ease-in-out",
                        width: `${notCompletedPercent}%`,
                      }}
                    />
                  )}
                  {/* Unchecked segment - translucent background */}
                  {uncheckedPercent > 0 && (
                    <Box
                      sx={{
                        height: "100%",
                        bgcolor: "action.hover",
                        opacity: 0.5,
                        transition: "width 0.3s ease-in-out",
                        width: `${uncheckedPercent}%`,
                      }}
                    />
                  )}
                </Box>
              </Box>

              <TodayView
                isLoading={isLoading}
                sections={sections}
                todayViewDate={todayViewDate}
                handleTodayViewDateChange={handleTodayViewDateChange}
                navigateTodayView={navigateTodayView}
                handleTodayViewToday={handleTodayViewToday}
                filteredTodaysTasks={filteredTodaysTasks}
                todaysTasks={todaysTasks}
                todaySearchTerm={todaySearchTerm}
                setTodaySearchTerm={setTodaySearchTerm}
                todaySelectedTagIds={todaySelectedTagIds}
                handleTodayTagSelect={handleTodayTagSelect}
                handleTodayTagDeselect={handleTodayTagDeselect}
                tags={tags}
                createTag={createTag}
                showCompletedTasks={showCompletedTasks}
                setShowCompletedTasks={setShowCompletedTasks}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                todayScrollContainerRef={todayScrollContainerRefCallback}
                isMobile={isMobile}
              />
            </Box>
          )}

          {mobileActiveView === "calendar" && (
            <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <CalendarViewTab isLoading={isLoading} />
            </Box>
          )}
        </Box>
      </DragDropContext>
    );
  }

  // Desktop Layout
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
        {/* Backlog Section */}
        <Box
          sx={{
            width: backlogOpen ? `${resizeHandlers.backlogWidth}px` : "0px",
            height: "100%",
            transition:
              resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                ? "none"
                : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "width" : "auto",
            overflow: "hidden",
            borderRight: backlogOpen ? "1px solid" : "none",
            borderColor: "divider",
            bgcolor: "background.default",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <Box
            sx={{
              width: `${resizeHandlers.backlogWidth}px`,
              height: "100%",
              position: "relative",
            }}
          >
            <Collapse
              orientation="horizontal"
              in={backlogOpen}
              timeout={400}
              sx={{
                width: "100%",
                height: "100%",
                transition: resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "none" : undefined,
              }}
            >
              <Box
                sx={{
                  width: `${resizeHandlers.backlogWidth}px`,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  minHeight: 0,
                }}
              >
                {isLoading ? (
                  <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CircularProgress size={48} />
                  </Box>
                ) : (
                  <BacklogDrawer createDraggableId={createDraggableId} />
                )}
                {/* Resize handle between backlog and today */}
                <Box
                  onMouseDown={resizeHandlers.handleBacklogResizeStart}
                  onTouchStart={resizeHandlers.handleBacklogResizeStart}
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: { md: "12px", lg: "4px" },
                    cursor: "col-resize",
                    bgcolor:
                      resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                        ? "primary.light"
                        : "transparent",
                    transition: "background-color 0.2s",
                    zIndex: 10,
                    userSelect: "none",
                    touchAction: "none",
                    display: { xs: "none", md: "block" },
                    "&:hover": {
                      bgcolor: "primary.main",
                    },
                  }}
                />
              </Box>
            </Collapse>
          </Box>
        </Box>

        {/* Today and Calendar Section */}
        <Box
          sx={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
            minWidth: 0,
            justifyContent: !backlogOpen && mainContentView === "today" ? "center" : "flex-start",
          }}
        >
          {mainContentView === "today" && (
            <Box
              sx={{
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                maxWidth: !backlogOpen ? "1200px" : "none",
                width: "100%",
                mx: !backlogOpen ? "auto" : 0,
              }}
            >
              <TodayView
                isLoading={isLoading}
                sections={sections}
                todayViewDate={todayViewDate}
                handleTodayViewDateChange={handleTodayViewDateChange}
                navigateTodayView={navigateTodayView}
                handleTodayViewToday={handleTodayViewToday}
                filteredTodaysTasks={filteredTodaysTasks}
                todaysTasks={todaysTasks}
                todaySearchTerm={todaySearchTerm}
                setTodaySearchTerm={setTodaySearchTerm}
                todaySelectedTagIds={todaySelectedTagIds}
                handleTodayTagSelect={handleTodayTagSelect}
                handleTodayTagDeselect={handleTodayTagDeselect}
                tags={tags}
                createTag={createTag}
                showCompletedTasks={showCompletedTasks}
                setShowCompletedTasks={setShowCompletedTasks}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                todayScrollContainerRef={todayScrollContainerRefCallback}
                isMobile={isMobile}
              />
            </Box>
          )}

          {mainContentView === "calendar" && (
            <Box sx={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <CalendarViewTab
                isLoading={isLoading}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                navigateCalendar={navigateCalendar}
                getCalendarTitle={getCalendarTitle}
                calendarView={calendarView}
                setCalendarView={setCalendarView}
                calendarSearchTerm={calendarSearchTerm}
                setCalendarSearchTerm={setCalendarSearchTerm}
                calendarSelectedTagIds={calendarSelectedTagIds}
                handleCalendarTagSelect={handleCalendarTagSelect}
                handleCalendarTagDeselect={handleCalendarTagDeselect}
                tags={tags}
                createTag={createTag}
                showCompletedTasksCalendar={showCompletedTasksCalendar}
                setShowCompletedTasksCalendar={setShowCompletedTasksCalendar}
                showRecurringTasks={showRecurringTasks}
                setShowRecurringTasks={setShowRecurringTasks}
                calendarZoom={calendarZoom}
                setCalendarZoom={setCalendarZoom}
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                tasks={tasks}
                isCompletedOnDate={isCompletedOnDate}
                getOutcomeOnDate={getOutcomeOnDate}
                handleEditTask={taskOps.handleEditTask}
                handleEditWorkout={taskOps.handleEditWorkout}
                handleOutcomeChange={completionHandlers.handleOutcomeChange}
                handleDuplicateTask={taskOps.handleDuplicateTask}
                handleDeleteTask={taskOps.handleDeleteTask}
                isMobile={isMobile}
              />
            </Box>
          )}
        </Box>
      </Box>
    </DragDropContext>
  );
}

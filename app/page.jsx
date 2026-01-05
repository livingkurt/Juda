"use client";

import { useEffect, useCallback, useMemo, startTransition, useState } from "react";
import { Box, Button, Group, Text, Flex, ActionIcon, Title, Badge, Anchor, Center, Loader } from "@mantine/core";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { AuthPage } from "@/components/AuthPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeSelector } from "@/components/ThemeSelector";
import { DndContext, DragOverlay, pointerWithin, closestCenter } from "@dnd-kit/core";
import {
  Calendar,
  LayoutDashboard,
  List,
  Sun,
  Sunset,
  Moon,
  Eye,
  EyeOff,
  Repeat,
  X,
  ZoomIn,
  ZoomOut,
  LogOut,
  StickyNote,
  CheckSquare,
  Clock,
  Columns,
  BookOpen,
} from "lucide-react";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useBatchReorderTasksMutation,
  useBatchUpdateTasksMutation,
} from "@/lib/store/api/tasksApi";
import {
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useReorderSectionsMutation,
} from "@/lib/store/api/sectionsApi";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useUpdateCompletionMutation,
  useBatchCreateCompletionsMutation,
  useBatchDeleteCompletionsMutation,
} from "@/lib/store/api/completionsApi";
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useUpdateTaskTagsMutation,
} from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useDispatch, useSelector } from "react-redux";
import {
  setBacklogOpen,
  setShowDashboard,
  setShowCalendar,
  setNotesSidebarOpen,
  setNotesListOpen,
  setBacklogWidth,
  setBacklogTagSidebarOpen,
  setTodayViewWidth,
  setNotesSidebarWidth,
  setNotesListWidth,
  openTaskDialog,
} from "@/lib/store/slices/uiSlice";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useResizeHandlers } from "@/hooks/useResizeHandlers";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { useSectionOperations } from "@/hooks/useSectionOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useSectionExpansion } from "@/hooks/useSectionExpansion";
import { useViewState } from "@/hooks/useViewState";
import { useDialogState } from "@/hooks/useDialogState";
import { useSelectionState } from "@/hooks/useSelectionState";
import { getGreeting } from "@/lib/utils";
import { createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { CalendarYearView } from "@/components/CalendarYearView";
import { RecurringTableView } from "@/components/RecurringTableView";
import { JournalView } from "@/components/JournalView";
import { KanbanView } from "@/components/KanbanView";
import {
  PageSkeleton,
  SectionSkeleton,
  BacklogSkeleton,
  CalendarSkeleton,
  LoadingSpinner,
} from "@/components/Skeletons";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { NotesView } from "@/components/NotesView";
import { Tag as TagIcon } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load heavy components that aren't immediately visible
const BulkEditDialog = dynamic(
  () => import("@/components/BulkEditDialog").then(mod => ({ default: mod.BulkEditDialog })),
  {
    loading: () => (
      <Center p={32}>
        <Loader size="lg" />
      </Center>
    ),
    ssr: false,
  }
);

const TagEditor = dynamic(() => import("@/components/TagEditor").then(mod => ({ default: mod.TagEditor })), {
  loading: () => (
    <Center p={32}>
      <Loader size="lg" />
    </Center>
  ),
  ssr: false,
});

const WorkoutModal = dynamic(() => import("@/components/WorkoutModal"), {
  loading: () => (
    <Center p={32}>
      <Loader size="lg" />
    </Center>
  ),
  ssr: false,
});

const WorkoutBuilder = dynamic(() => import("@/components/WorkoutBuilder"), {
  loading: () => (
    <Center p={32}>
      <Loader size="lg" />
    </Center>
  ),
  ssr: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

const calendarViewData = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

// Custom collision detection that prioritizes sortable reordering
const customCollisionDetection = args => {
  const activeData = args.active?.data?.current;
  const isSortable = activeData?.type === "TASK" || activeData?.type === "SUBTASK" || activeData?.type === "SECTION";

  // For sortable items, use closestCenter for smooth list reordering
  if (isSortable) {
    const closestCollisions = closestCenter(args);
    if (closestCollisions.length > 0) {
      return closestCollisions;
    }
  }

  // Fall back to pointerWithin for cross-container drops and non-sortable items
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : [];
};

export default function DailyTasksApp() {
  const { isAuthenticated, loading: authLoading, initialized: authInitialized, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorModeSync();
  const { mode, interactive, dnd, icon } = useSemanticColors();

  const bgColor = mode.bg.canvas;
  const headerBg = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const progressBarBg = mode.bg.muted;
  const dragOverlayBg = dnd.dropTarget;
  const dragOverlayBorder = dnd.dropTargetBorder;
  const dragOverlayText = interactive.primary;

  // Redux RTK Query hooks - skip queries until authenticated
  const {
    data: tasks = [],
    isLoading: tasksLoading,
    refetch: fetchTasks,
  } = useGetTasksQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createTaskMutation] = useCreateTaskMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();
  const [batchReorderTasksMutation] = useBatchReorderTasksMutation();
  const [batchUpdateTasksMutation] = useBatchUpdateTasksMutation();

  const { data: sections = [], isLoading: sectionsLoading } = useGetSectionsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createSectionMutation] = useCreateSectionMutation();
  const [updateSectionMutation] = useUpdateSectionMutation();
  const [deleteSectionMutation] = useDeleteSectionMutation();
  const [reorderSectionsMutation] = useReorderSectionsMutation();

  const { data: tags = [], isLoading: tagsLoading } = useGetTagsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [createTagMutation] = useCreateTagMutation();
  const [updateTagMutation] = useUpdateTagMutation();
  const [deleteTagMutation] = useDeleteTagMutation();
  const [updateTaskTagsMutation] = useUpdateTaskTagsMutation();

  const [createCompletionMutation] = useCreateCompletionMutation();
  const [deleteCompletionMutation] = useDeleteCompletionMutation();
  const [updateCompletionMutation] = useUpdateCompletionMutation();
  const [batchCreateCompletionsMutation] = useBatchCreateCompletionsMutation();
  const [batchDeleteCompletionsMutation] = useBatchDeleteCompletionsMutation();

  // Completion helpers
  const {
    completions,
    loading: completionsLoading,
    isCompletedOnDate,
    hasRecordOnDate: _hasRecordOnDate,
    getOutcomeOnDate,
    getCompletionForDate,
    hasAnyCompletion: _hasAnyCompletion,
  } = useCompletionHelpers();

  // Wrapper functions to match old API
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

  const _batchReorderTasks = useCallback(
    async updates => {
      return await batchReorderTasksMutation(updates).unwrap();
    },
    [batchReorderTasksMutation]
  );

  const _batchUpdateTasks = useCallback(
    async (taskIds, updates) => {
      return await batchUpdateTasksMutation({ taskIds, updates }).unwrap();
    },
    [batchUpdateTasksMutation]
  );

  const _createSection = useCallback(
    async sectionData => {
      return await createSectionMutation(sectionData).unwrap();
    },
    [createSectionMutation]
  );

  const _updateSection = useCallback(
    async (id, sectionData) => {
      return await updateSectionMutation({ id, ...sectionData }).unwrap();
    },
    [updateSectionMutation]
  );

  const _deleteSection = useCallback(
    async id => {
      return await deleteSectionMutation(id).unwrap();
    },
    [deleteSectionMutation]
  );

  const _reorderSections = useCallback(
    async newSections => {
      return await reorderSectionsMutation(newSections).unwrap();
    },
    [reorderSectionsMutation]
  );

  const createTag = useCallback(
    async (name, color) => {
      return await createTagMutation({ name, color }).unwrap();
    },
    [createTagMutation]
  );

  const updateTagOriginal = useCallback(
    async (id, updates) => {
      return await updateTagMutation({ id, ...updates }).unwrap();
    },
    [updateTagMutation]
  );

  const deleteTagOriginal = useCallback(
    async id => {
      return await deleteTagMutation(id).unwrap();
    },
    [deleteTagMutation]
  );

  const _batchUpdateTaskTags = useCallback(
    async (taskId, tagIds) => {
      return await updateTaskTagsMutation({ taskId, tagIds }).unwrap();
    },
    [updateTaskTagsMutation]
  );

  const createCompletion = useCallback(
    async (taskId, date, options) => {
      return await createCompletionMutation({ taskId, date, ...options }).unwrap();
    },
    [createCompletionMutation]
  );

  const deleteCompletion = useCallback(
    async (taskId, date) => {
      return await deleteCompletionMutation({ taskId, date }).unwrap();
    },
    [deleteCompletionMutation]
  );

  const updateCompletion = useCallback(
    async (taskId, date, updates) => {
      return await updateCompletionMutation({ taskId, date, ...updates }).unwrap();
    },
    [updateCompletionMutation]
  );

  const _batchCreateCompletions = useCallback(
    async completionsToCreate => {
      return await batchCreateCompletionsMutation(completionsToCreate).unwrap();
    },
    [batchCreateCompletionsMutation]
  );

  const _batchDeleteCompletions = useCallback(
    async completionsToDelete => {
      return await batchDeleteCompletionsMutation(completionsToDelete).unwrap();
    },
    [batchDeleteCompletionsMutation]
  );

  const fetchCompletions = useCallback(() => {
    // RTK Query handles refetching automatically
    return Promise.resolve();
  }, []);

  // Complex task operations
  const _saveTask = useCallback(
    async taskData => {
      const { tagIds, subtasks: subtasksData, ...taskFields } = taskData;

      try {
        let savedTask;

        if (taskData.id) {
          // Update existing task
          savedTask = await updateTaskMutation({ id: taskData.id, ...taskFields }).unwrap();
        } else {
          // Create new task
          savedTask = await createTaskMutation(taskFields).unwrap();
        }

        // Handle subtasks if provided
        if (subtasksData !== undefined) {
          // This would require batch operations - for now, refetch
          await fetchTasks();
        }

        // Handle tag assignments if tagIds provided
        if (tagIds !== undefined) {
          await updateTaskTagsMutation({ taskId: savedTask.id, tagIds }).unwrap();
        }

        return savedTask;
      } catch (err) {
        console.error("Error saving task:", err);
        throw err;
      }
    },
    [createTaskMutation, updateTaskMutation, updateTaskTagsMutation, fetchTasks]
  );

  const reorderTask = useCallback(
    async (taskId, sourceSectionId, targetSectionId, newOrder) => {
      try {
        // Update task with new section and order
        await updateTaskMutation({
          id: taskId,
          sectionId: targetSectionId,
          order: newOrder,
        }).unwrap();
        // Refresh to get correct order from server
        await fetchTasks();
      } catch (err) {
        console.error("Error reordering task:", err);
        throw err;
      }
    },
    [updateTaskMutation, fetchTasks]
  );

  const _duplicateTask = useCallback(
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

      try {
        // Create a copy of the task with "Copy of" prefix
        const duplicatedTaskData = {
          title: `Copy of ${taskToDuplicate.title}`,
          sectionId: taskToDuplicate.sectionId,
          time: taskToDuplicate.time,
          duration: taskToDuplicate.duration,
          recurrence: taskToDuplicate.recurrence,
          parentId: taskToDuplicate.parentId,
          order: taskToDuplicate.order,
        };

        const newTask = await createTaskMutation(duplicatedTaskData).unwrap();
        return newTask;
      } catch (err) {
        console.error("Error duplicating task:", err);
        throw err;
      }
    },
    [tasks, createTaskMutation]
  );

  // Tag update helpers that also update task references
  const updateTagInTasks = useCallback((_tagId, _updatedTag) => {
    // RTK Query will automatically update tasks when tags change
    // due to cache invalidation
  }, []);

  const removeTagFromTasks = useCallback(_tagId => {
    // RTK Query will automatically update tasks when tags change
    // due to cache invalidation
  }, []);

  // Wrapper around updateTag that also updates tag references in tasks
  const updateTag = useCallback(
    async (id, updates) => {
      const updatedTag = await updateTagOriginal(id, updates);
      // Update tag references in all tasks
      updateTagInTasks(id, updatedTag);
      return updatedTag;
    },
    [updateTagOriginal, updateTagInTasks]
  );

  // Wrapper around deleteTag that also removes tag references from tasks
  const deleteTag = useCallback(
    async id => {
      await deleteTagOriginal(id);
      // Remove tag references from all tasks
      removeTagFromTasks(id);
    },
    [deleteTagOriginal, removeTagFromTasks]
  );

  // Get preferences from context
  const { preferences, initialized: prefsInitialized, updatePreference } = usePreferencesContext();

  // Use synced color mode
  // const { colorMode, toggleColorMode } = useColorModeSync(); // Already imported above

  // Get UI state from Redux
  const dispatch = useDispatch();

  // Use state hooks that use Redux directly
  const viewState = useViewState();
  const dialogState = useDialogState();
  const selectionState = useSelectionState();

  // Panel visibility and width from Redux
  const backlogOpen = useSelector(state => state.ui.backlogOpen);
  const backlogTagSidebarOpen = useSelector(state => state.ui.backlogTagSidebarOpen);
  const showDashboard = useSelector(state => state.ui.showDashboard);
  const showCalendar = useSelector(state => state.ui.showCalendar);
  const notesSidebarOpen = useSelector(state => state.ui.notesSidebarOpen);
  const notesListOpen = useSelector(state => state.ui.notesListOpen);
  const backlogWidth = useSelector(state => state.ui.backlogWidth);
  const todayViewWidth = useSelector(state => state.ui.todayViewWidth);
  const notesSidebarWidth = useSelector(state => state.ui.notesSidebarWidth);
  const notesListWidth = useSelector(state => state.ui.notesListWidth);

  // Get user preferences (not UI state) from PreferencesContext
  const {
    showCompletedTasks,
    showRecurringTasks,
    showCompletedTasksCalendar,
    showStatusTasks: _showStatusTasks,
    calendarZoom,
  } = preferences;

  const setShowCompletedTasks = useCallback(value => updatePreference("showCompletedTasks", value), [updatePreference]);

  // For nested preferences
  const setCalendarZoom = updater => {
    if (typeof updater === "function") {
      const newZoom = updater(calendarZoom);
      updatePreference("calendarZoom", newZoom);
    } else {
      updatePreference("calendarZoom", updater);
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

  const setShowCompletedTasksCalendar = updater => {
    if (typeof updater === "function") {
      const newValue = updater(showCompletedTasksCalendar);
      updatePreference("showCompletedTasksCalendar", newValue);
    } else {
      updatePreference("showCompletedTasksCalendar", updater);
    }
  };

  // setShowStatusTasks is available for future use (e.g., toggle in calendar views)
  // const setShowStatusTasks = updater => {
  //   if (typeof updater === "function") {
  //     const newValue = updater(showStatusTasks);
  //     updatePreference("showStatusTasks", newValue);
  //   } else {
  //     updatePreference("showStatusTasks", updater);
  //   }
  // };

  const isLoading = tasksLoading || sectionsLoading || tagsLoading || completionsLoading || !prefsInitialized;

  // Track which tab is currently loading (for immediate spinner display)
  const [loadingTab, setLoadingTab] = useState(null);

  // Extract commonly used values from viewState
  const {
    today,
    selectedDate,
    todayViewDate,
    viewDate,
    mainTabIndex,
    setMainTabIndex,
    mobileActiveView,
    setMobileActiveView,
    calendarView,
    setCalendarView,
    todaySearchTerm,
    setTodaySearchTerm,
    todaySelectedTagIds,
    calendarSearchTerm,
    setCalendarSearchTerm,
    calendarSelectedTagIds,
    navigateCalendar,
    navigateTodayView,
    handleTodayViewToday,
    handleTodayViewDateChange,
    getCalendarTitle,
  } = viewState;

  // Date values already extracted from viewState above

  // dialogState and selectionState values accessed directly via dialogState.* and selectionState.* when needed

  // Extract resize handlers
  const resizeHandlers = useResizeHandlers({
    backlogWidth,
    todayViewWidth,
    setBacklogWidth: width => dispatch(setBacklogWidth(width)),
    setTodayViewWidth: width => dispatch(setTodayViewWidth(width)),
  });

  // Extract mobile detection
  const isMobile = useMobileDetection();

  // Initialize section expansion state early (will be updated when tasksBySection is available)
  // We'll recreate it after taskFilters is created, but for now use empty object
  const sectionExpansionInitial = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection: {},
  });

  // Determine if we should show mobile layout
  const showMobileLayout = isMobile;

  // Sync Redux UI state with preferences on mount
  useEffect(() => {
    if (prefsInitialized) {
      // Initialize Redux state from preferences
      dispatch(setBacklogOpen(preferences.backlogOpen ?? true));
      dispatch(setBacklogTagSidebarOpen(preferences.backlogTagSidebarOpen ?? true));
      dispatch(setShowDashboard(preferences.showDashboard ?? true));
      dispatch(setShowCalendar(preferences.showCalendar ?? true));
      dispatch(setNotesSidebarOpen(preferences.notesSidebarOpen ?? true));
      dispatch(setNotesListOpen(preferences.notesListOpen ?? true));
      dispatch(setBacklogWidth(preferences.backlogWidth ?? 500));
      dispatch(setTodayViewWidth(preferences.todayViewWidth ?? 600));
      dispatch(setNotesSidebarWidth(preferences.notesSidebarWidth ?? 280));
      dispatch(setNotesListWidth(preferences.notesListWidth ?? 300));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsInitialized, dispatch]); // Only run once when preferences are loaded

  // Sync Redux UI state changes back to preferences
  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogOpen", backlogOpen);
    }
  }, [backlogOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogTagSidebarOpen", backlogTagSidebarOpen);
    }
  }, [backlogTagSidebarOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("showDashboard", showDashboard);
    }
  }, [showDashboard, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("showCalendar", showCalendar);
    }
  }, [showCalendar, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesSidebarOpen", notesSidebarOpen);
    }
  }, [notesSidebarOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesListOpen", notesListOpen);
    }
  }, [notesListOpen, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("backlogWidth", backlogWidth);
    }
  }, [backlogWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("todayViewWidth", todayViewWidth);
    }
  }, [todayViewWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesSidebarWidth", notesSidebarWidth);
    }
  }, [notesSidebarWidth, prefsInitialized, updatePreference]);

  useEffect(() => {
    if (prefsInitialized) {
      updatePreference("notesListWidth", notesListWidth);
    }
  }, [notesListWidth, prefsInitialized, updatePreference]);

  // Load completions on mount
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Cleanup and state management for recently completed tasks is now handled by completionHandlers hook

  // Navigation helpers are now provided by viewState hook

  // Keyboard shortcut: CMD+E (or CTRL+E) to open task dialog
  useEffect(() => {
    const handleKeyDown = e => {
      // Check for CMD+E (Mac) or CTRL+E (Windows/Linux)
      // Don't trigger if user is typing in an input/textarea/contenteditable
      const target = e.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && !isInput) {
        e.preventDefault();
        dispatch(openTaskDialog());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch]);

  // Extract task operations (uses Redux directly inside the hook)
  const taskOps = useTaskOperations();

  // Initialize completion handlers (uses Redux directly, just needs sectionExpansion callbacks)
  const completionHandlers = useCompletionHandlers({
    autoCollapsedSections: sectionExpansionInitial.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansionInitial.setAutoCollapsedSections,
    checkAndAutoCollapseSection: sectionExpansionInitial.checkAndAutoCollapseSection,
  });

  // Extract task filters (uses Redux directly, just needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Recreate section expansion with actual tasksBySection
  // Note: This creates a new hook instance, but the state is preserved via useState
  const sectionExpansion = useSectionExpansion({
    sections,
    showCompletedTasks,
    tasksBySection: taskFilters.tasksBySection,
  });

  // Extract status handlers (uses Redux directly, just needs addToRecentlyCompleted callback)
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });

  // Extract section operations (uses Redux directly, just needs sectionExpansion callbacks)
  const sectionOps = useSectionOperations({
    autoCollapsedSections: sectionExpansion.autoCollapsedSections,
    setAutoCollapsedSections: sectionExpansion.setAutoCollapsedSections,
    setManuallyExpandedSections: sectionExpansion.setManuallyExpandedSections,
  });

  // Extract auto-scroll
  const autoScroll = useAutoScroll({
    todayViewDate: viewState.todayViewDate,
    computedSections: sectionExpansion.computedSections,
    tasksBySection: taskFilters.tasksBySection,
    isMobile,
  });

  // Create a stable callback ref to avoid ESLint warning
  const todayScrollContainerRefCallback = useCallback(
    node => {
      autoScroll.setTodayScrollContainerRef(node);
    },
    [autoScroll]
  );

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon === "Sun" ? Sun : greeting.icon === "Sunset" ? Sunset : Moon;
  const todaysTasks = taskFilters.todaysTasks;
  const filteredTodaysTasks = taskFilters.filteredTodaysTasks;
  const tasksBySection = taskFilters.tasksBySection;
  const backlogTasks = taskFilters.backlogTasks;
  const noteTasks = taskFilters.noteTasks;

  // Filter journal tasks (completionType: "text" + any journal-related tag)
  const journalTasks = useMemo(() => {
    const journalTagNames = ["daily journal", "yearly reflection", "monthly reflection", "weekly reflection"];

    return tasks.filter(task => {
      if (task.completionType !== "text") return false;
      return task.tags?.some(tag => {
        const tagName = (tag.name || "").toLowerCase();
        return journalTagNames.includes(tagName);
      });
    });
  }, [tasks]);

  // Memoized section lookup map for O(1) access instead of O(n) find
  const sectionsById = useMemo(() => {
    const map = new Map();
    sections.forEach(section => {
      map.set(section.id, section);
    });
    return map;
  }, [sections]);

  // Memoized selected tasks for BulkEditDialog to avoid creating new array on every render
  const selectedTasksForBulkEdit = useMemo(() => {
    return tasks.filter(t => selectionState.selectedTaskIds.has(t.id));
  }, [tasks, selectionState.selectedTaskIds]);

  // Extract drag and drop handlers (uses Redux directly, just needs computed values and callbacks)
  const dragAndDrop = useDragAndDrop({
    backlogTasks,
    tasksBySection,
    handleStatusChange: statusHandlers.handleStatusChange,
    reorderTask,
  });

  // Legacy useMemo blocks removed - now using taskFilters hook

  // Progress calculation - check completion records for the selected date
  // Shows complete, not completed, and unchecked as separate segments
  // Memoized to avoid recalculating on every render
  const { totalTasks, completedTasks, completedPercent, notCompletedPercent, uncheckedPercent } = useMemo(() => {
    const total = filteredTodaysTasks.length;

    // Count completed tasks (outcome === "completed" or completion without outcome)
    const completed = filteredTodaysTasks.filter(t => {
      // Task is completed if outcome is "completed" or has completion record without outcome
      const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
      // Also check subtasks completion
      const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
      return isCompletedOnViewDate || allSubtasksComplete;
    }).length;

    // Count not completed tasks (outcome === "not_completed")
    const notCompleted = filteredTodaysTasks.filter(t => {
      const outcome = getOutcomeOnDate(t.id, viewDate);
      return outcome === "not_completed";
    }).length;

    // Unchecked tasks are those without any completion record (outcome === null)
    const unchecked = total - completed - notCompleted;

    // Calculate percentages based on total tasks (all three add up to 100%)
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

  // Section handlers - some still needed for dialogs
  const handleSaveSection = sectionOps.handleSaveSection;

  // Navigation helpers already destructured from viewState above

  // Drag handlers are now in useDragAndDrop hook
  const handleDragOver = dragAndDrop.handleDragOver;
  const handleDragEndNew = dragAndDrop.handleDragEndNew;

  // This ensures we never show the login form while auth check is in progress
  if (!authInitialized || authLoading) {
    return <PageSkeleton showBacklog={false} showDashboard={false} showCalendar={false} />;
  }

  // Now auth is fully initialized - show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // User is authenticated - show loading while data loads OR if we have no data yet
  // When queries are skipped, isLoading is false, so we also check if we have any data
  // This prevents showing empty UI while queries are starting after login
  const hasData = tasks.length > 0 || sections.length > 0;
  if (isLoading || !hasData) {
    return <PageSkeleton showBacklog={false} showDashboard={false} showCalendar={false} />;
  }

  return (
    <Box
      style={{
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: bgColor,
        color: textColor,
      }}
    >
      {/* Header */}
      <Box
        component="header"
        style={{
          background: headerBg,
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0,
        }}
      >
        <Box style={{ width: "100%", paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 16 }}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={[8, 12]}>
              <Box component="span" c={icon.primary}>
                <GreetingIcon size={20} stroke="currentColor" />
              </Box>
              <Box>
                <Title order={1} size={["md", "lg"]} fw={600}>
                  {greeting.text}
                </Title>
                <Text size={["xs", "sm"]} c={mutedText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </Box>
            </Flex>
            <Group gap={[4, 8]}>
              <ActionIcon
                onClick={() => dialogState.setTagEditorOpen(true)}
                variant="subtle"
                size="md"
                aria-label="Manage tags"
                style={{
                  minWidth: "40px",
                  height: "40px",
                  padding: 8,
                }}
                visibleFrom="md"
              >
                <TagIcon size={16} stroke="currentColor" />
              </ActionIcon>
              <ActionIcon
                onClick={() => dialogState.setTagEditorOpen(true)}
                variant="subtle"
                size="xs"
                aria-label="Manage tags"
                style={{
                  minWidth: "28px",
                  height: "28px",
                  padding: 0,
                }}
                hiddenFrom="md"
              >
                <TagIcon size={16} stroke="currentColor" />
              </ActionIcon>
              <ThemeSelector />
              <ActionIcon
                onClick={toggleColorMode}
                variant="subtle"
                size="md"
                aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  minWidth: "40px",
                  height: "40px",
                  padding: 8,
                }}
                visibleFrom="md"
              >
                {colorMode === "dark" ? (
                  <Sun size={16} stroke="currentColor" />
                ) : (
                  <Moon size={16} stroke="currentColor" />
                )}
              </ActionIcon>
              <ActionIcon
                onClick={toggleColorMode}
                variant="subtle"
                size="xs"
                aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  minWidth: "28px",
                  height: "28px",
                  padding: 0,
                }}
                hiddenFrom="md"
              >
                {colorMode === "dark" ? (
                  <Sun size={16} stroke="currentColor" />
                ) : (
                  <Moon size={16} stroke="currentColor" />
                )}
              </ActionIcon>
              <ActionIcon
                onClick={logout}
                variant="subtle"
                color="red"
                size="md"
                aria-label="Logout"
                style={{
                  minWidth: "40px",
                  height: "40px",
                  padding: 8,
                }}
                visibleFrom="md"
              >
                <LogOut size={16} stroke="currentColor" />
              </ActionIcon>
              <ActionIcon
                onClick={logout}
                variant="subtle"
                color="red"
                size="xs"
                aria-label="Logout"
                style={{
                  minWidth: "28px",
                  height: "28px",
                  padding: 0,
                }}
                hiddenFrom="md"
              >
                <LogOut size={16} stroke="currentColor" />
              </ActionIcon>
            </Group>
          </Flex>

          {/* Main Navigation Links */}
          <Box style={{ marginTop: 16 }}>
            <Group gap={0} justify="flex-start">
              <Anchor
                href="#"
                onClick={event => {
                  event.preventDefault();
                  const newTabIndex = 0;
                  setMainTabIndex(newTabIndex);
                  setLoadingTab(newTabIndex);
                  startTransition(() => {
                    setTimeout(() => setLoadingTab(null), 150);
                  });
                }}
                data-active={mainTabIndex === 0 || undefined}
              >
                <Group gap={[8, 12]}>
                  <CheckSquare size={14} />
                  <Text size={["sm", "md"]}>Tasks</Text>
                </Group>
              </Anchor>
              <Anchor
                href="#"
                onClick={event => {
                  event.preventDefault();
                  const newTabIndex = 1;
                  setMainTabIndex(newTabIndex);
                  setLoadingTab(newTabIndex);
                  startTransition(() => {
                    setTimeout(() => setLoadingTab(null), 150);
                  });
                }}
                data-active={mainTabIndex === 1 || undefined}
              >
                <Group gap={[8, 12]}>
                  <Columns size={14} />
                  <Text size={["sm", "md"]}>Kanban</Text>
                </Group>
              </Anchor>
              <Anchor
                href="#"
                onClick={event => {
                  event.preventDefault();
                  const newTabIndex = 2;
                  setMainTabIndex(newTabIndex);
                  setLoadingTab(newTabIndex);
                  startTransition(() => {
                    setTimeout(() => setLoadingTab(null), 150);
                  });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "var(--mantine-font-size-sm)",
                  fontWeight: mainTabIndex === 2 ? 600 : 400,
                  color: mainTabIndex === 2 ? interactive.primary : mode.text.secondary,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  borderBottom: mainTabIndex === 2 ? `2px solid ${interactive.primary}` : "2px solid transparent",
                  marginBottom: "-2px",
                }}
                data-active={mainTabIndex === 2 || undefined}
              >
                <Group gap={[8, 12]}>
                  <BookOpen size={14} />
                  <Text size={["sm", "md"]}>Journal</Text>
                  {journalTasks.length > 0 && (
                    <Badge color="orange" radius="xl" size={["xs", "sm"]}>
                      {journalTasks.length}
                    </Badge>
                  )}
                </Group>
              </Anchor>
              <Anchor
                href="#"
                onClick={event => {
                  event.preventDefault();
                  const newTabIndex = 3;
                  setMainTabIndex(newTabIndex);
                  setLoadingTab(newTabIndex);
                  startTransition(() => {
                    setTimeout(() => setLoadingTab(null), 150);
                  });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "var(--mantine-font-size-sm)",
                  fontWeight: mainTabIndex === 3 ? 600 : 400,
                  color: mainTabIndex === 3 ? interactive.primary : mode.text.secondary,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  borderBottom: mainTabIndex === 3 ? `2px solid ${interactive.primary}` : "2px solid transparent",
                  marginBottom: "-2px",
                }}
                data-active={mainTabIndex === 3 || undefined}
              >
                <Group gap={[8, 12]}>
                  <StickyNote size={14} />
                  <Text size={["sm", "md"]}>Notes</Text>
                  {noteTasks.length > 0 && (
                    <Badge color="purple" radius="xl" size={["xs", "sm"]}>
                      {noteTasks.length}
                    </Badge>
                  )}
                </Group>
              </Anchor>
              <Anchor
                href="#"
                onClick={event => {
                  event.preventDefault();
                  const newTabIndex = 4;
                  setMainTabIndex(newTabIndex);
                  setLoadingTab(newTabIndex);
                  startTransition(() => {
                    setTimeout(() => setLoadingTab(null), 150);
                  });
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "var(--mantine-font-size-sm)",
                  fontWeight: mainTabIndex === 4 ? 600 : 400,
                  color: mainTabIndex === 4 ? interactive.primary : mode.text.secondary,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  borderBottom: mainTabIndex === 4 ? `2px solid ${interactive.primary}` : "2px solid transparent",
                  marginBottom: "-2px",
                }}
                data-active={mainTabIndex === 4 || undefined}
              >
                <Group gap={[8, 12]}>
                  <Clock size={14} />
                  <Text size={["sm", "md"]}>History</Text>
                </Group>
              </Anchor>
            </Group>
          </Box>

          {/* View toggles and calendar nav - only show in Tasks tab, hide on mobile */}
          {mainTabIndex === 0 && !isMobile && (
            <Box style={{ marginTop: 16 }}>
              <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
                <Group gap={8}>
                  <Box style={{ position: "relative" }}>
                    <Button
                      size="sm"
                      variant={backlogOpen ? "filled" : "outline"}
                      color={backlogOpen ? "blue" : "gray"}
                      onClick={() => dispatch(setBacklogOpen(!backlogOpen))}
                    >
                      <List size={14} stroke="currentColor" />
                      Backlog
                    </Button>
                    {backlogTasks.length > 0 && (
                      <Badge
                        style={{
                          position: "absolute",
                          top: "-4px",
                          right: "-4px",
                          background: mode.status.error,
                          color: "white",
                          fontSize: "var(--mantine-font-size-xs)",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {backlogTasks.length}
                      </Badge>
                    )}
                  </Box>
                  <Button
                    size="sm"
                    variant={showDashboard ? "filled" : "outline"}
                    color={showDashboard ? "blue" : "gray"}
                    onClick={() => dispatch(setShowDashboard(!showDashboard))}
                  >
                    <LayoutDashboard size={14} stroke="currentColor" />
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={showCalendar ? "filled" : "outline"}
                    color={showCalendar ? "blue" : "gray"}
                    onClick={() => dispatch(setShowCalendar(!showCalendar))}
                  >
                    <Calendar size={14} stroke="currentColor" />
                    Calendar
                  </Button>
                </Group>
              </Flex>

              {/* Progress bar */}
              {showDashboard && (
                <Box>
                  <Flex
                    justify="space-between"
                    style={{ fontSize: "var(--mantine-font-size-sm)", color: mutedText, marginBottom: 4 }}
                  >
                    <Text>
                      {viewDate && viewDate.toDateString() === today.toDateString()
                        ? "Today's Progress"
                        : `${viewDate?.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })} Progress`}
                    </Text>
                    <Text>
                      {completedTasks}/{totalTasks} ({completedPercent}%)
                    </Text>
                  </Flex>
                  <Box
                    style={{
                      height: 8,
                      background: progressBarBg,
                      borderRadius: "9999px",
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                    }}
                  >
                    {/* Completed segment */}
                    {completedPercent > 0 && (
                      <Box
                        style={{
                          height: "100%",
                          background: `linear-gradient(to right, ${colorMode === "dark" ? "#48BB78" : "#38A169"}, ${colorMode === "dark" ? "#4299E1" : "#3182CE"})`,
                          transition: "width 0.3s ease-in-out",
                          width: `${completedPercent}%`,
                        }}
                      />
                    )}
                    {/* Not completed segment */}
                    {notCompletedPercent > 0 && (
                      <Box
                        style={{
                          height: "100%",
                          background: `linear-gradient(to right, ${colorMode === "dark" ? "#E53E3E" : "#C53030"}, ${colorMode === "dark" ? "#FC8181" : "#E53E3E"})`,
                          transition: "width 0.3s ease-in-out",
                          width: `${notCompletedPercent}%`,
                        }}
                      />
                    )}
                    {/* Unchecked segment - translucent background */}
                    {uncheckedPercent > 0 && (
                      <Box
                        style={{
                          height: "100%",
                          background: progressBarBg,
                          opacity: 0.5,
                          transition: "width 0.3s ease-in-out",
                          width: `${uncheckedPercent}%`,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Main content with DndContext */}
      <DndContext
        sensors={dragAndDrop.sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={dragAndDrop.handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndNew}
      >
        <Box
          component="main"
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {showMobileLayout ? (
            /* ========== MOBILE LAYOUT ========== */
            <>
              {/* Mobile Tab Bar - Only show for Tasks tab */}
              {mainTabIndex === 0 && (
                <Box
                  style={{
                    display: "flex",
                    borderBottom: `1px solid ${borderColor}`,
                    background: headerBg,
                    flexShrink: 0,
                  }}
                >
                  <Button
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      borderBottom: mobileActiveView === "backlog" ? `2px solid ${interactive.primary}` : "0",
                      color: mobileActiveView === "backlog" ? interactive.primary : textColor,
                      paddingTop: 8,
                      paddingBottom: 8,
                      position: "relative",
                      fontSize: "var(--mantine-font-size-sm)",
                    }}
                    variant="subtle"
                    onClick={() => dispatch(setMobileActiveView("backlog"))}
                  >
                    <Group gap={4}>
                      <List size={14} />
                      <Text>Backlog</Text>
                      {backlogTasks.length > 0 && (
                        <Badge
                          color="red"
                          radius="xl"
                          size="xs"
                          style={{ paddingLeft: 6, paddingRight: 6, paddingTop: 0, paddingBottom: 0 }}
                        >
                          {backlogTasks.length}
                        </Badge>
                      )}
                    </Group>
                  </Button>
                  <Button
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      borderBottom: mobileActiveView === "today" ? `2px solid ${interactive.primary}` : "0",
                      color: mobileActiveView === "today" ? interactive.primary : textColor,
                      paddingTop: 8,
                      paddingBottom: 8,
                      fontSize: "var(--mantine-font-size-sm)",
                    }}
                    variant="subtle"
                    onClick={() => setMobileActiveView("today")}
                  >
                    <Group gap={4}>
                      <LayoutDashboard size={14} />
                      <Text>Today</Text>
                    </Group>
                  </Button>
                  <Button
                    style={{
                      flex: 1,
                      borderRadius: 0,
                      borderBottom: mobileActiveView === "calendar" ? "2px solid var(--mantine-color-blue-5)" : "0",
                      color: mobileActiveView === "calendar" ? "var(--mantine-color-blue-5)" : textColor,
                      paddingTop: 8,
                      paddingBottom: 8,
                      fontSize: "var(--mantine-font-size-sm)",
                    }}
                    variant="subtle"
                    onClick={() => setMobileActiveView("calendar")}
                  >
                    <Group gap={4}>
                      <Calendar size={16} />
                      <Text>Calendar</Text>
                    </Group>
                  </Button>
                </Box>
              )}

              {/* Mobile Content Area */}
              <Box style={{ flex: 1, overflow: "hidden" }}>
                {/* Kanban Tab - Mobile */}
                {(mainTabIndex === 1 || loadingTab === 1) && (
                  <Box style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {loadingTab === 1 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <KanbanView createDraggableId={createDraggableId} />
                    )}
                  </Box>
                )}

                {/* Journal Tab - Mobile */}
                {(mainTabIndex === 2 || loadingTab === 2) && (
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 2 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <JournalView
                        tasks={tasks}
                        tags={tags}
                        completions={completions}
                        getCompletionForDate={getCompletionForDate}
                        createCompletion={createCompletion}
                        updateCompletion={updateCompletion}
                        deleteCompletion={deleteCompletion}
                        updateTask={updateTask}
                      />
                    )}
                  </Box>
                )}

                {/* Notes Tab - Mobile */}
                {(mainTabIndex === 3 || loadingTab === 3) && (
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 3 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <NotesView
                        notes={noteTasks}
                        onCreateNote={() => {
                          createTask({
                            title: "Untitled Note",
                            sectionId: sections[0]?.id,
                            completionType: "note",
                            content: "",
                          });
                        }}
                        onDeleteNote={taskId => {
                          deleteTask(taskId);
                        }}
                        onUpdateNote={async (taskId, updates) => {
                          await updateTask(taskId, updates);
                        }}
                        sidebarOpen={notesSidebarOpen}
                        sidebarWidth={notesSidebarWidth}
                        onSidebarToggle={() => dispatch(setNotesSidebarOpen(!notesSidebarOpen))}
                        onSidebarResize={width => dispatch(setNotesSidebarWidth(width))}
                        noteListOpen={notesListOpen}
                        noteListWidth={notesListWidth}
                        onNoteListToggle={() => dispatch(setNotesListOpen(!notesListOpen))}
                        onNoteListResize={width => dispatch(setNotesListWidth(width))}
                      />
                    )}
                  </Box>
                )}

                {/* History Tab - Mobile */}
                {(mainTabIndex === 4 || loadingTab === 4) && (
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 4 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <RecurringTableView
                        tasks={tasks}
                        sections={sections}
                        completions={completions}
                        createCompletion={createCompletion}
                        deleteCompletion={deleteCompletion}
                        updateCompletion={updateCompletion}
                        getCompletionForDate={getCompletionForDate}
                        updateTask={updateTask}
                        onEdit={taskOps.handleEditTask}
                        onEditWorkout={taskOps.handleEditWorkout}
                        onDuplicate={taskOps.handleDuplicateTask}
                        onDelete={taskOps.handleDeleteTask}
                        tags={tags}
                        onTagsChange={taskOps.handleTaskTagsChange}
                        onCreateTag={createTag}
                      />
                    )}
                  </Box>
                )}

                {/* Tasks Tab - Mobile */}
                {(mainTabIndex === 0 || loadingTab === 0) && (
                  <>
                    {loadingTab === 0 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <>
                        {mobileActiveView === "backlog" && (
                          <Box style={{ height: "100%", overflow: "auto" }}>
                            {isLoading ? <BacklogSkeleton /> : <BacklogDrawer createDraggableId={createDraggableId} />}
                          </Box>
                        )}

                        {mobileActiveView === "today" && (
                          <Box
                            style={{
                              height: "100%",
                              overflow: "auto",
                              paddingLeft: 12,
                              paddingRight: 12,
                              paddingTop: 12,
                              paddingBottom: 12,
                            }}
                          >
                            {/* Mobile Today View - Progress bar */}
                            <Box style={{ marginBottom: 12 }}>
                              <Flex
                                justify="space-between"
                                style={{ fontSize: "var(--mantine-font-size-xs)", color: mutedText, marginBottom: 4 }}
                              >
                                <Text>
                                  {viewDate && viewDate.toDateString() === today.toDateString()
                                    ? "Today's Progress"
                                    : `${viewDate?.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                      })} Progress`}
                                </Text>
                                <Text>
                                  {completedTasks}/{totalTasks} ({completedPercent}%)
                                </Text>
                              </Flex>
                              <Box
                                style={{
                                  height: 8,
                                  background: progressBarBg,
                                  borderRadius: "9999px",
                                  overflow: "hidden",
                                  position: "relative",
                                  display: "flex",
                                }}
                              >
                                {/* Completed segment */}
                                {completedPercent > 0 && (
                                  <Box
                                    style={{
                                      height: "100%",
                                      background: `linear-gradient(to right, ${colorMode === "dark" ? "#48BB78" : "#38A169"}, ${colorMode === "dark" ? "#4299E1" : "#3182CE"})`,
                                      transition: "width 0.3s ease-in-out",
                                      width: `${completedPercent}%`,
                                    }}
                                  />
                                )}
                                {/* Not completed segment */}
                                {notCompletedPercent > 0 && (
                                  <Box
                                    style={{
                                      height: "100%",
                                      background: `linear-gradient(to right, ${colorMode === "dark" ? "#E53E3E" : "#C53030"}, ${colorMode === "dark" ? "#FC8181" : "#E53E3E"})`,
                                      transition: "width 0.3s ease-in-out",
                                      width: `${notCompletedPercent}%`,
                                    }}
                                  />
                                )}
                                {/* Unchecked segment - translucent background */}
                                {uncheckedPercent > 0 && (
                                  <Box
                                    style={{
                                      height: "100%",
                                      background: progressBarBg,
                                      opacity: 0.5,
                                      transition: "width 0.3s ease-in-out",
                                      width: `${uncheckedPercent}%`,
                                    }}
                                  />
                                )}
                              </Box>
                            </Box>

                            {/* Today View Header */}
                            <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
                              <Title size="sm">Today</Title>
                              <Group gap={4}>
                                <Badge
                                  color="blue"
                                  size="xs"
                                  style={{ paddingLeft: 6, paddingRight: 6, paddingTop: 0, paddingBottom: 0 }}
                                >
                                  {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                                </Badge>
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                  aria-label={showCompletedTasks ? "Hide Completed" : "Show Completed"}
                                  style={{
                                    minWidth: "24px",
                                    height: "24px",
                                    padding: 0,
                                  }}
                                >
                                  {showCompletedTasks ? <Eye size={14} /> : <EyeOff size={14} />}
                                </ActionIcon>
                              </Group>
                            </Flex>

                            {/* Date Navigation for Today View */}
                            {todayViewDate && (
                              <DateNavigation
                                selectedDate={todayViewDate}
                                onDateChange={handleTodayViewDateChange}
                                onPrevious={() => navigateTodayView(-1)}
                                onNext={() => navigateTodayView(1)}
                                onToday={handleTodayViewToday}
                              />
                            )}

                            {/* Search */}
                            <Box style={{ marginTop: 8, marginBottom: 8 }}>
                              <Group gap={4} align="center" style={{ width: "100%" }}>
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                  <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                </Box>
                                <TagFilter
                                  tags={tags}
                                  selectedTagIds={todaySelectedTagIds}
                                  onTagSelect={viewState.handleTodayTagSelect}
                                  onTagDeselect={viewState.handleTodayTagDeselect}
                                  onCreateTag={createTag}
                                />
                              </Group>
                            </Box>

                            {/* Sections */}
                            <Section createDroppableId={createDroppableId} createDraggableId={createDraggableId} />
                          </Box>
                        )}

                        {mobileActiveView === "calendar" && (
                          <Box style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                            {/* Mobile Calendar Controls */}
                            <Box
                              style={{
                                padding: 8,
                                borderBottom: `1px solid ${borderColor}`,
                                background: headerBg,
                              }}
                            >
                              <DateNavigation
                                selectedDate={selectedDate}
                                onDateChange={date => {
                                  const d = new Date(date);
                                  d.setHours(0, 0, 0, 0);
                                  viewState.setSelectedDate(d);
                                }}
                                onPrevious={() => navigateCalendar(-1)}
                                onNext={() => navigateCalendar(1)}
                                onToday={() => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  viewState.setSelectedDate(today);
                                }}
                                title={getCalendarTitle()}
                                showDatePicker={false}
                                showDateDisplay={false}
                                showViewSelector={true}
                                viewData={calendarViewData}
                                selectedView={calendarView}
                                onViewChange={value => setCalendarView(value)}
                                viewSelectorWidth={20}
                              />
                              {/* Search and Tag Filter */}
                              <Box
                                style={{
                                  paddingLeft: 8,
                                  paddingRight: 8,
                                  paddingTop: 8,
                                  paddingBottom: 8,
                                  width: "100%",
                                  maxWidth: "100%",
                                }}
                              >
                                <Group gap={4} align="center" style={{ width: "100%", maxWidth: "100%" }}>
                                  <Box style={{ flex: 1, minWidth: 0 }}>
                                    <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                  </Box>
                                  <TagFilter
                                    tags={tags}
                                    selectedTagIds={calendarSelectedTagIds}
                                    onTagSelect={viewState.handleCalendarTagSelect}
                                    onTagDeselect={viewState.handleCalendarTagDeselect}
                                    onCreateTag={createTag}
                                  />
                                </Group>
                              </Box>
                            </Box>

                            {/* Calendar View */}
                            <Box
                              style={{
                                flex: 1,
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                minHeight: 0,
                              }}
                            >
                              {(() => {
                                // Filter tasks based on recurring preference for current view
                                let filteredTasks = showRecurringTasks[calendarView]
                                  ? tasks
                                  : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

                                // Filter by search term
                                if (calendarSearchTerm.trim()) {
                                  const lowerSearch = calendarSearchTerm.toLowerCase();
                                  filteredTasks = filteredTasks.filter(task =>
                                    task.title.toLowerCase().includes(lowerSearch)
                                  );
                                }

                                // Filter by tags
                                if (calendarSelectedTagIds.length > 0) {
                                  filteredTasks = filteredTasks.filter(task =>
                                    task.tags?.some(tag => calendarSelectedTagIds.includes(tag.id))
                                  );
                                }

                                // Filter tasks based on completed preference for current view
                                if (
                                  !showCompletedTasksCalendar[calendarView] &&
                                  calendarView === "day" &&
                                  selectedDate
                                ) {
                                  filteredTasks = filteredTasks.filter(task => {
                                    const isCompleted = isCompletedOnDate(task.id, selectedDate);
                                    const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, selectedDate) : null;
                                    const hasOutcome = outcome !== null && outcome !== undefined;
                                    return !isCompleted && !hasOutcome;
                                  });
                                }

                                return (
                                  <>
                                    {calendarView === "day" && selectedDate && (
                                      <CalendarDayView
                                        date={selectedDate}
                                        createDroppableId={createDroppableId}
                                        createDraggableId={createDraggableId}
                                        onDropTimeChange={time => {
                                          dragAndDrop.dropTimeRef.current = time;
                                        }}
                                      />
                                    )}
                                    {calendarView === "week" && selectedDate && (
                                      <CalendarWeekView
                                        date={selectedDate}
                                        createDroppableId={createDroppableId}
                                        createDraggableId={createDraggableId}
                                        onDropTimeChange={time => {
                                          dragAndDrop.dropTimeRef.current = time;
                                        }}
                                      />
                                    )}
                                    {calendarView === "month" && selectedDate && (
                                      <CalendarMonthView date={selectedDate} />
                                    )}
                                    {calendarView === "year" && selectedDate && (
                                      <CalendarYearView
                                        date={selectedDate}
                                        tasks={filteredTasks}
                                        onDayClick={d => {
                                          viewState.setSelectedDate(d);
                                          setCalendarView("day");
                                        }}
                                        isCompletedOnDate={isCompletedOnDate}
                                        getOutcomeOnDate={getOutcomeOnDate}
                                        showCompleted={showCompletedTasksCalendar.year}
                                        zoom={calendarZoom.year}
                                        onEdit={taskOps.handleEditTask}
                                        onEditWorkout={taskOps.handleEditWorkout}
                                        onOutcomeChange={completionHandlers.handleOutcomeChange}
                                        onDuplicate={taskOps.handleDuplicateTask}
                                        onDelete={taskOps.handleDeleteTask}
                                      />
                                    )}
                                  </>
                                );
                              })()}
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </>
                )}
              </Box>
            </>
          ) : (
            /* ========== DESKTOP LAYOUT (existing code) ========== */
            <Box style={{ display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden" }}>
              <Box
                style={{
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                  overflow: mainTabIndex === 2 || mainTabIndex === 3 ? "hidden" : "auto",
                }}
              >
                {mainTabIndex === 1 || loadingTab === 1 ? (
                  /* Kanban Tab Content */
                  <Box
                    style={{
                      height: "100%",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      paddingLeft: 16,
                      paddingRight: 16,
                      paddingTop: 24,
                      paddingBottom: 24,
                    }}
                  >
                    {loadingTab === 1 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <KanbanView createDraggableId={createDraggableId} />
                    )}
                  </Box>
                ) : mainTabIndex === 2 || loadingTab === 2 ? (
                  /* Journal Tab Content */
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 2 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <JournalView
                        tasks={tasks}
                        tags={tags}
                        completions={completions}
                        getCompletionForDate={getCompletionForDate}
                        createCompletion={createCompletion}
                        updateCompletion={updateCompletion}
                        deleteCompletion={deleteCompletion}
                        updateTask={updateTask}
                      />
                    )}
                  </Box>
                ) : mainTabIndex === 3 || loadingTab === 3 ? (
                  /* Notes Tab Content */
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 3 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <NotesView
                        notes={noteTasks}
                        onCreateNote={() => {
                          // Create a new note task
                          createTask({
                            title: "Untitled Note",
                            sectionId: sections[0]?.id,
                            completionType: "note",
                            content: "",
                          });
                        }}
                        onDeleteNote={taskId => {
                          deleteTask(taskId);
                        }}
                        onUpdateNote={async (taskId, updates) => {
                          await updateTask(taskId, updates);
                        }}
                        sidebarOpen={notesSidebarOpen}
                        sidebarWidth={notesSidebarWidth}
                        onSidebarToggle={() => dispatch(setNotesSidebarOpen(!notesSidebarOpen))}
                        onSidebarResize={width => dispatch(setNotesSidebarWidth(width))}
                        noteListOpen={notesListOpen}
                        noteListWidth={notesListWidth}
                        onNoteListToggle={() => dispatch(setNotesListOpen(!notesListOpen))}
                        onNoteListResize={width => dispatch(setNotesListWidth(width))}
                      />
                    )}
                  </Box>
                ) : mainTabIndex === 4 || loadingTab === 4 ? (
                  /* History Tab Content */
                  <Box style={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 4 ? (
                      <Box style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <RecurringTableView
                        tasks={tasks}
                        sections={sections}
                        completions={completions}
                        createCompletion={createCompletion}
                        deleteCompletion={deleteCompletion}
                        updateCompletion={updateCompletion}
                        getCompletionForDate={getCompletionForDate}
                        updateTask={updateTask}
                        onEdit={taskOps.handleEditTask}
                        onEditWorkout={taskOps.handleEditWorkout}
                        onDuplicate={taskOps.handleDuplicateTask}
                        onDelete={taskOps.handleDeleteTask}
                        tags={tags}
                        onTagsChange={taskOps.handleTaskTagsChange}
                        onCreateTag={createTag}
                      />
                    )}
                  </Box>
                ) : mainTabIndex === 0 || loadingTab === 0 ? (
                  /* Tasks Tab Content */
                  loadingTab === 0 ? (
                    <Box
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LoadingSpinner size="xl" />
                    </Box>
                  ) : (
                    <Box
                      style={{ width: "100%", height: "100%", display: "flex", maxWidth: "100%", overflow: "hidden" }}
                    >
                      {/* Backlog Section - only show on Tasks tab */}
                      {mainTabIndex === 0 && (
                        <Box
                          style={{
                            width: backlogOpen ? `${resizeHandlers.backlogWidth}px` : "0px",
                            height: "100%",
                            transition:
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                                ? "none"
                                : "width 0.3s ease-in-out",
                            willChange:
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "width" : "auto",
                            overflow: "hidden",
                            borderRight: backlogOpen ? `1px solid ${borderColor}` : "0px",
                            background: bgColor,
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: "column",
                            position: "relative",
                          }}
                        >
                          {backlogOpen && (
                            <>
                              {isLoading ? (
                                <BacklogSkeleton />
                              ) : (
                                <BacklogDrawer createDraggableId={createDraggableId} />
                              )}
                              {/* Resize handle between backlog and today */}
                              <Box
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: "4px",
                                  cursor: "col-resize",
                                  background:
                                    resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                                      ? "var(--mantine-color-blue-4)"
                                      : "transparent",
                                  transition: "background-color 0.2s",
                                  zIndex: 10,
                                  userSelect: "none",
                                  touchAction: "none",
                                }}
                                onMouseDown={resizeHandlers.handleBacklogResizeStart}
                                onTouchStart={resizeHandlers.handleBacklogResizeStart}
                                onMouseEnter={e => {
                                  if (!(resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog")) {
                                    e.currentTarget.style.background = "var(--mantine-color-blue-3)";
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!(resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog")) {
                                    e.currentTarget.style.background = "transparent";
                                  }
                                }}
                                visibleFrom="md"
                              />
                            </>
                          )}
                        </Box>
                      )}

                      {/* Today and Calendar Section */}
                      <Box
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "row",
                          height: "100%",
                          minHeight: 0,
                          minWidth: 0,
                        }}
                      >
                        {/* Today View */}
                        {showDashboard && (
                          <>
                            <Box
                              style={{
                                width: showCalendar ? `${resizeHandlers.todayViewWidth}px` : "100%",
                                height: "100%",
                                transition:
                                  resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                    ? "none"
                                    : "width 0.3s",
                                willChange:
                                  resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? "width" : "auto",
                                overflow: "hidden",
                                borderRight: showCalendar ? `1px solid ${borderColor}` : "0",
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                                position: "relative",
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 24,
                                paddingBottom: 24,
                              }}
                            >
                              {isLoading && sections.length === 0 ? (
                                <Box>
                                  <SectionSkeleton />
                                  <SectionSkeleton />
                                  <SectionSkeleton />
                                </Box>
                              ) : (
                                <>
                                  {/* Today View Header - Sticky */}
                                  <Box
                                    style={{
                                      position: "sticky",
                                      top: 0,
                                      zIndex: 10,
                                      background: bgColor,
                                      marginBottom: 16,
                                      paddingBottom: 16,
                                      borderBottom: `1px solid ${borderColor}`,
                                      flexShrink: 0,
                                      width: "100%",
                                      maxWidth: "100%",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <Flex
                                      align="center"
                                      justify="space-between"
                                      style={{ marginBottom: 8, width: "100%", maxWidth: "100%" }}
                                      gap={8}
                                    >
                                      <Title size="md" style={{ flexShrink: 0 }}>
                                        Today
                                      </Title>
                                      <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                                        <Badge color="blue">
                                          {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                                          {todaySearchTerm &&
                                            filteredTodaysTasks.length !== todaysTasks.length &&
                                            ` of ${todaysTasks.length}`}
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="subtle"
                                          onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                          style={{
                                            fontSize: "var(--mantine-font-size-sm)",
                                            color: mutedText,
                                          }}
                                          onMouseEnter={e => {
                                            e.currentTarget.style.color = textColor;
                                          }}
                                          onMouseLeave={e => {
                                            e.currentTarget.style.color = mutedText;
                                          }}
                                        >
                                          {showCompletedTasks ? (
                                            <Eye size={16} stroke="currentColor" />
                                          ) : (
                                            <EyeOff size={16} stroke="currentColor" />
                                          )}
                                          {showCompletedTasks ? "Hide Completed" : "Show Completed"}
                                        </Button>
                                      </Flex>
                                    </Flex>
                                    {todayViewDate && (
                                      <DateNavigation
                                        selectedDate={todayViewDate}
                                        onDateChange={handleTodayViewDateChange}
                                        onPrevious={() => navigateTodayView(-1)}
                                        onNext={() => navigateTodayView(1)}
                                        onToday={handleTodayViewToday}
                                      />
                                    )}
                                    <Box style={{ marginTop: 12, width: "100%", maxWidth: "100%" }}>
                                      <Group gap={[8, 16]} align="center" style={{ width: "100%", maxWidth: "100%" }}>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                          <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                        </Box>
                                        <TagFilter
                                          tags={tags}
                                          selectedTagIds={todaySelectedTagIds}
                                          onTagSelect={viewState.handleTodayTagSelect}
                                          onTagDeselect={viewState.handleTodayTagDeselect}
                                          onCreateTag={createTag}
                                        />
                                      </Group>
                                    </Box>
                                  </Box>
                                  {/* Scrollable Sections Container */}
                                  <Box
                                    ref={todayScrollContainerRefCallback}
                                    style={{
                                      flex: 1,
                                      overflowY: "auto",
                                      minHeight: 0,
                                      width: "100%",
                                      maxWidth: "100%",
                                    }}
                                  >
                                    <Section
                                      createDroppableId={createDroppableId}
                                      createDraggableId={createDraggableId}
                                    />
                                  </Box>
                                </>
                              )}
                              {/* Resize handle between today and calendar */}
                              {showCalendar && (
                                <Box
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: "4px",
                                    cursor: "col-resize",
                                    background:
                                      resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                        ? "var(--mantine-color-blue-4)"
                                        : "transparent",
                                    transition: "background-color 0.2s",
                                    zIndex: 10,
                                    userSelect: "none",
                                    touchAction: "none",
                                  }}
                                  onMouseDown={resizeHandlers.handleTodayResizeStart}
                                  onTouchStart={resizeHandlers.handleTodayResizeStart}
                                  onMouseEnter={e => {
                                    if (!(resizeHandlers.isResizing && resizeHandlers.resizeType === "today")) {
                                      e.currentTarget.style.background = "var(--mantine-color-blue-3)";
                                    }
                                  }}
                                  onMouseLeave={e => {
                                    if (!(resizeHandlers.isResizing && resizeHandlers.resizeType === "today")) {
                                      e.currentTarget.style.background = "transparent";
                                    }
                                  }}
                                  visibleFrom="md"
                                />
                              )}
                            </Box>
                          </>
                        )}

                        {/* Calendar View */}
                        {showCalendar && (
                          <Box
                            style={{
                              flex: 1,
                              minWidth: 0,
                              width: "auto",
                              maxWidth: "100%",
                              display: "flex",
                              flexDirection: "column",
                              overflow: "hidden",
                              height: "100%",
                            }}
                          >
                            {/* Calendar Header */}
                            <Box
                              style={{
                                marginBottom: 16,
                                paddingBottom: 16,
                                borderBottom: `1px solid ${borderColor}`,
                                paddingLeft: 16,
                                paddingRight: 16,
                                paddingTop: 24,
                                width: "100%",
                                maxWidth: "100%",
                                overflow: "hidden",
                                flexShrink: 0,
                              }}
                            >
                              <Flex
                                align="center"
                                justify="space-between"
                                style={{ marginBottom: 8, width: "100%", maxWidth: "100%" }}
                                gap={8}
                              >
                                <Title size="md" style={{ flexShrink: 0 }}>
                                  Calendar
                                </Title>
                                <Group gap={8} style={{ flexShrink: 0 }}>
                                  <Group gap={4}>
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      onClick={() => {
                                        setCalendarZoom(prev => ({
                                          ...prev,
                                          [calendarView]: Math.max(0.25, prev[calendarView] - 0.25),
                                        }));
                                      }}
                                      aria-label="Zoom Out"
                                      style={{
                                        fontSize: "var(--mantine-font-size-sm)",
                                        color: mutedText,
                                      }}
                                      disabled={calendarZoom[calendarView] <= 0.25}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.color = textColor;
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.color = mutedText;
                                      }}
                                    >
                                      <ZoomOut size={14} stroke="currentColor" />
                                    </ActionIcon>
                                    <Text size="xs" c={mutedText} style={{ minWidth: "40px", textAlign: "center" }}>
                                      {Math.round(calendarZoom[calendarView] * 100)}%
                                    </Text>
                                    <ActionIcon
                                      size="sm"
                                      variant="subtle"
                                      onClick={() => {
                                        setCalendarZoom(prev => ({
                                          ...prev,
                                          [calendarView]: Math.min(3.0, prev[calendarView] + 0.25),
                                        }));
                                      }}
                                      aria-label="Zoom In"
                                      style={{
                                        fontSize: "var(--mantine-font-size-sm)",
                                        color: mutedText,
                                      }}
                                      disabled={calendarZoom[calendarView] >= 3.0}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.color = textColor;
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.color = mutedText;
                                      }}
                                    >
                                      <ZoomIn size={14} stroke="currentColor" />
                                    </ActionIcon>
                                  </Group>
                                  <Button
                                    size="sm"
                                    variant="subtle"
                                    onClick={() => {
                                      setShowCompletedTasksCalendar(prev => ({
                                        ...prev,
                                        [calendarView]: !prev[calendarView],
                                      }));
                                    }}
                                    style={{
                                      fontSize: "var(--mantine-font-size-sm)",
                                      color: mutedText,
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.color = textColor;
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.color = mutedText;
                                    }}
                                  >
                                    {showCompletedTasksCalendar[calendarView] ? (
                                      <Eye size={14} stroke="currentColor" />
                                    ) : (
                                      <EyeOff size={14} stroke="currentColor" />
                                    )}
                                    {showCompletedTasksCalendar[calendarView] ? "Hide Completed" : "Show Completed"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="subtle"
                                    onClick={() => {
                                      setShowRecurringTasks(prev => ({
                                        ...prev,
                                        [calendarView]: !prev[calendarView],
                                      }));
                                    }}
                                    style={{
                                      fontSize: "var(--mantine-font-size-sm)",
                                      color: mutedText,
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.color = textColor;
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.color = mutedText;
                                    }}
                                  >
                                    {showRecurringTasks[calendarView] ? (
                                      <Repeat size={14} stroke="currentColor" />
                                    ) : (
                                      <X size={14} stroke="currentColor" />
                                    )}
                                    {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
                                  </Button>
                                </Group>
                              </Flex>
                              {/* Calendar Controls */}
                              <DateNavigation
                                selectedDate={selectedDate}
                                onDateChange={date => {
                                  const d = new Date(date);
                                  d.setHours(0, 0, 0, 0);
                                  viewState.setSelectedDate(d);
                                }}
                                onPrevious={() => navigateCalendar(-1)}
                                onNext={() => navigateCalendar(1)}
                                onToday={() => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  viewState.setSelectedDate(today);
                                }}
                                title={getCalendarTitle()}
                                showDatePicker={false}
                                showDateDisplay={false}
                                showViewSelector={true}
                                viewData={calendarViewData}
                                selectedView={calendarView}
                                onViewChange={value => setCalendarView(value)}
                                viewSelectorWidth={24}
                              />
                              {/* Search and Tag Filter */}
                              <Box style={{ marginTop: 12, width: "100%", maxWidth: "100%" }}>
                                <Group gap={[8, 16]} align="center" style={{ width: "100%", maxWidth: "100%" }}>
                                  <Box style={{ flex: 1, minWidth: 0 }}>
                                    <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                  </Box>
                                  <TagFilter
                                    tags={tags}
                                    selectedTagIds={calendarSelectedTagIds}
                                    onTagSelect={viewState.handleCalendarTagSelect}
                                    onTagDeselect={viewState.handleCalendarTagDeselect}
                                    onCreateTag={createTag}
                                  />
                                </Group>
                              </Box>
                            </Box>
                            {isLoading && !selectedDate ? (
                              <CalendarSkeleton />
                            ) : (
                              <>
                                {/* Calendar content */}
                                <Box
                                  style={{
                                    flex: 1,
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                    height: "100%",
                                  }}
                                >
                                  {(() => {
                                    // Filter tasks based on recurring preference for current view
                                    let filteredTasks = showRecurringTasks[calendarView]
                                      ? tasks
                                      : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

                                    // Filter by search term
                                    if (calendarSearchTerm.trim()) {
                                      const lowerSearch = calendarSearchTerm.toLowerCase();
                                      filteredTasks = filteredTasks.filter(task =>
                                        task.title.toLowerCase().includes(lowerSearch)
                                      );
                                    }

                                    // Filter by tags
                                    if (calendarSelectedTagIds.length > 0) {
                                      filteredTasks = filteredTasks.filter(task =>
                                        task.tags?.some(tag => calendarSelectedTagIds.includes(tag.id))
                                      );
                                    }

                                    // Filter tasks based on completed preference for current view
                                    // For day view, filter here. For week/month views, filter per day in components
                                    if (
                                      !showCompletedTasksCalendar[calendarView] &&
                                      calendarView === "day" &&
                                      selectedDate
                                    ) {
                                      filteredTasks = filteredTasks.filter(task => {
                                        const isCompleted = isCompletedOnDate(task.id, selectedDate);
                                        const outcome = getOutcomeOnDate
                                          ? getOutcomeOnDate(task.id, selectedDate)
                                          : null;
                                        const hasOutcome = outcome !== null && outcome !== undefined;
                                        return !isCompleted && !hasOutcome;
                                      });
                                    }

                                    return (
                                      <>
                                        {calendarView === "day" && selectedDate && (
                                          <CalendarDayView
                                            date={selectedDate}
                                            createDroppableId={createDroppableId}
                                            createDraggableId={createDraggableId}
                                            onDropTimeChange={time => {
                                              dragAndDrop.dropTimeRef.current = time;
                                            }}
                                          />
                                        )}
                                        {calendarView === "week" && selectedDate && (
                                          <CalendarWeekView
                                            date={selectedDate}
                                            createDroppableId={createDroppableId}
                                            createDraggableId={createDraggableId}
                                            onDropTimeChange={time => {
                                              dragAndDrop.dropTimeRef.current = time;
                                            }}
                                          />
                                        )}
                                        {calendarView === "month" && selectedDate && (
                                          <CalendarMonthView date={selectedDate} />
                                        )}
                                        {calendarView === "year" && selectedDate && (
                                          <CalendarYearView
                                            date={selectedDate}
                                            tasks={filteredTasks}
                                            onDayClick={d => {
                                              viewState.setSelectedDate(d);
                                              setCalendarView("day");
                                            }}
                                            isCompletedOnDate={isCompletedOnDate}
                                            getOutcomeOnDate={getOutcomeOnDate}
                                            showCompleted={showCompletedTasksCalendar.year}
                                            zoom={calendarZoom.year}
                                            onEdit={taskOps.handleEditTask}
                                            onEditWorkout={taskOps.handleEditWorkout}
                                            onOutcomeChange={completionHandlers.handleOutcomeChange}
                                            onDuplicate={taskOps.handleDuplicateTask}
                                            onDelete={taskOps.handleDeleteTask}
                                          />
                                        )}
                                      </>
                                    );
                                  })()}
                                </Box>
                              </>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )
                ) : null}
              </Box>
            </Box>
          )}
        </Box>

        {/* Drag Overlay - dynamically offset based on click position */}
        <DragOverlay
          dropAnimation={null}
          style={{
            cursor: "grabbing",
            marginLeft: `${dragAndDrop.dragState.offset.x}px`,
            marginTop: `${dragAndDrop.dragState.offset.y}px`,
          }}
        >
          {dragAndDrop.dragState.activeTask ? (
            <Box
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: "var(--mantine-radius-lg)",
                background: dragOverlayBg,
                borderWidth: "2px",
                borderColor: dragOverlayBorder,
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                width: "180px",
                height: "40px",
                opacity: 0.9,
                transform: "rotate(2deg)",
              }}
            >
              <Text size="sm" fw={600} c={dragOverlayText} truncate="end">
                {dragAndDrop.dragState.activeTask.title}
              </Text>
            </Box>
          ) : dragAndDrop.dragState.activeId?.startsWith("section-") ? (
            <Box
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 12,
                paddingBottom: 12,
                borderRadius: "var(--mantine-radius-lg)",
                background: dragOverlayBg,
                borderWidth: "2px",
                borderColor: dragOverlayBorder,
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                opacity: 0.9,
              }}
            >
              <Text size="sm" fw={600} c={dragOverlayText}>
                {(() => {
                  const sectionId = dragAndDrop.dragState.activeId?.replace("section-", "");
                  return sectionsById.get(sectionId)?.name || "Section";
                })()}
              </Text>
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <TaskDialog
        isOpen={dialogState.taskDialogOpen}
        onClose={() => {
          dialogState.closeTaskDialog();
          dialogState.setEditingTask(null);
          dialogState.setDefaultSectionId(null);
          dialogState.setDefaultTime(null);
          dialogState.setDefaultDate(null);
        }}
        task={dialogState.editingTask}
        sections={sections}
        onSave={taskOps.handleSaveTask}
        defaultSectionId={dialogState.defaultSectionId}
        defaultTime={dialogState.defaultTime}
        defaultDate={dialogState.defaultDate}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        allTasks={tasks}
      />
      <SectionDialog
        isOpen={dialogState.sectionDialogOpen}
        onClose={() => {
          dialogState.closeSectionDialog();
          dialogState.setEditingSection(null);
        }}
        section={dialogState.editingSection}
        onSave={handleSaveSection}
      />
      <TagEditor
        isOpen={dialogState.tagEditorOpen}
        onClose={() => dialogState.setTagEditorOpen(false)}
        tags={tags}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />
      <BulkEditDialog
        isOpen={selectionState.bulkEditDialogOpen}
        onClose={() => {
          selectionState.setBulkEditDialogOpen(false);
        }}
        onSave={selectionState.handleBulkEditSave}
        sections={sections}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        selectedCount={selectionState.selectedTaskIds.size}
        selectedTasks={selectedTasksForBulkEdit}
      />
      <WorkoutModal
        task={dialogState.workoutModalTask}
        isOpen={dialogState.workoutModalOpen}
        onClose={() => {
          dialogState.setWorkoutModalOpen(false);
          dialogState.setWorkoutModalTask(null);
        }}
        onCompleteTask={async (taskId, date) => {
          // When workout is 100% complete, create a TaskCompletion record
          await createCompletion(taskId, date, {
            outcome: "completed",
          });
        }}
        currentDate={viewDate}
      />
      <WorkoutBuilder
        key={dialogState.editingWorkoutTask?.id || "new"}
        isOpen={Boolean(dialogState.editingWorkoutTask)}
        onClose={() => dialogState.setEditingWorkoutTask(null)}
        taskId={dialogState.editingWorkoutTask?.id}
        onSaveComplete={() => {
          dialogState.setEditingWorkoutTask(null);
          // Refresh tasks to get updated workout program status
          fetchTasks(true);
        }}
      />
      <OfflineIndicator />
    </Box>
  );
}

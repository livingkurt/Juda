"use client";

import { useEffect, useCallback, useMemo, startTransition, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  Badge,
  Chip,
  Tabs,
  Tab,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useColorMode } from "@/hooks/useColorMode";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { AuthPage } from "@/components/AuthPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeSelector } from "@/components/ThemeSelector";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { DndContext, DragOverlay, pointerWithin, closestCenter } from "@dnd-kit/core";
import {
  CalendarToday as Calendar,
  Dashboard as LayoutDashboard,
  List,
  LightMode as Sun,
  WbTwilight as Sunset,
  DarkMode as Moon,
  Visibility as Eye,
  VisibilityOff as EyeOff,
  Repeat,
  Close as X,
  ZoomIn,
  ZoomOut,
  Logout as LogOut,
  Note as StickyNote,
  CheckBox as CheckSquare,
  AccessTime as Clock,
  ViewColumn as Columns,
  MenuBook as BookOpen,
  Label,
} from "@mui/icons-material";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
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
import dynamic from "next/dynamic";

// Lazy load heavy components that aren't immediately visible
const BulkEditDialog = dynamic(
  () => import("@/components/BulkEditDialog").then(mod => ({ default: mod.BulkEditDialog })),
  {
    loading: () => (
      <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    ),
    ssr: false,
  }
);

const TagEditor = dynamic(() => import("@/components/TagEditor").then(mod => ({ default: mod.TagEditor })), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const WorkoutModal = dynamic(() => import("@/components/WorkoutModal"), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const WorkoutBuilder = dynamic(() => import("@/components/WorkoutBuilder"), {
  loading: () => (
    <Box sx={{ p: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

const calendarViews = [
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
  const theme = useTheme();
  const { mode: colorMode, toggleColorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { isAuthenticated, loading: authLoading, initialized: authInitialized, logout } = useAuth();

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
  const [reorderTaskMutation] = useReorderTaskMutation();
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
        // Use the proper reorder endpoint which handles reordering all tasks in the section
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
      sx={{
        height: { xs: "auto", md: "100vh" },
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "auto", md: "hidden" },
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Header */}
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: { xs: 1, md: 0 },
          p: { xs: 1, md: 2 },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={{ xs: 2, md: 3 }}>
            <Box component="span" sx={{ color: "primary.main" }}>
              <GreetingIcon fontSize="medium" sx={{ color: "currentColor" }} />
            </Box>
            <Box>
              <Typography variant={isMobile ? "h6" : "h5"} fontWeight={600}>
                {greeting.text}
              </Typography>
              <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
            <IconButton
              onClick={() => dialogState.setTagEditorOpen(true)}
              size={isMobile ? "small" : "medium"}
              aria-label="Manage tags"
            >
              <Label fontSize="small" sx={{ color: "currentColor" }} />
            </IconButton>
            <ThemeSelector />
            <IconButton
              onClick={toggleColorMode}
              size={isMobile ? "small" : "medium"}
              aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {colorMode === "dark" ? (
                <Sun fontSize="small" sx={{ color: "currentColor" }} />
              ) : (
                <Moon fontSize="small" sx={{ color: "currentColor" }} />
              )}
            </IconButton>
            <IconButton onClick={logout} size={isMobile ? "small" : "medium"} aria-label="Logout" color="error">
              <LogOut fontSize="small" sx={{ color: "currentColor" }} />
            </IconButton>
            <SyncStatusIndicator />
          </Stack>
        </Stack>

        {/* Main Tabs */}
        <Box>
          <Tabs
            value={mainTabIndex}
            onChange={(e, newValue) => {
              setMainTabIndex(newValue);
              setLoadingTab(newValue);
              startTransition(() => {
                setTimeout(() => setLoadingTab(null), 150);
              });
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<CheckSquare fontSize="small" />}
              iconPosition="start"
              label="Tasks"
              sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
            />
            <Tab
              icon={<Columns fontSize="small" />}
              iconPosition="start"
              label="Kanban"
              sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
            />
            <Tab
              icon={<BookOpen fontSize="small" />}
              iconPosition="start"
              label={
                <Box
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}
                >
                  <Box component="span" sx={{ mr: 1 }}>
                    Journal
                  </Box>
                  {journalTasks.length > 0 && (
                    <Badge
                      badgeContent={journalTasks.length}
                      color="warning"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: { xs: "0.625rem", md: "0.75rem" },
                          height: { xs: 16, md: 18 },
                          minWidth: { xs: 16, md: 18 },
                        },
                      }}
                    />
                  )}
                </Box>
              }
              sx={{
                fontSize: { xs: "0.875rem", md: "1rem" },
                minHeight: { xs: 48, md: 64 },
                "& .MuiTab-wrapper": {
                  width: "100%",
                },
              }}
            />
            <Tab
              icon={<StickyNote fontSize="small" />}
              iconPosition="start"
              label={
                <Box
                  sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 1 }}
                >
                  <Box component="span" sx={{ mr: 1 }}>
                    Notes
                  </Box>
                  {noteTasks.length > 0 && (
                    <Badge
                      badgeContent={noteTasks.length}
                      color="secondary"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: { xs: "0.625rem", md: "0.75rem" },
                          height: { xs: 16, md: 18 },
                          minWidth: { xs: 16, md: 18 },
                        },
                      }}
                    />
                  )}
                </Box>
              }
              sx={{
                fontSize: { xs: "0.875rem", md: "1rem" },
                minHeight: { xs: 48, md: 64 },
                "& .MuiTab-wrapper": {
                  width: "100%",
                },
              }}
            />
            <Tab
              icon={<Clock fontSize="small" />}
              iconPosition="start"
              label="History"
              sx={{ fontSize: { xs: "0.875rem", md: "1rem" }, minHeight: { xs: 48, md: 64 } }}
            />
          </Tabs>
        </Box>

        {/* View toggles and calendar nav - only show in Tasks tab, hide on mobile */}
        {mainTabIndex === 0 && !isMobile && (
          <Box sx={{ mt: 4 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ position: "relative" }}>
                  <Button
                    size="small"
                    variant={backlogOpen ? "contained" : "outlined"}
                    color={backlogOpen ? "primary" : "inherit"}
                    onClick={() => dispatch(setBacklogOpen(!backlogOpen))}
                    startIcon={<List fontSize="small" />}
                  >
                    Backlog
                  </Button>
                  {backlogTasks.length > 0 && (
                    <Badge
                      badgeContent={backlogTasks.length}
                      color="error"
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        "& .MuiBadge-badge": {
                          fontSize: "0.625rem",
                          height: 20,
                          minWidth: 20,
                        },
                      }}
                    />
                  )}
                </Box>
                <Button
                  size="small"
                  variant={showDashboard ? "contained" : "outlined"}
                  color={showDashboard ? "primary" : "inherit"}
                  onClick={() => dispatch(setShowDashboard(!showDashboard))}
                  startIcon={<LayoutDashboard fontSize="small" />}
                >
                  Today
                </Button>
                <Button
                  size="small"
                  variant={showCalendar ? "contained" : "outlined"}
                  color={showCalendar ? "primary" : "inherit"}
                  onClick={() => dispatch(setShowCalendar(!showCalendar))}
                  startIcon={<Calendar fontSize="small" />}
                >
                  Calendar
                </Button>
              </Stack>
            </Stack>

            {/* Progress bar */}
            {showDashboard && (
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {viewDate && viewDate.toDateString() === today.toDateString()
                      ? "Today's Progress"
                      : `${viewDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })} Progress`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completedTasks}/{totalTasks} ({completedPercent}%)
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    height: 8,
                    bgcolor: "action.disabledBackground",
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
                        background:
                          colorMode === "dark"
                            ? "linear-gradient(to right, #48BB78, #4299E1)"
                            : "linear-gradient(to right, #38A169, #3182CE)",
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
                        background:
                          colorMode === "dark"
                            ? "linear-gradient(to right, #E53E3E, #FC8181)"
                            : "linear-gradient(to right, #C53030, #E53E3E)",
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
                        bgcolor: "action.disabledBackground",
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
          sx={{
            flex: 1,
            overflow: { xs: "visible", md: "hidden" },
            display: "flex",
            flexDirection: "column",
          }}
        >
          {showMobileLayout ? (
            <>
              {/* ========== MOBILE LAYOUT ========== */}
              {/* Mobile Tab Bar - Only show for Tasks tab */}
              {mainTabIndex === 0 && (
                <Box
                  sx={{
                    display: "flex",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    flexShrink: 0,
                  }}
                >
                  <Button
                    sx={{ flex: 1, borderRadius: 0, py: 2 }}
                    variant="text"
                    onClick={() => dispatch(setMobileActiveView("backlog"))}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <List fontSize="small" />
                      <Typography variant="body2">Backlog</Typography>
                      {backlogTasks.length > 0 && (
                        <Badge
                          badgeContent={backlogTasks.length}
                          color="error"
                          sx={{
                            "& .MuiBadge-badge": {
                              fontSize: "0.625rem",
                              height: "16px",
                              minWidth: "16px",
                              px: 0.5,
                            },
                          }}
                        />
                      )}
                    </Stack>
                  </Button>
                  <Button
                    sx={{
                      flex: 1,
                      borderRadius: 0,
                      py: 2,
                      borderBottom: mobileActiveView === "today" ? "2px solid" : "none",
                      borderBottomColor: "primary.main",
                      color: mobileActiveView === "today" ? "primary.main" : "text.primary",
                    }}
                    variant="text"
                    onClick={() => setMobileActiveView("today")}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LayoutDashboard fontSize="small" />
                      <Typography variant="body2">Today</Typography>
                    </Stack>
                  </Button>
                  <Button
                    sx={{
                      flex: 1,
                      borderRadius: 0,
                      py: 2,
                      borderBottom: mobileActiveView === "calendar" ? "2px solid" : "none",
                      borderBottomColor: "primary.main",
                      color: mobileActiveView === "calendar" ? "primary.main" : "text.primary",
                    }}
                    variant="text"
                    onClick={() => setMobileActiveView("calendar")}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Calendar fontSize="small" />
                      <Typography variant="body2">Calendar</Typography>
                    </Stack>
                  </Button>
                </Box>
              )}

              {/* Mobile Content Area */}
              <Box sx={{ flex: 1, overflow: "hidden" }}>
                {/* Kanban Tab - Mobile */}
                {(mainTabIndex === 1 || loadingTab === 1) && (
                  <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                    {loadingTab === 1 ? (
                      <Box h="100%" display="flex" alignItems="center" justifyContent="center">
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <KanbanView createDraggableId={createDraggableId} />
                    )}
                  </Box>
                )}

                {/* Journal Tab - Mobile */}
                {(mainTabIndex === 2 || loadingTab === 2) && (
                  <Box h="100%" overflow="hidden">
                    {loadingTab === 2 ? (
                      <Box h="100%" display="flex" alignItems="center" justifyContent="center">
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
                  <Box sx={{ height: "100%", overflow: "hidden" }}>
                    {loadingTab === 3 ? (
                      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  <Box h="100%" overflow="hidden">
                    {loadingTab === 4 ? (
                      <Box h="100%" display="flex" alignItems="center" justifyContent="center">
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
                      <Box h="100%" display="flex" alignItems="center" justifyContent="center">
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <>
                        {mobileActiveView === "backlog" && (
                          <Box h="100%" overflow="auto">
                            {isLoading ? <BacklogSkeleton /> : <BacklogDrawer createDraggableId={createDraggableId} />}
                          </Box>
                        )}

                        {mobileActiveView === "today" && (
                          <Box h="100%" overflow="auto" px={3} py={3}>
                            {/* Mobile Today View - Progress bar */}
                            <Box mb={3}>
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

                            {/* Today View Header */}
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                              <Typography variant="h6">Today</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  label={`${filteredTodaysTasks.length} task${filteredTodaysTasks.length !== 1 ? "s" : ""}`}
                                  size="small"
                                  color="primary"
                                />
                                <IconButton
                                  size="small"
                                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                  aria-label={showCompletedTasks ? "Hide Completed" : "Show Completed"}
                                  sx={{ minWidth: "24px", height: "24px", p: 0 }}
                                >
                                  {showCompletedTasks ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                                </IconButton>
                              </Stack>
                            </Box>

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
                            <Box sx={{ my: 2 }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                </Box>
                                <TagFilter
                                  tags={tags}
                                  selectedTagIds={todaySelectedTagIds}
                                  onTagSelect={viewState.handleTodayTagSelect}
                                  onTagDeselect={viewState.handleTodayTagDeselect}
                                  onCreateTag={createTag}
                                />
                              </Stack>
                            </Box>

                            {/* Sections */}
                            <Section createDroppableId={createDroppableId} createDraggableId={createDraggableId} />
                          </Box>
                        )}

                        {mobileActiveView === "calendar" && (
                          <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                            {/* Mobile Calendar Controls */}
                            <Box
                              sx={{
                                p: 2,
                                borderBottom: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
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
                                viewCollection={calendarViews}
                                selectedView={calendarView}
                                onViewChange={value => setCalendarView(value)}
                                viewSelectorWidth={20}
                              />
                              {/* Search and Tag Filter */}
                              <Box sx={{ px: 2, py: 2, width: "100%", maxWidth: "100%" }}>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  sx={{ width: "100%", maxWidth: "100%" }}
                                >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                  </Box>
                                  <TagFilter
                                    tags={tags}
                                    selectedTagIds={calendarSelectedTagIds}
                                    onTagSelect={viewState.handleCalendarTagSelect}
                                    onTagDeselect={viewState.handleCalendarTagDeselect}
                                    onCreateTag={createTag}
                                  />
                                </Stack>
                              </Box>
                            </Box>

                            {/* Calendar View */}
                            <Box
                              sx={{
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
            <Box display="flex" flex={1} sx={{ height: "100%", minHeight: 0 }} overflow="hidden">
              {/* ========== DESKTOP LAYOUT (existing code) ========== */}
              <Box
                flex={1}
                sx={{ minHeight: 0, height: "100%" }}
                overflow={mainTabIndex === 2 || mainTabIndex === 3 ? "hidden" : "auto"}
              >
                {mainTabIndex === 1 || loadingTab === 1 ? (
                  <>
                    {/* Kanban Tab Content */}
                    <Box
                      h="100%"
                      overflow="hidden"
                      display="flex"
                      flexDirection="column"
                      px={{ base: 2, md: 4 }}
                      py={{ base: 3, md: 6 }}
                    >
                      {loadingTab === 1 ? (
                        <Box h="100%" display="flex" alignItems="center" justifyContent="center">
                          <LoadingSpinner size="xl" />
                        </Box>
                      ) : (
                        <KanbanView createDraggableId={createDraggableId} />
                      )}
                    </Box>
                  </>
                ) : mainTabIndex === 2 || loadingTab === 2 ? (
                  <>
                    {/* Journal Tab Content */}
                    <Box h="100%" overflow="hidden">
                      {loadingTab === 2 ? (
                        <Box h="100%" display="flex" alignItems="center" justifyContent="center">
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
                  </>
                ) : mainTabIndex === 3 || loadingTab === 3 ? (
                  <>
                    {/* Notes Tab Content */}
                    <Box sx={{ height: "100%", overflow: "hidden" }}>
                      {loadingTab === 3 ? (
                        <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  </>
                ) : mainTabIndex === 4 || loadingTab === 4 ? (
                  <>
                    {/* History Tab Content */}
                    <Box h="100%" overflow="hidden">
                      {loadingTab === 4 ? (
                        <Box h="100%" display="flex" alignItems="center" justifyContent="center">
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
                  </>
                ) : mainTabIndex === 0 || loadingTab === 0 ? (
                  <>
                    {/* Tasks Tab Content */}
                    {loadingTab === 0 ? (
                      <Box w="full" h="full" display="flex" alignItems="center" justifyContent="center">
                        <LoadingSpinner size="xl" />
                      </Box>
                    ) : (
                      <Box sx={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
                        {/* Backlog Section - only show on Tasks tab */}
                        {mainTabIndex === 0 && (
                          <Box
                            sx={{
                              width: backlogOpen ? `${resizeHandlers.backlogWidth}px` : "0px",
                              height: "100%",
                              transition:
                                resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                                  ? "none"
                                  : "width 0.3s ease-in-out",
                              willChange:
                                resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "width" : "auto",
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
                            {backlogOpen && (
                              <>
                                {isLoading ? (
                                  <BacklogSkeleton />
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
                              </>
                            )}
                          </Box>
                        )}

                        {/* Today and Calendar Section */}
                        <Box
                          sx={{
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
                                sx={{
                                  width: showCalendar ? `${resizeHandlers.todayViewWidth}px` : "100%",
                                  height: "100%",
                                  transition:
                                    resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                      ? "none"
                                      : "width 0.3s",
                                  willChange:
                                    resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                      ? "width"
                                      : "auto",
                                  overflow: "hidden",
                                  borderRight: showCalendar ? "1px solid" : "none",
                                  borderColor: "divider",
                                  flexShrink: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  position: "relative",
                                  p: { xs: 1, md: 2 },
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
                                      sx={{
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 10,
                                        bgcolor: "background.default",
                                        mb: 2,
                                        pb: 2,
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                        flexShrink: 0,
                                        width: "100%",
                                        maxWidth: "100%",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          mb: 2,
                                          width: "100%",
                                          maxWidth: "100%",
                                          gap: 2,
                                        }}
                                      >
                                        <Typography variant="h6" sx={{ flexShrink: 0 }}>
                                          Today
                                        </Typography>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                          <Chip
                                            label={`${filteredTodaysTasks.length} task${
                                              filteredTodaysTasks.length !== 1 ? "s" : ""
                                            }${
                                              todaySearchTerm && filteredTodaysTasks.length !== todaysTasks.length
                                                ? ` of ${todaysTasks.length}`
                                                : ""
                                            }`}
                                            size="small"
                                            color="primary"
                                          />
                                          <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                            sx={{
                                              fontSize: "0.875rem",
                                              color: "text.secondary",
                                              "&:hover": { color: "text.primary" },
                                            }}
                                          >
                                            <Box
                                              component="span"
                                              sx={{
                                                color: "currentColor",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.5,
                                              }}
                                            >
                                              {showCompletedTasks ? (
                                                <Eye fontSize="small" />
                                              ) : (
                                                <EyeOff fontSize="small" />
                                              )}
                                              {showCompletedTasks ? "Hide Completed" : "Show Completed"}
                                            </Box>
                                          </Button>
                                        </Box>
                                      </Box>
                                      {todayViewDate && (
                                        <Box sx={{ mb: 2 }}>
                                          <DateNavigation
                                            selectedDate={todayViewDate}
                                            onDateChange={handleTodayViewDateChange}
                                            onPrevious={() => navigateTodayView(-1)}
                                            onNext={() => navigateTodayView(1)}
                                            onToday={handleTodayViewToday}
                                          />
                                        </Box>
                                      )}
                                      <Box sx={{ width: "100%", maxWidth: "100%" }}>
                                        <Stack
                                          direction="row"
                                          spacing={{ xs: 2, md: 4 }}
                                          alignItems="center"
                                          sx={{ width: "100%", maxWidth: "100%" }}
                                        >
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                          </Box>
                                          <TagFilter
                                            tags={tags}
                                            selectedTagIds={todaySelectedTagIds}
                                            onTagSelect={viewState.handleTodayTagSelect}
                                            onTagDeselect={viewState.handleTodayTagDeselect}
                                            onCreateTag={createTag}
                                          />
                                        </Stack>
                                      </Box>
                                    </Box>
                                    {/* Scrollable Sections Container */}
                                    <Box
                                      ref={todayScrollContainerRefCallback}
                                      sx={{
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
                                    onMouseDown={resizeHandlers.handleTodayResizeStart}
                                    onTouchStart={resizeHandlers.handleTodayResizeStart}
                                    sx={{
                                      position: "absolute",
                                      right: 0,
                                      top: 0,
                                      bottom: 0,
                                      width: { md: "12px", lg: "4px" },
                                      cursor: "col-resize",
                                      bgcolor:
                                        resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
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
                                )}
                              </Box>
                            </>
                          )}

                          {/* Calendar View */}
                          {showCalendar && (
                            <Box
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                width: "auto",
                                maxWidth: "100%",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                height: "100%",
                                p: { xs: 1, md: 2 },
                              }}
                            >
                              {/* Calendar Header */}
                              <Box
                                sx={{
                                  mb: 2,
                                  pb: 2,
                                  borderBottom: "1px solid",
                                  borderColor: "divider",
                                  width: "100%",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mb: 2,
                                    width: "100%",
                                    maxWidth: "100%",
                                    gap: 2,
                                  }}
                                >
                                  <Typography variant="h6" sx={{ flexShrink: 0 }}>
                                    Calendar
                                  </Typography>
                                  <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setCalendarZoom(prev => ({
                                            ...prev,
                                            [calendarView]: Math.max(0.25, prev[calendarView] - 0.25),
                                          }));
                                        }}
                                        aria-label="Zoom Out"
                                        disabled={calendarZoom[calendarView] <= 0.25}
                                        sx={{
                                          fontSize: "0.875rem",
                                          color: "text.secondary",
                                          "&:hover": { color: "text.primary" },
                                        }}
                                      >
                                        <ZoomOut fontSize="small" />
                                      </IconButton>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: "text.secondary",
                                          minWidth: "40px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {Math.round(calendarZoom[calendarView] * 100)}%
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setCalendarZoom(prev => ({
                                            ...prev,
                                            [calendarView]: Math.min(3.0, prev[calendarView] + 0.25),
                                          }));
                                        }}
                                        aria-label="Zoom In"
                                        disabled={calendarZoom[calendarView] >= 3.0}
                                        sx={{
                                          fontSize: "0.875rem",
                                          color: "text.secondary",
                                          "&:hover": { color: "text.primary" },
                                        }}
                                      >
                                        <ZoomIn fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => {
                                        setShowCompletedTasksCalendar(prev => ({
                                          ...prev,
                                          [calendarView]: !prev[calendarView],
                                        }));
                                      }}
                                      sx={{
                                        fontSize: "0.875rem",
                                        color: "text.secondary",
                                        "&:hover": { color: "text.primary" },
                                      }}
                                    >
                                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        {showCompletedTasksCalendar[calendarView] ? (
                                          <Eye fontSize="small" />
                                        ) : (
                                          <EyeOff fontSize="small" />
                                        )}
                                        {showCompletedTasksCalendar[calendarView] ? "Hide Completed" : "Show Completed"}
                                      </Box>
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => {
                                        setShowRecurringTasks(prev => ({
                                          ...prev,
                                          [calendarView]: !prev[calendarView],
                                        }));
                                      }}
                                      sx={{
                                        fontSize: "0.875rem",
                                        color: "text.secondary",
                                        "&:hover": { color: "text.primary" },
                                      }}
                                    >
                                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        {showRecurringTasks[calendarView] ? (
                                          <Repeat fontSize="small" />
                                        ) : (
                                          <X fontSize="small" />
                                        )}
                                        {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
                                      </Box>
                                    </Button>
                                  </Stack>
                                </Box>
                                {/* Calendar Controls */}
                                <Box sx={{ mb: 2 }}>
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
                                    viewCollection={calendarViews}
                                    selectedView={calendarView}
                                    onViewChange={value => setCalendarView(value)}
                                    viewSelectorWidth={24}
                                  />
                                </Box>
                                {/* Search and Tag Filter */}
                                <Box sx={{ width: "100%", maxWidth: "100%" }}>
                                  <Stack
                                    direction="row"
                                    spacing={{ xs: 2, md: 4 }}
                                    alignItems="center"
                                    sx={{ width: "100%", maxWidth: "100%" }}
                                  >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                    </Box>
                                    <TagFilter
                                      tags={tags}
                                      selectedTagIds={calendarSelectedTagIds}
                                      onTagSelect={viewState.handleCalendarTagSelect}
                                      onTagDeselect={viewState.handleCalendarTagDeselect}
                                      onCreateTag={createTag}
                                    />
                                  </Stack>
                                </Box>
                              </Box>
                              {isLoading && !selectedDate ? (
                                <CalendarSkeleton />
                              ) : (
                                <>
                                  {/* Calendar content */}
                                  <Box
                                    sx={{
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
                    )}
                  </>
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
              sx={{
                px: 4,
                py: 2,
                borderRadius: "lg",
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "primary.main",
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                width: "180px",
                height: "40px",
                opacity: 0.9,
                transform: "rotate(2deg)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {dragAndDrop.dragState.activeTask.title}
              </Typography>
            </Box>
          ) : dragAndDrop.dragState.activeId?.startsWith("section-") ? (
            <Box
              sx={{
                px: 4,
                py: 3,
                borderRadius: "lg",
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "primary.main",
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                opacity: 0.9,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                {(() => {
                  const sectionId = dragAndDrop.dragState.activeId?.replace("section-", "");
                  return sectionsById.get(sectionId)?.name || "Section";
                })()}
              </Typography>
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

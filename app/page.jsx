"use client";

import { useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Select,
  Portal,
  HStack,
  Text,
  Flex,
  IconButton,
  Heading,
  Badge,
  Tabs,
  createListCollection,
} from "@chakra-ui/react";
import { useAuth } from "@/hooks/useAuth";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useToast } from "@/hooks/useToast";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { AuthPage } from "@/components/AuthPage";
import { OfflineIndicator } from "@/components/OfflineIndicator";
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
import { KanbanView } from "@/components/KanbanView";
import { PageSkeleton, SectionSkeleton, BacklogSkeleton, CalendarSkeleton } from "@/components/Skeletons";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { NotesView } from "@/components/NotesView";
import { Tag as TagIcon } from "lucide-react";
import { SelectDropdown } from "@/components/SelectDropdown";
import dynamic from "next/dynamic";
import { Spinner, Center } from "@chakra-ui/react";

// Lazy load heavy components that aren't immediately visible
const BulkEditDialog = dynamic(
  () => import("@/components/BulkEditDialog").then(mod => ({ default: mod.BulkEditDialog })),
  {
    loading: () => (
      <Center p={8}>
        <Spinner size="lg" />
      </Center>
    ),
    ssr: false,
  }
);

const TagEditor = dynamic(() => import("@/components/TagEditor").then(mod => ({ default: mod.TagEditor })), {
  loading: () => (
    <Center p={8}>
      <Spinner size="lg" />
    </Center>
  ),
  ssr: false,
});

const WorkoutModal = dynamic(() => import("@/components/WorkoutModal"), {
  loading: () => (
    <Center p={8}>
      <Spinner size="lg" />
    </Center>
  ),
  ssr: false,
});

const WorkoutBuilder = dynamic(() => import("@/components/WorkoutBuilder"), {
  loading: () => (
    <Center p={8}>
      <Spinner size="lg" />
    </Center>
  ),
  ssr: false,
});

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

const calendarViewCollection = createListCollection({
  items: [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ],
});

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
  const { toast: _toast } = useToast();
  const { mode, interactive, dnd } = useSemanticColors();

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
  // Memoized to avoid recalculating on every render
  const { totalTasks, completedTasks, progressPercent } = useMemo(() => {
    const total = filteredTodaysTasks.length;
    const completed = filteredTodaysTasks.filter(t => {
      // Check if task is completed on the selected date via completion record
      const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
      // Also check subtasks completion
      const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
      return isCompletedOnViewDate || allSubtasksComplete;
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTasks: total, completedTasks: completed, progressPercent: percent };
  }, [filteredTodaysTasks, isCompletedOnDate, viewDate]);

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
      h={{ base: "auto", md: "100vh" }}
      minH="100vh"
      display="flex"
      flexDirection="column"
      overflow={{ base: "auto", md: "hidden" }}
      bg={bgColor}
      color={textColor}
    >
      {/* Header */}
      <Box as="header" bg={headerBg} borderBottomWidth="1px" borderColor={borderColor} flexShrink={{ base: 1, md: 0 }}>
        <Box w="full" px={{ base: 3, md: 4 }} py={{ base: 2, md: 4 }}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={{ base: 2, md: 3 }}>
              <Box as="span" color={mode.status.warning}>
                <GreetingIcon size={20} stroke="currentColor" />
              </Box>
              <Box>
                <Heading as="h1" size={{ base: "md", md: "lg" }} fontWeight="semibold">
                  {greeting.text}
                </Heading>
                <Text fontSize={{ base: "xs", md: "sm" }} color={mutedText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </Box>
            </Flex>
            <HStack spacing={{ base: 1, md: 2 }}>
              <IconButton
                onClick={() => dialogState.setTagEditorOpen(true)}
                variant="ghost"
                size={{ base: "xs", md: "md" }}
                aria-label="Manage tags"
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  <TagIcon size={16} stroke="currentColor" />
                </Box>
              </IconButton>
              <IconButton
                onClick={toggleColorMode}
                variant="ghost"
                size={{ base: "xs", md: "md" }}
                aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  {colorMode === "dark" ? (
                    <Sun size={16} stroke="currentColor" />
                  ) : (
                    <Moon size={16} stroke="currentColor" />
                  )}
                </Box>
              </IconButton>
              <IconButton
                onClick={logout}
                variant="ghost"
                colorPalette="red"
                size={{ base: "xs", md: "md" }}
                aria-label="Logout"
                minW={{ base: "28px", md: "40px" }}
                h={{ base: "28px", md: "40px" }}
                p={{ base: 0, md: 2 }}
              >
                <Box as="span" color="currentColor">
                  <LogOut size={16} stroke="currentColor" />
                </Box>
              </IconButton>
            </HStack>
          </Flex>

          {/* Main Tabs */}
          <Box mt={{ base: 2, md: 4 }}>
            <Tabs.Root
              value={mainTabIndex.toString()}
              onValueChange={({ value }) => setMainTabIndex(parseInt(value))}
              variant="line"
            >
              <Tabs.List>
                <Tabs.Trigger
                  value="0"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <CheckSquare size={14} />
                    <Text>Tasks</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="1"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <Columns size={14} />
                    <Text>Kanban</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="2"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <StickyNote size={14} />
                    <Text>Notes</Text>
                    {noteTasks.length > 0 && (
                      <Badge
                        colorScheme="purple"
                        borderRadius="full"
                        fontSize={{ base: "2xs", md: "xs" }}
                        px={{ base: 1, md: 1.5 }}
                        py={0}
                      >
                        {noteTasks.length}
                      </Badge>
                    )}
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="3"
                  fontSize={{ base: "sm", md: "md" }}
                  py={{ base: 1.5, md: 2 }}
                  px={{ base: 2, md: 3 }}
                >
                  <HStack spacing={{ base: 1, md: 2 }}>
                    <Clock size={14} />
                    <Text>History</Text>
                  </HStack>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </Box>

          {/* View toggles and calendar nav - only show in Tasks tab, hide on mobile */}
          {mainTabIndex === 0 && !isMobile && (
            <Box mt={4}>
              <Flex align="center" justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Box position="relative">
                    <Button
                      size="sm"
                      variant={backlogOpen ? "solid" : "outline"}
                      colorPalette={backlogOpen ? "blue" : "gray"}
                      onClick={() => dispatch(setBacklogOpen(!backlogOpen))}
                    >
                      <Box as="span" color="currentColor">
                        <List size={14} stroke="currentColor" />
                      </Box>
                      Backlog
                    </Button>
                    {backlogTasks.length > 0 && (
                      <Badge
                        position="absolute"
                        top="-1"
                        right="-1"
                        bg={mode.status.error}
                        color="white"
                        fontSize="xs"
                        borderRadius="full"
                        w={5}
                        h={5}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {backlogTasks.length}
                      </Badge>
                    )}
                  </Box>
                  <Button
                    size="sm"
                    variant={showDashboard ? "solid" : "outline"}
                    colorPalette={showDashboard ? "blue" : "gray"}
                    onClick={() => dispatch(setShowDashboard(!showDashboard))}
                  >
                    <Box as="span" color="currentColor">
                      <LayoutDashboard size={14} stroke="currentColor" />
                    </Box>
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={showCalendar ? "solid" : "outline"}
                    colorPalette={showCalendar ? "blue" : "gray"}
                    onClick={() => dispatch(setShowCalendar(!showCalendar))}
                  >
                    <Box as="span" color="currentColor">
                      <Calendar size={14} stroke="currentColor" />
                    </Box>
                    Calendar
                  </Button>
                </HStack>
              </Flex>

              {/* Progress bar */}
              {showDashboard && (
                <Box>
                  <Flex justify="space-between" fontSize="sm" color={mutedText} mb={1}>
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
                      {completedTasks}/{totalTasks} ({progressPercent}%)
                    </Text>
                  </Flex>
                  <Box h={2} bg={progressBarBg} borderRadius="full" overflow="hidden">
                    <Box
                      h="full"
                      bgGradient="to-r"
                      gradientFrom={colorMode === "dark" ? "#48BB78" : "#38A169"}
                      gradientTo={colorMode === "dark" ? "#4299E1" : "#3182CE"}
                      transition="width 0.3s ease-in-out"
                      width={`${progressPercent}%`}
                    />
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
        <Box as="main" flex={1} overflow={{ base: "visible", md: "hidden" }} display="flex" flexDirection="column">
          {showMobileLayout ? (
            /* ========== MOBILE LAYOUT ========== */
            <>
              {/* Mobile Tab Bar - Only show for Tasks tab */}
              {mainTabIndex === 0 && (
                <Box display="flex" borderBottomWidth="1px" borderColor={borderColor} bg={headerBg} flexShrink={0}>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "backlog" ? "2px" : "0"}
                    borderBottomColor={interactive.primary}
                    color={mobileActiveView === "backlog" ? interactive.primary : textColor}
                    onClick={() => dispatch(setMobileActiveView("backlog"))}
                    py={2}
                    position="relative"
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <List size={14} />
                      <Text>Backlog</Text>
                      {backlogTasks.length > 0 && (
                        <Badge colorPalette="red" borderRadius="full" fontSize="2xs" px={1.5} py={0}>
                          {backlogTasks.length}
                        </Badge>
                      )}
                    </HStack>
                  </Button>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "today" ? "2px" : "0"}
                    borderBottomColor={interactive.primary}
                    color={mobileActiveView === "today" ? interactive.primary : textColor}
                    onClick={() => setMobileActiveView("today")}
                    py={2}
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <LayoutDashboard size={14} />
                      <Text>Today</Text>
                    </HStack>
                  </Button>
                  <Button
                    flex={1}
                    variant="ghost"
                    borderRadius={0}
                    borderBottomWidth={mobileActiveView === "calendar" ? "2px" : "0"}
                    borderBottomColor="blue.500"
                    color={mobileActiveView === "calendar" ? "blue.500" : textColor}
                    onClick={() => setMobileActiveView("calendar")}
                    py={2}
                    fontSize="sm"
                  >
                    <HStack spacing={1}>
                      <Calendar size={16} />
                      <Text>Calendar</Text>
                    </HStack>
                  </Button>
                </Box>
              )}

              {/* Mobile Content Area */}
              <Box flex={1} overflow="hidden">
                {/* Kanban Tab - Mobile */}
                {mainTabIndex === 1 && (
                  <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                    <KanbanView createDraggableId={createDraggableId} />
                  </Box>
                )}

                {/* Notes Tab - Mobile */}
                {mainTabIndex === 2 && (
                  <Box h="100%" overflow="hidden">
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
                  </Box>
                )}

                {/* History Tab - Mobile */}
                {mainTabIndex === 3 && (
                  <Box h="100%" overflow="hidden">
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
                  </Box>
                )}

                {/* Tasks Tab - Mobile */}
                {mainTabIndex === 0 && (
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
                          <Flex justify="space-between" fontSize="xs" color={mutedText} mb={1}>
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
                              {completedTasks}/{totalTasks} ({progressPercent}%)
                            </Text>
                          </Flex>
                          <Box h={2} bg={progressBarBg} borderRadius="full" overflow="hidden">
                            <Box
                              h="full"
                              bgGradient="to-r"
                              gradientFrom="blue.500"
                              gradientTo="green.500"
                              transition="width 0.3s ease-in-out"
                              width={`${progressPercent}%`}
                            />
                          </Box>
                        </Box>

                        {/* Today View Header */}
                        <Flex align="center" justify="space-between" mb={3}>
                          <Heading size="sm">Today</Heading>
                          <HStack spacing={1}>
                            <Badge colorPalette="blue" fontSize="2xs" px={1.5} py={0}>
                              {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                            </Badge>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                              aria-label={showCompletedTasks ? "Hide Completed" : "Show Completed"}
                              minW="24px"
                              h="24px"
                              p={0}
                            >
                              {showCompletedTasks ? <Eye size={14} /> : <EyeOff size={14} />}
                            </IconButton>
                          </HStack>
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
                        <Box my={2}>
                          <HStack spacing={1} align="center" w="100%">
                            <Box flex={1} minW={0}>
                              <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                            </Box>
                            <TagFilter
                              tags={tags}
                              selectedTagIds={todaySelectedTagIds}
                              onTagSelect={viewState.handleTodayTagSelect}
                              onTagDeselect={viewState.handleTodayTagDeselect}
                              onCreateTag={createTag}
                            />
                          </HStack>
                        </Box>

                        {/* Sections */}
                        <Section createDroppableId={createDroppableId} createDraggableId={createDraggableId} />
                      </Box>
                    )}

                    {mobileActiveView === "calendar" && (
                      <Box h="100%" overflow="hidden" display="flex" flexDirection="column">
                        {/* Mobile Calendar Controls */}
                        <Box p={2} borderBottomWidth="1px" borderColor={borderColor} bg={headerBg}>
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
                            rightContent={
                              <SelectDropdown
                                collection={calendarViewCollection}
                                value={[calendarView]}
                                onValueChange={({ value }) => setCalendarView(value[0])}
                                placeholder="View"
                                size="sm"
                                w={20}
                                showIndicator={true}
                              />
                            }
                          />
                          {/* Search and Tag Filter */}
                          <Box px={2} py={2} w="100%" maxW="100%">
                            <HStack spacing={1} align="center" w="100%" maxW="100%">
                              <Box flex={1} minW={0}>
                                <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                              </Box>
                              <TagFilter
                                tags={tags}
                                selectedTagIds={calendarSelectedTagIds}
                                onTagSelect={viewState.handleCalendarTagSelect}
                                onTagDeselect={viewState.handleCalendarTagDeselect}
                                onCreateTag={createTag}
                              />
                            </HStack>
                          </Box>
                        </Box>

                        {/* Calendar View */}
                        <Box flex={1} overflow="hidden" display="flex" flexDirection="column" minH={0}>
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
                            if (!showCompletedTasksCalendar[calendarView] && calendarView === "day" && selectedDate) {
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
                                {calendarView === "month" && selectedDate && <CalendarMonthView date={selectedDate} />}
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
              </Box>
            </>
          ) : (
            /* ========== DESKTOP LAYOUT (existing code) ========== */
            <Box display="flex" flex={1} h="100%" minH={0} overflow="hidden">
              <Box flex={1} minH={0} h="100%" overflow={mainTabIndex === 2 ? "hidden" : "auto"}>
                {mainTabIndex === 1 ? (
                  /* Kanban Tab Content */
                  <Box
                    h="100%"
                    overflow="hidden"
                    display="flex"
                    flexDirection="column"
                    px={{ base: 2, md: 4 }}
                    py={{ base: 3, md: 6 }}
                  >
                    <KanbanView createDraggableId={createDraggableId} />
                  </Box>
                ) : mainTabIndex === 2 ? (
                  /* Notes Tab Content */
                  <Box h="100%" overflow="hidden">
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
                  </Box>
                ) : mainTabIndex === 3 ? (
                  /* History Tab Content */
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
                ) : (
                  /* Tasks Tab Content (mainTabIndex === 0) */
                  <Box w="full" h="full" display="flex" maxW="100%" overflow="hidden">
                    {/* Backlog Section - only show on Tasks tab */}
                    {mainTabIndex === 0 && backlogOpen && (
                      <>
                        <Box
                          w={`${resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? resizeHandlers.localBacklogWidth : backlogWidth}px`}
                          h="100%"
                          transition={
                            resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog" ? "none" : "width 0.3s"
                          }
                          overflow="hidden"
                          borderRightWidth="1px"
                          borderColor={borderColor}
                          bg={bgColor}
                          flexShrink={0}
                          display="flex"
                          flexDirection="column"
                          position="relative"
                        >
                          {isLoading ? <BacklogSkeleton /> : <BacklogDrawer createDraggableId={createDraggableId} />}
                          {/* Resize handle between backlog and today */}
                          <Box
                            position="absolute"
                            right={0}
                            top={0}
                            bottom={0}
                            w="4px"
                            cursor="col-resize"
                            bg={
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "backlog"
                                ? "blue.400"
                                : "transparent"
                            }
                            _hover={{ bg: "blue.300" }}
                            transition="background-color 0.2s"
                            onMouseDown={resizeHandlers.handleBacklogResizeStart}
                            zIndex={10}
                            sx={{ userSelect: "none" }}
                            display={{ base: "none", md: "block" }}
                          />
                        </Box>
                      </>
                    )}

                    {/* Today and Calendar Section */}
                    <Box flex={1} overflow="hidden" display="flex" flexDirection="row" h="100%" minH={0} minW={0}>
                      {/* Today View */}
                      {showDashboard && (
                        <>
                          <Box
                            w={
                              showCalendar
                                ? `${resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? resizeHandlers.localTodayViewWidth : todayViewWidth}px`
                                : "100%"
                            }
                            h="100%"
                            transition={
                              resizeHandlers.isResizing && resizeHandlers.resizeType === "today" ? "none" : "width 0.3s"
                            }
                            overflow="hidden"
                            borderRightWidth={showCalendar ? "1px" : "0"}
                            borderColor={borderColor}
                            flexShrink={0}
                            display="flex"
                            flexDirection="column"
                            position="relative"
                            px={{ base: 2, md: 4 }}
                            py={{ base: 3, md: 6 }}
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
                                  position="sticky"
                                  top={0}
                                  zIndex={10}
                                  bg={bgColor}
                                  mb={4}
                                  pb={4}
                                  borderBottomWidth="1px"
                                  borderColor={borderColor}
                                  flexShrink={0}
                                  w="100%"
                                  maxW="100%"
                                  overflow="hidden"
                                >
                                  <Flex align="center" justify="space-between" mb={2} w="100%" maxW="100%" gap={2}>
                                    <Heading size="md" flexShrink={0}>
                                      Today
                                    </Heading>
                                    <Flex align="center" gap={2} flexShrink={0}>
                                      <Badge colorPalette="blue">
                                        {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                                        {todaySearchTerm &&
                                          filteredTodaysTasks.length !== todaysTasks.length &&
                                          ` of ${todaysTasks.length}`}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                        fontSize="sm"
                                        color={mutedText}
                                        _hover={{ color: textColor }}
                                      >
                                        <Box as="span" color="currentColor">
                                          {showCompletedTasks ? (
                                            <Eye size={16} stroke="currentColor" />
                                          ) : (
                                            <EyeOff size={16} stroke="currentColor" />
                                          )}
                                        </Box>
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
                                  <Box mt={3} w="100%" maxW="100%">
                                    <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
                                      <Box flex={1} minW={0}>
                                        <TaskSearchInput onSearchChange={setTodaySearchTerm} />
                                      </Box>
                                      <TagFilter
                                        tags={tags}
                                        selectedTagIds={todaySelectedTagIds}
                                        onTagSelect={viewState.handleTodayTagSelect}
                                        onTagDeselect={viewState.handleTodayTagDeselect}
                                        onCreateTag={createTag}
                                      />
                                    </HStack>
                                  </Box>
                                </Box>
                                {/* Scrollable Sections Container */}
                                <Box
                                  ref={todayScrollContainerRefCallback}
                                  flex={1}
                                  overflowY="auto"
                                  minH={0}
                                  w="100%"
                                  maxW="100%"
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
                                position="absolute"
                                right={0}
                                top={0}
                                bottom={0}
                                w="4px"
                                cursor="col-resize"
                                bg={
                                  resizeHandlers.isResizing && resizeHandlers.resizeType === "today"
                                    ? "blue.400"
                                    : "transparent"
                                }
                                _hover={{ bg: "blue.300" }}
                                transition="background-color 0.2s"
                                onMouseDown={resizeHandlers.handleTodayResizeStart}
                                zIndex={10}
                                sx={{ userSelect: "none" }}
                                display={{ base: "none", md: "block" }}
                              />
                            )}
                          </Box>
                        </>
                      )}

                      {/* Calendar View */}
                      {showCalendar && (
                        <Box
                          flex={1}
                          minW={0}
                          w="auto"
                          maxW="100%"
                          display="flex"
                          flexDirection="column"
                          overflow="hidden"
                          h="full"
                        >
                          {/* Calendar Header */}
                          <Box
                            mb={4}
                            pb={4}
                            borderBottomWidth="1px"
                            borderColor={borderColor}
                            px={{ base: 2, md: 4 }}
                            pt={{ base: 3, md: 6 }}
                            w="100%"
                            maxW="100%"
                            overflow="hidden"
                            flexShrink={0}
                          >
                            <Flex align="center" justify="space-between" mb={2} w="100%" maxW="100%" gap={2}>
                              <Heading size="md" flexShrink={0}>
                                Calendar
                              </Heading>
                              <HStack spacing={2} flexShrink={0}>
                                <HStack spacing={1}>
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setCalendarZoom(prev => ({
                                        ...prev,
                                        [calendarView]: Math.max(0.25, prev[calendarView] - 0.25),
                                      }));
                                    }}
                                    aria-label="Zoom Out"
                                    fontSize="sm"
                                    color={mutedText}
                                    _hover={{ color: textColor }}
                                    isDisabled={calendarZoom[calendarView] <= 0.25}
                                  >
                                    <Box as="span" color="currentColor">
                                      <ZoomOut size={14} stroke="currentColor" />
                                    </Box>
                                  </IconButton>
                                  <Text fontSize="xs" color={mutedText} minW="40px" textAlign="center">
                                    {Math.round(calendarZoom[calendarView] * 100)}%
                                  </Text>
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setCalendarZoom(prev => ({
                                        ...prev,
                                        [calendarView]: Math.min(3.0, prev[calendarView] + 0.25),
                                      }));
                                    }}
                                    aria-label="Zoom In"
                                    fontSize="sm"
                                    color={mutedText}
                                    _hover={{ color: textColor }}
                                    isDisabled={calendarZoom[calendarView] >= 3.0}
                                  >
                                    <Box as="span" color="currentColor">
                                      <ZoomIn size={14} stroke="currentColor" />
                                    </Box>
                                  </IconButton>
                                </HStack>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowCompletedTasksCalendar(prev => ({
                                      ...prev,
                                      [calendarView]: !prev[calendarView],
                                    }));
                                  }}
                                  fontSize="sm"
                                  color={mutedText}
                                  _hover={{ color: textColor }}
                                >
                                  <Box as="span" color="currentColor">
                                    {showCompletedTasksCalendar[calendarView] ? (
                                      <Eye size={14} stroke="currentColor" />
                                    ) : (
                                      <EyeOff size={14} stroke="currentColor" />
                                    )}
                                  </Box>
                                  {showCompletedTasksCalendar[calendarView] ? "Hide Completed" : "Show Completed"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowRecurringTasks(prev => ({
                                      ...prev,
                                      [calendarView]: !prev[calendarView],
                                    }));
                                  }}
                                  fontSize="sm"
                                  color={mutedText}
                                  _hover={{ color: textColor }}
                                >
                                  <Box as="span" color="currentColor">
                                    {showRecurringTasks[calendarView] ? (
                                      <Repeat size={14} stroke="currentColor" />
                                    ) : (
                                      <X size={14} stroke="currentColor" />
                                    )}
                                  </Box>
                                  {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
                                </Button>
                              </HStack>
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
                              rightContent={
                                <Select.Root
                                  collection={calendarViewCollection}
                                  value={[calendarView]}
                                  onValueChange={({ value }) => setCalendarView(value[0])}
                                  size="sm"
                                  w={24}
                                >
                                  <Select.HiddenSelect />
                                  <Select.Control>
                                    <Select.Trigger>
                                      <Select.ValueText placeholder="View" />
                                    </Select.Trigger>
                                    <Select.IndicatorGroup>
                                      <Select.Indicator />
                                    </Select.IndicatorGroup>
                                  </Select.Control>
                                  <Portal>
                                    <Select.Positioner>
                                      <Select.Content>
                                        {calendarViewCollection.items.map(item => (
                                          <Select.Item item={item} key={item.value}>
                                            {item.label}
                                            <Select.ItemIndicator />
                                          </Select.Item>
                                        ))}
                                      </Select.Content>
                                    </Select.Positioner>
                                  </Portal>
                                </Select.Root>
                              }
                            />
                            {/* Search and Tag Filter */}
                            <Box mt={3} w="100%" maxW="100%">
                              <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
                                <Box flex={1} minW={0}>
                                  <TaskSearchInput onSearchChange={setCalendarSearchTerm} />
                                </Box>
                                <TagFilter
                                  tags={tags}
                                  selectedTagIds={calendarSelectedTagIds}
                                  onTagSelect={viewState.handleCalendarTagSelect}
                                  onTagDeselect={viewState.handleCalendarTagDeselect}
                                  onCreateTag={createTag}
                                />
                              </HStack>
                            </Box>
                          </Box>
                          {isLoading && !selectedDate ? (
                            <CalendarSkeleton />
                          ) : (
                            <>
                              {/* Calendar content */}
                              <Box flex={1} overflow="hidden" display="flex" flexDirection="column" minH={0} h="100%">
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
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
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
              px={4}
              py={2}
              borderRadius="lg"
              bg={dragOverlayBg}
              borderWidth="2px"
              borderColor={dragOverlayBorder}
              boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4)"
              w="180px"
              h="40px"
              opacity={0.9}
              transform="rotate(2deg)"
            >
              <Text fontSize="sm" fontWeight="semibold" color={dragOverlayText} isTruncated>
                {dragAndDrop.dragState.activeTask.title}
              </Text>
            </Box>
          ) : dragAndDrop.dragState.activeId?.startsWith("section-") ? (
            <Box
              px={4}
              py={3}
              borderRadius="lg"
              bg={dragOverlayBg}
              borderWidth="2px"
              borderColor={dragOverlayBorder}
              boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4)"
              opacity={0.9}
            >
              <Text fontSize="sm" fontWeight="semibold" color={dragOverlayText}>
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

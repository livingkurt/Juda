"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
import { AuthPage } from "@/components/AuthPage";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
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
import { BulkEditDialog } from "@/components/BulkEditDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { useTasks } from "@/hooks/useTasks";
import { useSections } from "@/hooks/useSections";
import { useCompletions } from "@/hooks/useCompletions";
import { useTags } from "@/hooks/useTags";
import {
  shouldShowOnDate,
  getGreeting,
  hasFutureDateTime,
  minutesToTime,
  snapToIncrement,
  formatLocalDate,
} from "@/lib/utils";
import { parseDroppableId, createDroppableId, createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";
import { RecurringTableView } from "@/components/RecurringTableView";
import { KanbanView } from "@/components/KanbanView";
import { PageSkeleton, SectionSkeleton, BacklogSkeleton, CalendarSkeleton } from "@/components/Skeletons";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { NotesView } from "@/components/NotesView";
import { TagEditor } from "@/components/TagEditor";
import { Tag as TagIcon } from "lucide-react";
import WorkoutModal from "@/components/WorkoutModal";
import WorkoutBuilder from "@/components/WorkoutBuilder";
import { SelectDropdown } from "@/components/SelectDropdown";

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

const calendarViewCollection = createListCollection({
  items: [
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
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
  const { toast } = useToast();
  const bgColor = { _light: "gray.50", _dark: "gray.900" };
  const headerBg = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const textColor = { _light: "gray.900", _dark: "gray.100" };
  const mutedText = { _light: "gray.500", _dark: "gray.400" };
  const progressBarBg = { _light: "gray.200", _dark: "gray.700" };
  const dragOverlayBg = { _light: "blue.100", _dark: "blue.800" };
  const dragOverlayBorder = { _light: "blue.400", _dark: "blue.500" };
  const dragOverlayText = { _light: "blue.900", _dark: "blue.100" };

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    duplicateTask,
    saveTask,
    batchReorderTasks,
    batchUpdateTasks,
    updateTagInTasks,
    removeTagFromTasks,
    refetch: fetchTasks,
    loading: tasksLoading,
  } = useTasks();
  const {
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    loading: sectionsLoading,
  } = useSections();
  const {
    completions,
    createCompletion,
    deleteCompletion,
    updateCompletion,
    batchCreateCompletions,
    batchDeleteCompletions,
    isCompletedOnDate,
    hasRecordOnDate,
    getOutcomeOnDate,
    getCompletionForDate,
    hasAnyCompletion,
    fetchCompletions,
  } = useCompletions();
  const {
    tags,
    createTag,
    updateTag: updateTagOriginal,
    deleteTag: deleteTagOriginal,
    batchUpdateTaskTags,
  } = useTags();

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

  // Destructure preferences for easier access
  const {
    showDashboard,
    showCalendar,
    showKanban: _showKanban,
    backlogOpen,
    backlogWidth,
    todayViewWidth,
    calendarView,
    calendarZoom,
    showCompletedTasks,
    showRecurringTasks,
    showCompletedTasksCalendar,
    showStatusTasks: _showStatusTasks,
    notesSidebarOpen,
    notesSidebarWidth,
    notesListOpen,
    notesListWidth,
  } = preferences;

  // Create setter functions that update preferences
  const setShowDashboard = useCallback(value => updatePreference("showDashboard", value), [updatePreference]);
  const setShowCalendar = useCallback(value => updatePreference("showCalendar", value), [updatePreference]);
  const _setShowKanban = useCallback(value => updatePreference("showKanban", value), [updatePreference]);
  const setBacklogOpen = useCallback(value => updatePreference("backlogOpen", value), [updatePreference]);
  const setBacklogWidth = useCallback(value => updatePreference("backlogWidth", value), [updatePreference]);
  const setTodayViewWidth = useCallback(value => updatePreference("todayViewWidth", value), [updatePreference]);
  const setCalendarView = useCallback(value => updatePreference("calendarView", value), [updatePreference]);

  // Reset calendarView if it was set to "kanban" (from old implementation)
  useEffect(() => {
    if (calendarView === "kanban") {
      setCalendarView("week");
    }
  }, [calendarView, setCalendarView]);
  const setShowCompletedTasks = useCallback(value => updatePreference("showCompletedTasks", value), [updatePreference]);
  const setNotesSidebarOpen = useCallback(value => updatePreference("notesSidebarOpen", value), [updatePreference]);
  const setNotesSidebarWidth = useCallback(value => updatePreference("notesSidebarWidth", value), [updatePreference]);
  const setNotesListOpen = useCallback(value => updatePreference("notesListOpen", value), [updatePreference]);
  const setNotesListWidth = useCallback(value => updatePreference("notesListWidth", value), [updatePreference]);

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

  const isLoading = tasksLoading || sectionsLoading || !prefsInitialized;

  // Detect mobile vs desktop - use client-side only to avoid SSR issues
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize state with default values (same on server and client)
  const [mainTabIndex, setMainTabIndex] = useState(0); // 0 = Tasks, 1 = Kanban, 2 = Notes, 3 = History
  const [isResizing, setIsResizing] = useState(false);
  // Mobile-specific state: which view is currently active
  // "backlog" | "today" | "calendar"
  const [mobileActiveView, setMobileActiveView] = useState("today");

  // Determine if we should show mobile layout
  const showMobileLayout = isMobile;
  // Initialize selectedDate to null, then set it in useEffect to avoid hydration mismatch
  const [selectedDate, setSelectedDate] = useState(null);
  // Initialize todayViewDate to null, then set it in useEffect to avoid hydration mismatch
  const [todayViewDate, setTodayViewDate] = useState(null);
  // Search state for Today view
  const [todaySearchTerm, setTodaySearchTerm] = useState("");
  const [todaySelectedTagIds, setTodaySelectedTagIds] = useState([]);
  // Search state for Calendar view
  const [calendarSearchTerm, setCalendarSearchTerm] = useState("");
  const [calendarSelectedTagIds, setCalendarSelectedTagIds] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [defaultSectionId, setDefaultSectionId] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [editingWorkoutTask, setEditingWorkoutTask] = useState(null);
  // Store drop time calculated from mouse position during drag
  const dropTimeRef = useRef(null);
  // Track active drag item for DragOverlay - combined into single state for performance
  const [dragState, setDragState] = useState({
    activeId: null,
    activeTask: null,
    offset: { x: 0, y: 0 },
  });
  // Track recently completed tasks that should remain visible for a delay
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
  const recentlyCompletedTimeoutsRef = useRef({});
  // Track sections that are auto-collapsed (not manually collapsed by user)
  const [autoCollapsedSections, setAutoCollapsedSections] = useState(new Set());
  // Track sections that were manually expanded after being auto-collapsed (to prevent re-collapsing)
  const [manuallyExpandedSections, setManuallyExpandedSections] = useState(new Set());

  // Set selectedDate and todayViewDate on mount to avoid hydration mismatch
  useEffect(() => {
    // Set selectedDate on mount to avoid hydration mismatch
    if (selectedDate === null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setSelectedDate(today);
    }
    // Set todayViewDate on mount to avoid hydration mismatch
    if (todayViewDate === null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setTodayViewDate(today);
    }
  }, [selectedDate, todayViewDate]);

  // Load completions on mount
  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  // Cleanup timeouts when component unmounts or when showCompletedTasks changes
  useEffect(() => {
    return () => {
      // Clear all pending timeouts on unmount
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
    };
  }, []);

  // Clear recently completed tasks when showCompletedTasks is turned on
  useEffect(() => {
    if (showCompletedTasks) {
      setRecentlyCompletedTasks(new Set());
      // Clear all pending timeouts
      Object.values(recentlyCompletedTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      recentlyCompletedTimeoutsRef.current = {};
      // Clear auto-collapsed sections when showing completed tasks
      setAutoCollapsedSections(new Set());
    } else {
      // When hiding completed tasks, clear manually expanded sections
      // so sections can auto-collapse again if they become empty
      setManuallyExpandedSections(new Set());
    }
  }, [showCompletedTasks]);

  // Dialog state management (replacing useDisclosure from Chakra v2)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const openTaskDialog = () => setTaskDialogOpen(true);
  const closeTaskDialog = () => setTaskDialogOpen(false);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const openSectionDialog = () => setSectionDialogOpen(true);
  const closeSectionDialog = () => setSectionDialogOpen(false);

  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  // Bulk edit state - track selected task IDs
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  // Workout modal state
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [workoutModalTask, setWorkoutModalTask] = useState(null);

  // Resize handlers for resizable sections
  const resizeStartRef = useRef(null);
  const [resizeType, setResizeType] = useState(null); // "backlog" or "today"
  // Local state for smooth resizing (only updates preferences on mouse up)
  const [localBacklogWidth, setLocalBacklogWidth] = useState(backlogWidth);
  const [localTodayViewWidth, setLocalTodayViewWidth] = useState(todayViewWidth);
  const rafRef = useRef(null);

  // Track which calendar droppable we're over for time calculation
  const currentCalendarDroppableRef = useRef(null);
  const mouseMoveListenerRef = useRef(null);

  // Sync local widths with preference widths when they change externally
  useEffect(() => {
    setLocalBacklogWidth(backlogWidth);
  }, [backlogWidth]);

  useEffect(() => {
    setLocalTodayViewWidth(todayViewWidth);
  }, [todayViewWidth]);

  const handleBacklogResizeStart = e => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType("backlog");
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: localBacklogWidth,
    };
  };

  const handleTodayResizeStart = e => {
    e.preventDefault();
    setIsResizing(true);
    setResizeType("today");
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: localTodayViewWidth,
    };
  };

  useEffect(() => {
    if (!isResizing || !resizeType) return;

    const handleMouseMove = e => {
      if (!resizeStartRef.current) return;

      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame for smooth updates
      rafRef.current = requestAnimationFrame(() => {
        if (!resizeStartRef.current) return;
        const deltaX = e.clientX - resizeStartRef.current.startX;

        if (resizeType === "backlog") {
          const newWidth = Math.max(300, Math.min(800, resizeStartRef.current.startWidth + deltaX));
          setLocalBacklogWidth(newWidth);
        } else if (resizeType === "today") {
          const newWidth = Math.max(300, Math.min(1200, resizeStartRef.current.startWidth + deltaX));
          setLocalTodayViewWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      // Save final width to preferences
      if (resizeType === "backlog") {
        setBacklogWidth(localBacklogWidth);
      } else if (resizeType === "today") {
        setTodayViewWidth(localTodayViewWidth);
      }

      setIsResizing(false);
      setResizeType(null);
      resizeStartRef.current = null;

      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, resizeType, localBacklogWidth, localTodayViewWidth, setBacklogWidth, setTodayViewWidth]);

  // Keyboard shortcut: CMD+E (or CTRL+E) to open task dialog
  useEffect(() => {
    const handleKeyDown = e => {
      // Check for CMD+E (Mac) or CTRL+E (Windows/Linux)
      // Don't trigger if user is typing in an input/textarea/contenteditable
      const target = e.target;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "e" && !isInput) {
        e.preventDefault();
        setTaskDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon === "Sun" ? Sun : greeting.icon === "Sunset" ? Sunset : Moon;

  // Tasks that should show in today's dashboard, enhanced with completion status
  // Use todayViewDate if available, otherwise fall back to today
  const viewDate = todayViewDate || today;
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
          if (isCompleted && recentlyCompletedTasks.has(t.id)) {
            return true;
          }
          // Hide if completed or has any outcome (not completed)
          return !isCompleted && !hasOutcome;
        });
      }
      grouped[s.id] = sectionTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [filteredTodaysTasks, sections, showCompletedTasks, recentlyCompletedTasks]);

  // Tasks for backlog: tasks without recurrence that don't show on any date
  // Excludes:
  // - Tasks that show on today's date (shouldShowOnDate)
  // - Tasks with future dates/times
  // - One-time tasks (type: "none") that have been completed on ANY date
  // - Recurring tasks (daily, weekly, monthly, interval) - these only show on their scheduled dates
  // - Tasks completed/not completed on today (always hidden, but with delay for visual feedback)
  // Note: Backlog is always relative to today, not the selected date in Today View
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
          if (recentlyCompletedTasks.has(task.id)) {
            return true;
          }
          return false;
        }

        // For recurring tasks (daily, weekly, monthly, interval), they should NEVER appear in backlog
        // Recurring tasks only show on their scheduled dates, not in backlog
        if (task.recurrence?.type && task.recurrence.type !== "none") {
          return false;
        }

        // Exclude notes from backlog
        if (task.completionType === "note") return false;

        // For tasks without recurrence (null), check if completed today
        // These are true backlog items that haven't been scheduled yet
        const outcome = getOutcomeOnDate(task.id, today);
        if (outcome !== null) {
          // Keep task visible if it's recently completed (within delay period)
          if (recentlyCompletedTasks.has(task.id)) {
            return true;
          }
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(task => ({
        ...task,
        // Add completion status from records for display
        completed: isCompletedOnDate(task.id, today),
        // Also update subtasks with completion status
        subtasks: task.subtasks
          ? task.subtasks.map(subtask => ({
              ...subtask,
              completed: isCompletedOnDate(subtask.id, today),
            }))
          : undefined,
      }));
  }, [tasks, today, isCompletedOnDate, getOutcomeOnDate, hasAnyCompletion, recentlyCompletedTasks]);

  // Filter tasks that are notes (completionType === "note")
  const noteTasks = useMemo(() => {
    return tasks.filter(task => task.completionType === "note");
  }, [tasks]);

  // Progress calculation - check completion records for the selected date
  const totalTasks = filteredTodaysTasks.length;
  const completedTasks = filteredTodaysTasks.filter(t => {
    // Check if task is completed on the selected date via completion record
    const isCompletedOnViewDate = isCompletedOnDate(t.id, viewDate);
    // Also check subtasks completion
    const allSubtasksComplete = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed);
    return isCompletedOnViewDate || allSubtasksComplete;
  }).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Helper function to collect subtask completions to delete
  const collectSubtaskCompletionsToDelete = (task, targetDate) => {
    const completionsToDelete = [{ taskId: task.id, date: targetDate.toISOString() }];
    if (!task.subtasks || task.subtasks.length === 0) {
      return completionsToDelete;
    }

    for (const subtask of task.subtasks) {
      if (isCompletedOnDate(subtask.id, targetDate)) {
        completionsToDelete.push({ taskId: subtask.id, date: targetDate.toISOString() });
      }
    }
    return completionsToDelete;
  };

  // Helper function to collect subtask completions to create
  const collectSubtaskCompletionsToCreate = (task, targetDate) => {
    const completionsToCreate = [{ taskId: task.id, date: targetDate.toISOString() }];
    if (!task.subtasks || task.subtasks.length === 0) {
      return completionsToCreate;
    }

    for (const subtask of task.subtasks) {
      if (!isCompletedOnDate(subtask.id, targetDate)) {
        completionsToCreate.push({ taskId: subtask.id, date: targetDate.toISOString() });
      }
    }
    return completionsToCreate;
  };

  // Helper function to remove task from recently completed set
  const removeFromRecentlyCompleted = taskId => {
    setRecentlyCompletedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    if (recentlyCompletedTimeoutsRef.current[taskId]) {
      clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
      delete recentlyCompletedTimeoutsRef.current[taskId];
    }
  };

  // Helper function to add task to recently completed set with timeout
  const addToRecentlyCompleted = (taskId, sectionId) => {
    setRecentlyCompletedTasks(prev => new Set(prev).add(taskId));

    // Clear any existing timeout for this task
    if (recentlyCompletedTimeoutsRef.current[taskId]) {
      clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
    }

    // Set timeout to remove from recently completed after 2 seconds
    recentlyCompletedTimeoutsRef.current[taskId] = setTimeout(() => {
      removeFromRecentlyCompleted(taskId);

      // After the delay, check if section should auto-collapse
      if (sectionId) {
        setTimeout(() => {
          checkAndAutoCollapseSection(sectionId);
        }, 50);
      }
    }, 2000);
  };

  // Task handlers
  const handleToggleTask = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task has no recurrence (appears in backlog)
    const hasNoRecurrence = !task.recurrence;

    // Determine which date to use: viewDate for Today View, today for backlog
    const targetDate = hasNoRecurrence ? today : viewDate;
    const isCompletedOnTargetDate = isCompletedOnDate(taskId, targetDate);

    // Check if we need to temporarily expand a section when checking from backlog
    let wasSectionCollapsed = false;
    let sectionWasManuallyCollapsed = false;
    let sectionWasAutoCollapsed = false;

    if (hasNoRecurrence && !isCompletedOnTargetDate && task.sectionId) {
      const section = sections.find(s => s.id === task.sectionId);
      if (section) {
        sectionWasManuallyCollapsed = section.expanded === false;
        sectionWasAutoCollapsed = autoCollapsedSections.has(section.id);
        wasSectionCollapsed = sectionWasManuallyCollapsed || sectionWasAutoCollapsed;

        // Temporarily expand the section if it's collapsed
        if (wasSectionCollapsed) {
          // Remove from auto-collapsed if it's there
          if (sectionWasAutoCollapsed) {
            setAutoCollapsedSections(prev => {
              const newSet = new Set(prev);
              newSet.delete(section.id);
              return newSet;
            });
          }
          // Expand manually collapsed section
          if (sectionWasManuallyCollapsed) {
            await updateSection(section.id, { expanded: true });
          }
        }
      }
    }

    try {
      // Get current time when checking
      const now = new Date();
      const currentTime = minutesToTime(now.getHours() * 60 + now.getMinutes());

      // Check if task is truly recurring (has recurrence pattern, not just a one-time task)
      const isRecurringTask = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

      // If task has no recurrence and is being checked, set it to show on calendar with current time
      if (hasNoRecurrence && !isCompletedOnTargetDate) {
        // Set recurrence to today's date and time to current time so it appears in calendar
        const todayDateStr = formatLocalDate(today);
        await updateTask(taskId, {
          recurrence: {
            type: "none",
            startDate: `${todayDateStr}T00:00:00.000Z`,
          },
          time: currentTime,
          // Set status to complete for non-recurring tasks when checking
          status: "complete",
        });
      }
      // If task is non-recurring (one-time task) and doesn't have a time, set it to current time when checking
      // Skip this for recurring tasks to preserve their time-flexible nature
      else if (!isRecurringTask && !task.time && !isCompletedOnTargetDate) {
        // Task is non-recurring (one-time), assign current time for completion tracking
        await updateTask(taskId, {
          time: currentTime,
          // Set status to complete for non-recurring tasks when checking
          status: "complete",
        });
      }
      // If task is non-recurring and already has a time, just update status when checking
      else if (!isRecurringTask && !isCompletedOnTargetDate) {
        // Task is non-recurring, just update status to complete
        await updateTask(taskId, {
          status: "complete",
        });
      }

      // Update completion record
      if (isCompletedOnTargetDate) {
        // Task is completed on the target date, remove completion record
        const completionsToDelete = collectSubtaskCompletionsToDelete(task, targetDate);
        await batchDeleteCompletions(completionsToDelete);

        // For non-recurring tasks, set status back to todo when unchecking
        if (!isRecurringTask) {
          await updateTask(taskId, {
            status: "todo",
          });
        }

        // If hiding completed tasks, remove from recently completed set immediately when unchecked
        if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
          removeFromRecentlyCompleted(taskId);
        }
      } else {
        // Task is not completed on the target date, create completion record
        // Add to recently completed set BEFORE creating completion to prevent flash
        if (!showCompletedTasks) {
          addToRecentlyCompleted(taskId, task.sectionId);
        }

        // Create completion record after adding to recently completed set
        try {
          const completionsToCreate = collectSubtaskCompletionsToCreate(task, targetDate);
          await batchCreateCompletions(completionsToCreate);
        } catch (completionError) {
          // If completion creation fails, remove from recently completed set
          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }
          throw completionError;
        }
      }

      // If we temporarily expanded a section and hide completed is true, collapse it again
      if (wasSectionCollapsed && !showCompletedTasks && task.sectionId) {
        const sectionIdToCollapse = task.sectionId;
        // Wait a bit for the UI to update, then collapse the section again
        setTimeout(() => {
          // Re-collapse manually collapsed section
          if (sectionWasManuallyCollapsed) {
            updateSection(sectionIdToCollapse, { expanded: false }).catch(err => {
              console.error("Error collapsing section:", err);
            });
          }
          // Re-add to auto-collapsed if it was auto-collapsed
          // The checkAndAutoCollapseSection will handle this, but we can also do it here
          // to ensure it happens immediately
          if (sectionWasAutoCollapsed) {
            // Check if section should be auto-collapsed (no visible tasks)
            checkAndAutoCollapseSection(sectionIdToCollapse);
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
      // If there was an error and we expanded the section, try to restore its state
      if (wasSectionCollapsed && task.sectionId) {
        const sectionIdToRestore = task.sectionId;
        if (sectionWasManuallyCollapsed) {
          updateSection(sectionIdToRestore, { expanded: false }).catch(err => {
            console.error("Error restoring section state:", err);
          });
        }
        if (sectionWasAutoCollapsed) {
          setAutoCollapsedSections(prev => {
            const newSet = new Set(prev);
            newSet.add(sectionIdToRestore);
            return newSet;
          });
        }
      }
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    // Subtasks are now full tasks, toggle the subtask directly without parent logic
    const subtask =
      tasks.find(t => t.id === subtaskId) || tasks.flatMap(t => t.subtasks || []).find(st => st.id === subtaskId);
    if (!subtask) return;

    // Check if subtask has no recurrence (appears in backlog)
    const hasNoRecurrence = !subtask.recurrence;

    // Determine which date to use: viewDate for Today View, today for backlog
    const targetDate = hasNoRecurrence ? today : viewDate;
    const isCompletedOnTargetDate = isCompletedOnDate(subtaskId, targetDate);

    try {
      // For subtasks from backlog (no recurrence), set startDate when completing
      // But DON'T set time - let them keep their existing time or stay untimed
      if (hasNoRecurrence && !isCompletedOnTargetDate) {
        const todayDateStr = formatLocalDate(today);
        await updateTask(subtaskId, {
          recurrence: {
            type: "none",
            startDate: `${todayDateStr}T00:00:00.000Z`,
          },
          // Removed time assignment - subtasks should not auto-set time on completion
        });
      }
      // Removed time-setting logic for non-recurring subtasks
      // Subtasks should preserve their existing time or stay untimed

      // Update completion record for subtask only (no parent logic)
      if (isCompletedOnTargetDate) {
        await deleteCompletion(subtaskId, targetDate.toISOString());
      } else {
        await createCompletion(subtaskId, targetDate.toISOString());
      }
    } catch (error) {
      console.error("Error toggling subtask completion:", error);
    }
  };

  const handleToggleExpand = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, { expanded: !task.expanded });
  };

  const handleOutcomeChange = async (taskId, date, outcome) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      const task = tasks.find(t => t.id === taskId);

      // Check if this is a subtask (has a parentId)
      const isSubtask = task?.parentId != null;

      // Check if task is recurring
      const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";

      if (outcome === null) {
        // Remove record
        await deleteCompletion(taskId, dateObj.toISOString());

        // For non-recurring tasks, set status back to todo when unchecking
        if (!isRecurringTask) {
          await updateTask(taskId, { status: "todo" });
        }

        // If hiding completed tasks, remove from recently completed set immediately when unchecked
        if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
          removeFromRecentlyCompleted(taskId);
        }

        // Only cascade to subtasks if this is a PARENT task (not a subtask itself)
        if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
          await Promise.all(task.subtasks.map(subtask => deleteCompletion(subtask.id, dateObj.toISOString())));
        }
      } else {
        // If marking as completed and hiding completed tasks, add to recently completed set
        if (outcome === "completed" && !showCompletedTasks) {
          addToRecentlyCompleted(taskId, task?.sectionId);
        }
        // Create or update record with outcome
        try {
          await createCompletion(taskId, dateObj.toISOString(), { outcome });

          // For non-recurring tasks, set status to complete when marking as completed
          if (outcome === "completed" && !isRecurringTask) {
            await updateTask(taskId, { status: "complete" });
          }

          // Only cascade to subtasks if this is a PARENT task (not a subtask itself)
          if (!isSubtask && task?.subtasks && task.subtasks.length > 0) {
            await Promise.all(
              task.subtasks.map(subtask => createCompletion(subtask.id, dateObj.toISOString(), { outcome }))
            );
          }
        } catch (completionError) {
          // If completion creation fails, remove from recently completed set
          if (outcome === "completed" && !showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            removeFromRecentlyCompleted(taskId);
          }
          throw completionError;
        }
      }

      // Check if section should auto-collapse after task completion/not completed
      // Use setTimeout to allow tasksBySection to update
      setTimeout(() => {
        if (task?.sectionId) {
          checkAndAutoCollapseSection(task.sectionId);
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Failed to update task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCompleteWithNote = async (taskId, note) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const targetDate = todayViewDate || today;
      await createCompletion(taskId, targetDate.toISOString(), { note, outcome: "completed" });

      // For non-recurring tasks, set status to complete
      const isRecurringTask = task?.recurrence && task.recurrence.type && task.recurrence.type !== "none";
      if (!isRecurringTask) {
        await updateTask(taskId, { status: "complete" });
      }

      // If hiding completed tasks, add to recently completed set
      if (!showCompletedTasks) {
        addToRecentlyCompleted(taskId, task?.sectionId);
      }
    } catch (error) {
      console.error("Error completing task with note:", error);
      toast({
        title: "Failed to complete task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleNotCompletedTask = async taskId => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const targetDate = todayViewDate || today;
      await createCompletion(taskId, targetDate.toISOString(), { outcome: "not_completed" });

      // If hiding completed tasks, add to recently completed set (not completed tasks also get delay)
      if (!showCompletedTasks) {
        addToRecentlyCompleted(taskId, task?.sectionId);
      }
    } catch (error) {
      console.error("Error marking task as not completed:", error);
      toast({
        title: "Failed to mark task as not completed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditTask = task => {
    setEditingTask(task);
    setDefaultSectionId(null);
    setDefaultTime(null);
    openTaskDialog();
  };

  const handleEditWorkout = task => {
    setEditingWorkoutTask(task);
  };

  const handleUpdateTaskTitle = async (taskId, newTitle) => {
    if (!newTitle.trim()) return;
    await updateTask(taskId, { title: newTitle.trim() });
  };

  const handleDeleteTask = async taskId => {
    await deleteTask(taskId);
  };

  // Tag handlers
  const handleTaskTagsChange = async (taskId, newTagIds) => {
    try {
      // Use the batch endpoint to update all tags at once
      await batchUpdateTaskTags(taskId, newTagIds);

      // Refresh tasks to get updated tag associations
      await fetchTasks();
    } catch (error) {
      console.error("Error updating task tags:", error);
      toast({
        title: "Failed to update tags",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Bulk edit handlers
  const handleTaskSelect = (taskId, event) => {
    // Check if cmd/ctrl key is pressed
    const isMultiSelect = event?.metaKey || event?.ctrlKey;

    if (isMultiSelect) {
      setSelectedTaskIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    } else {
      // Clear selection if clicking without cmd/ctrl
      setSelectedTaskIds(new Set());
    }
  };

  const handleBulkEdit = () => {
    if (selectedTaskIds.size === 0) return;
    setBulkEditDialogOpen(true);
  };

  const handleBulkEditSave = async updates => {
    try {
      // Use the proper batch update endpoint - single API call for all tasks
      await batchUpdateTasks(Array.from(selectedTaskIds), updates);

      toast({
        title: `Updated ${selectedTaskIds.size} task(s)`,
        status: "success",
        duration: 2000,
      });

      // Clear selection and close dialog
      setSelectedTaskIds(new Set());
      setBulkEditDialogOpen(false);
    } catch (err) {
      console.error("Bulk edit error:", err);
      toast({
        title: "Failed to update tasks",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Workout handlers
  const handleBeginWorkout = task => {
    setWorkoutModalTask(task);
    setWorkoutModalOpen(true);
  };

  const handleSaveWorkoutProgress = async (taskId, date, workoutCompletion) => {
    try {
      // Find the task to update its workoutData
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.workoutData) {
        throw new Error("Task or workout data not found");
      }

      // Update workoutData with progress
      const updatedWorkoutData = {
        ...task.workoutData,
        progress: {
          ...(task.workoutData.progress || {}),
          [workoutCompletion.week]: {
            sectionCompletions: workoutCompletion.sectionCompletions,
          },
        },
      };

      // Save progress to the task itself (not TaskCompletion)
      await saveTask({ id: taskId, workoutData: updatedWorkoutData });

      // Update the modal task if it's the same task
      if (workoutModalTask?.id === taskId) {
        setWorkoutModalTask({
          ...workoutModalTask,
          workoutData: updatedWorkoutData,
        });
      }
    } catch (error) {
      console.error("Failed to save workout progress:", error);
      toast({
        title: "Failed to save workout progress",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDuplicateTask = async taskId => {
    try {
      await duplicateTask(taskId);
      toast({
        title: "Task duplicated",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Failed to duplicate task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddTask = sectionId => {
    setDefaultSectionId(sectionId);
    setDefaultTime(null);
    setDefaultDate(formatLocalDate(viewDate || new Date()));
    setEditingTask(null);
    openTaskDialog();
  };

  const handleCreateTaskInline = async (sectionId, title) => {
    if (!title.trim()) return;

    try {
      const taskDate = viewDate || new Date();
      taskDate.setHours(0, 0, 0, 0);
      const now = new Date();

      await createTask({
        title: title.trim(),
        sectionId,
        time: null,
        duration: 0,
        color: "#3b82f6",
        status: "in_progress",
        startedAt: now.toISOString(),
        recurrence: {
          type: "none",
          startDate: taskDate.toISOString(),
        },
        subtasks: [],
        order: 999,
      });
    } catch (error) {
      toast({
        title: "Failed to create task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleAddTaskToBacklog = () => {
    setDefaultSectionId(sections[0]?.id);
    setDefaultTime(null);
    setDefaultDate(null);
    setEditingTask(null);
    openTaskDialog();
  };

  const handleCreateBacklogTaskInline = async title => {
    if (!title.trim()) return;

    try {
      await createTask({
        title: title.trim(),
        sectionId: sections[0]?.id,
        time: null,
        duration: 0,
        color: "#3b82f6",
        recurrence: null, // Backlog items have no recurrence/date
        subtasks: [],
        order: 999,
      });
    } catch (error) {
      toast({
        title: "Failed to create task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCreateKanbanTaskInline = async (status, title) => {
    if (!title.trim()) return;

    try {
      const now = new Date();
      await createTask({
        title: title.trim(),
        sectionId: sections[0]?.id,
        time: null,
        duration: 0,
        color: "#3b82f6",
        status: status,
        startedAt: status === "in_progress" ? now.toISOString() : null,
        recurrence: null, // Kanban tasks are non-recurring
        subtasks: [],
        order: 999,
      });
    } catch (error) {
      toast({
        title: "Failed to create task",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCreateTaskFromCalendar = (time, day) => {
    setDefaultTime(time);
    setDefaultDate(day ? formatLocalDate(day) : null);
    setDefaultSectionId(sections[0]?.id);
    setEditingTask(null);
    openTaskDialog();
  };

  const handleSaveTask = async taskData => {
    await saveTask(taskData);
    setEditingTask(null);
    closeTaskDialog();
  };

  const handleTodayTagSelect = tagId => {
    setTodaySelectedTagIds(prev => [...prev, tagId]);
  };

  const handleTodayTagDeselect = tagId => {
    setTodaySelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  const handleCalendarTagSelect = tagId => {
    setCalendarSelectedTagIds(prev => [...prev, tagId]);
  };

  const handleCalendarTagDeselect = tagId => {
    setCalendarSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  const handleTaskTimeChange = async (taskId, newTime) => {
    await updateTask(taskId, { time: newTime });
  };

  const handleTaskDurationChange = async (taskId, newDuration) => {
    await updateTask(taskId, { duration: newDuration });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates = { status: newStatus };
    const now = new Date();

    if (newStatus === "in_progress") {
      // Set startedAt when moving to in_progress
      updates.startedAt = now.toISOString();

      // If task has no date, set it to today (so it appears in Today view)
      if (!task.recurrence || task.recurrence.type === "none") {
        const todayStr = formatLocalDate(new Date());
        if (!task.recurrence?.startDate) {
          updates.recurrence = { type: "none", startDate: `${todayStr}T00:00:00.000Z` };
        }
      }
    } else if (newStatus === "todo") {
      // Clear startedAt when moving back to todo
      updates.startedAt = null;
    } else if (newStatus === "complete") {
      // When completing, create a TaskCompletion record with timing data
      const completedAt = now;
      const startedAt = task.startedAt ? new Date(task.startedAt) : completedAt;

      // Check if task has no recurrence (needs to be set so it appears in Today view)
      const hasNoRecurrence = !task.recurrence;
      const isRecurringTask = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

      // If task has no recurrence, set it to today's date so it appears in Today view
      // (same behavior as completing from backlog)
      if (hasNoRecurrence) {
        const todayStr = formatLocalDate(now);
        updates.recurrence = {
          type: "none",
          startDate: `${todayStr}T00:00:00.000Z`,
        };
      }
      // If task is non-recurring (one-time) and doesn't have a startDate, set it to today
      else if (!isRecurringTask && !task.recurrence.startDate) {
        const todayStr = formatLocalDate(now);
        updates.recurrence = {
          ...task.recurrence,
          startDate: `${todayStr}T00:00:00.000Z`,
        };
      }

      // Set the time to the current time so it shows up on the calendar at that specific time
      // Format: "HH:MM" (24-hour format)
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      updates.time = minutesToTime(currentMinutes);

      // Create completion record
      await createCompletion(taskId, now.toISOString(), {
        outcome: "completed",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      });

      // Clear startedAt on task since it's now stored in completion
      updates.startedAt = null;

      // Add to recently completed for visual feedback
      if (!showCompletedTasks) {
        addToRecentlyCompleted(taskId, task.sectionId);
      }
    }

    await updateTask(taskId, updates);
  };

  // Main drag end handler
  const handleDragEnd = async result => {
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      dropTimeRef.current = null;
      return;
    }

    // Handle section reordering
    if (type === "SECTION") {
      const newSections = Array.from(sections).sort((a, b) => a.order - b.order);
      const [reorderedSection] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, reorderedSection);
      await reorderSections(newSections);
      return;
    }

    // Handle task dragging
    if (type === "TASK") {
      // Skip Kanban operations - they're handled in handleDragEndNew
      const sourceParsed = parseDroppableId(source.droppableId);
      const destParsed = parseDroppableId(destination.droppableId);

      if (sourceParsed.type === "kanban-column" || destParsed.type === "kanban-column") {
        dropTimeRef.current = null;
        return;
      }

      // Extract task ID from context-aware draggable ID
      const taskId = extractTaskId(draggableId);
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        dropTimeRef.current = null;
        return;
      }

      // Get the calculated drop time (if dropping on timed calendar area)
      const calculatedTime = dropTimeRef.current || "09:00";
      dropTimeRef.current = null;

      // Determine what updates to make based on source and destination
      let updates = {};

      // DESTINATION: Backlog - clear date, time, and recurrence, set status to todo
      if (destParsed.type === "backlog") {
        // Only update status for non-recurring tasks when coming from today-section
        const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";
        const isFromTodaySection = sourceParsed.type === "today-section";
        updates = {
          time: null,
          recurrence: null,
        };
        // Set status to todo when moving from today-section to backlog (only for non-recurring tasks)
        if (!isRecurring && isFromTodaySection) {
          updates.status = "todo";
          // Clear startedAt when moving back to todo
          updates.startedAt = null;
        }
      }
      // DESTINATION: Today section - set date to the selected date in Today View, preserve time and recurrence
      else if (destParsed.type === "today-section") {
        // Don't set sectionId here - let the reordering logic below handle it
        // Use the selected date in Today View (todayViewDate), or fall back to today
        const targetDate = viewDate || today;
        const targetDateStr = formatLocalDate(targetDate);

        // Preserve existing recurrence if it exists, otherwise set to none with today's date
        // For recurring tasks, preserve everything. For one-time tasks, update date if different.
        let recurrenceUpdate;
        const currentDateStr = task.recurrence?.startDate?.split("T")[0];
        const needsDateUpdate = currentDateStr !== targetDateStr;
        const isRecurring = task.recurrence && task.recurrence.type && task.recurrence.type !== "none";

        if (isRecurring) {
          // Preserve the recurrence pattern (daily, weekly, etc.) - no updates needed
          recurrenceUpdate = task.recurrence;
          // No updates needed for recurring tasks
          updates = {};
        } else {
          // One-time task or no recurrence - update date if different
          if (needsDateUpdate || !task.recurrence) {
            recurrenceUpdate = {
              type: "none",
              startDate: `${targetDateStr}T00:00:00.000Z`,
            };
            updates = {
              recurrence: recurrenceUpdate,
              // Preserve existing time - don't clear it
            };
          } else {
            // Date is the same, no updates needed
            updates = {};
          }
          // Set status to in_progress when moving from backlog to today section (only for non-recurring tasks)
          if (sourceParsed.type === "backlog") {
            updates.status = "in_progress";
            // Set startedAt when moving to in_progress if not already set
            if (!task.startedAt) {
              updates.startedAt = new Date().toISOString();
            }
          }
        }
      }
      // DESTINATION: Calendar (timed area) - set date and time, preserve recurrence
      else if (destParsed.type === "calendar" && !destParsed.isUntimed) {
        // Use dateStr from parsed droppable ID, or format local date as fallback
        let dropDateStr;
        if (destParsed.dateStr) {
          dropDateStr = destParsed.dateStr.split("T")[0];
        } else {
          const fallbackDate = selectedDate || new Date();
          dropDateStr = formatLocalDate(fallbackDate);
        }

        // Preserve existing recurrence if it exists, otherwise set to none with drop date
        let recurrenceUpdate;
        if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
          // Preserve the recurrence pattern (daily, weekly, etc.)
          recurrenceUpdate = task.recurrence;
        } else {
          // No recurrence or type is "none" - set to none with drop date
          recurrenceUpdate = {
            type: "none",
            startDate: `${dropDateStr}T00:00:00.000Z`,
          };
        }

        updates = {
          time: calculatedTime,
          recurrence: recurrenceUpdate,
        };
      }
      // DESTINATION: Calendar (untimed area) - set date, clear time, preserve recurrence
      else if (destParsed.type === "calendar" && destParsed.isUntimed) {
        // Use dateStr from parsed droppable ID, or format local date as fallback
        let dropDateStr;
        if (destParsed.dateStr) {
          dropDateStr = destParsed.dateStr.split("T")[0];
        } else {
          const fallbackDate = selectedDate || new Date();
          dropDateStr = formatLocalDate(fallbackDate);
        }

        // Preserve existing recurrence if it exists, otherwise set to none with drop date
        let recurrenceUpdate;
        if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
          // Preserve the recurrence pattern (daily, weekly, etc.)
          recurrenceUpdate = task.recurrence;
        } else {
          // No recurrence or type is "none" - set to none with drop date
          recurrenceUpdate = {
            type: "none",
            startDate: `${dropDateStr}T00:00:00.000Z`,
          };
        }

        updates = {
          time: null,
          recurrence: recurrenceUpdate,
        };
      }

      // Handle reordering when dropping into a section
      if (destParsed.type === "today-section") {
        const targetSectionId = destParsed.sectionId;
        const sourceSectionId = sourceParsed.type === "today-section" ? sourceParsed.sectionId : task.sectionId; // Use task's current sectionId if not from a section

        // Use the dedicated reorderTask function which handles all reordering logic
        await reorderTask(taskId, sourceSectionId, targetSectionId, destination.index);

        // Apply time/recurrence updates separately if there are any
        if (Object.keys(updates).length > 0) {
          await updateTask(taskId, updates);
        }

        // Clear updates since they've been applied
        updates = {};
      }

      // Apply any remaining updates (for non-section destinations)
      if (Object.keys(updates).length > 0) {
        await updateTask(taskId, updates);
      }
    }
  };

  // Section handlers
  const handleEditSection = section => {
    setEditingSection(section);
    openSectionDialog();
  };

  const handleAddSection = () => {
    setEditingSection(null);
    openSectionDialog();
  };

  const handleSaveSection = async sectionData => {
    if (editingSection) {
      await updateSection(editingSection.id, sectionData);
    } else {
      await createSection(sectionData);
    }
    setEditingSection(null);
    closeSectionDialog();
  };

  const handleDeleteSection = async sectionId => {
    if (sections.length <= 1) {
      toast({
        title: "Cannot delete section",
        description: "You need at least one section",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    await deleteSection(sectionId);
  };

  // Helper function to check if a section should be auto-collapsed after task completion/not completed
  // Using useRef to store the latest check function to avoid stale closures in setTimeout
  const checkAndAutoCollapseSectionRef = useRef(null);

  useEffect(() => {
    checkAndAutoCollapseSectionRef.current = sectionId => {
      // Only auto-collapse when hide completed is true
      if (showCompletedTasks) return;

      // Don't auto-collapse if user manually expanded it
      if (manuallyExpandedSections.has(sectionId)) return;

      // Get visible tasks for this section
      const visibleTasks = tasksBySection[sectionId] || [];

      // Auto-collapse if no visible tasks remain
      if (visibleTasks.length === 0) {
        setAutoCollapsedSections(prev => {
          const newSet = new Set(prev);
          newSet.add(sectionId);
          return newSet;
        });
      }
    };
  }, [showCompletedTasks, tasksBySection, manuallyExpandedSections]);

  const checkAndAutoCollapseSection = useCallback(sectionId => {
    if (checkAndAutoCollapseSectionRef.current) {
      checkAndAutoCollapseSectionRef.current(sectionId);
    }
  }, []);

  const handleToggleSectionExpand = async sectionId => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const isCurrentlyCollapsed = section.expanded === false || autoCollapsedSections.has(section.id);
    const willBeExpanded = !isCurrentlyCollapsed;

    // If user is expanding a section that was auto-collapsed, mark it as manually expanded
    if (willBeExpanded && autoCollapsedSections.has(section.id)) {
      setManuallyExpandedSections(prev => {
        const newSet = new Set(prev);
        newSet.add(sectionId);
        return newSet;
      });
      // Clear auto-collapse state
      setAutoCollapsedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }

    // Update manual expanded state
    await updateSection(sectionId, { expanded: !(section.expanded !== false) });
  };

  // Calendar navigation
  const navigateCalendar = dir => {
    if (calendarView === "kanban") return; // Kanban view doesn't have date navigation
    const d = new Date(selectedDate);
    if (calendarView === "day") d.setDate(d.getDate() + dir);
    else if (calendarView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  // Today View navigation
  const navigateTodayView = dir => {
    if (!todayViewDate) return;
    const d = new Date(todayViewDate);
    d.setDate(d.getDate() + dir);
    d.setHours(0, 0, 0, 0);
    setTodayViewDate(d);
  };

  const handleTodayViewToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setTodayViewDate(today);
  };

  const handleTodayViewDateChange = date => {
    setTodayViewDate(date);
  };

  const getCalendarTitle = () => {
    if (!selectedDate) return "";
    if (calendarView === "kanban") return "Kanban";
    if (calendarView === "day")
      return selectedDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    if (calendarView === "week") {
      const start = new Date(selectedDate);
      start.setDate(selectedDate.getDate() - selectedDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  // Create computed sections with combined expanded state (manual + auto-collapse)
  const computedSections = useMemo(() => {
    return sortedSections.map(section => {
      const isManuallyCollapsed = section.expanded === false;
      const isAutoCollapsed = autoCollapsedSections.has(section.id);
      // Section is collapsed if either manually collapsed OR auto-collapsed
      const isCollapsed = isManuallyCollapsed || isAutoCollapsed;
      return {
        ...section,
        expanded: !isCollapsed, // expanded is true when NOT collapsed
      };
    });
  }, [sortedSections, autoCollapsedSections]);

  // Configure sensors for @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Same as TaskDialog for consistent behavior
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize the task lookup map for faster drag start
  const taskLookupMap = useMemo(() => {
    const map = new Map();
    const addToMap = taskList => {
      taskList.forEach(task => {
        map.set(task.id, task);
        if (task.subtasks && task.subtasks.length > 0) {
          addToMap(task.subtasks);
        }
      });
    };
    addToMap(tasks);
    return map;
  }, [tasks]);

  // Handle drag start - optimized for performance with single state update
  const handleDragStart = event => {
    const { active } = event;

    // Calculate offset from click position relative to the dragged element
    const activatorEvent = event.activatorEvent;
    let offset;
    if (activatorEvent && activatorEvent.offsetX !== undefined && activatorEvent.offsetY !== undefined) {
      const clickX = activatorEvent.offsetX;
      const clickY = activatorEvent.offsetY;
      offset = {
        x: clickX - 90,
        y: clickY - 20,
      };
    } else {
      offset = { x: -90, y: -20 };
    }

    // Fast task lookup using memoized map
    let task = null;
    try {
      const taskId = extractTaskId(active.id);
      task = taskLookupMap.get(taskId) || null;
    } catch {
      // Not a task drag (might be section reorder)
      task = null;
    }

    // Single state update - triggers only ONE re-render!
    setDragState({
      activeId: active.id,
      activeTask: task,
      offset,
    });

    // Clear calendar droppable tracking
    currentCalendarDroppableRef.current = null;
    dropTimeRef.current = null;
  };

  // Handle drag over (for real-time updates like time calculation)
  // Throttled to avoid performance issues during drag
  const handleDragOver = event => {
    // Only process if we're not already processing
    // This prevents the heavy DOM queries from running on every single drag over event
    const { over } = event;

    if (over && over.id && typeof over.id === "string") {
      const droppableId = over.id;

      // Check if we're over a timed calendar area
      if (droppableId.startsWith("calendar-day|") || droppableId.startsWith("calendar-week|")) {
        currentCalendarDroppableRef.current = droppableId;

        // Set up mousemove listener if not already set
        if (!mouseMoveListenerRef.current) {
          // Cache the timed areas to avoid repeated DOM queries
          let cachedTimedAreas = null;
          let cacheTime = 0;
          const CACHE_DURATION = 100; // Cache for 100ms

          const handleMouseMove = e => {
            if (!currentCalendarDroppableRef.current) return;

            const now = Date.now();

            // Refresh cache if expired or doesn't exist
            if (!cachedTimedAreas || now - cacheTime > CACHE_DURATION) {
              cachedTimedAreas = Array.from(document.querySelectorAll('[data-calendar-timed="true"]'));
              cacheTime = now;
            }

            // Find the timed area under the cursor
            const timedArea = cachedTimedAreas.find(el => {
              const rect = el.getBoundingClientRect();
              return (
                rect.top <= e.clientY && rect.bottom >= e.clientY && rect.left <= e.clientX && rect.right >= e.clientX
              );
            });

            if (timedArea) {
              const rect = timedArea.getBoundingClientRect();
              const y = e.clientY - rect.top;

              // Get HOUR_HEIGHT from data attribute or use default based on view
              const hourHeight =
                parseInt(timedArea.getAttribute("data-hour-height")) || (calendarView === "day" ? 64 : 48);

              const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / hourHeight) * 60)));
              const snappedMinutes = snapToIncrement(minutes, 15);
              dropTimeRef.current = minutesToTime(snappedMinutes);
            }
          };

          window.addEventListener("mousemove", handleMouseMove);
          mouseMoveListenerRef.current = handleMouseMove;
        }
      } else {
        // Not over timed calendar area - clear
        currentCalendarDroppableRef.current = null;
        if (mouseMoveListenerRef.current) {
          window.removeEventListener("mousemove", mouseMoveListenerRef.current);
          mouseMoveListenerRef.current = null;
        }
        if (droppableId.startsWith("calendar-day-untimed|") || droppableId.startsWith("calendar-week-untimed|")) {
          dropTimeRef.current = null;
        }
      }
    }
  };

  // Handle drag end - properly handle @dnd-kit events
  const handleDragEndNew = async event => {
    const { active, over } = event;

    setDragState({ activeId: null, activeTask: null, offset: { x: 0, y: 0 } });

    // Clean up mousemove listener
    if (mouseMoveListenerRef.current) {
      window.removeEventListener("mousemove", mouseMoveListenerRef.current);
      mouseMoveListenerRef.current = null;
    }
    currentCalendarDroppableRef.current = null;

    if (!over) {
      dropTimeRef.current = null;
      return;
    }

    const draggableId = active.id;
    const activeSortable = active.data.current?.sortable;
    const overSortable = over.data.current?.sortable;

    // Get source container ID from sortable data or infer from draggableId
    let sourceContainerId = activeSortable?.containerId;

    // Validate containerId format - it should match our droppable ID patterns
    // If it doesn't look valid (e.g., "Sortable-8"), extract from draggableId instead
    const isValidContainerId =
      sourceContainerId &&
      (sourceContainerId === "backlog" ||
        sourceContainerId.startsWith("today-section|") ||
        sourceContainerId.startsWith("calendar-") ||
        sourceContainerId.startsWith("kanban-column|"));

    if (!sourceContainerId || !isValidContainerId) {
      // Infer from draggableId pattern
      if (draggableId.includes("-kanban-")) {
        // Extract status from kanban draggableId: task-{id}-kanban-{status}
        const match = draggableId.match(/-kanban-(.+)$/);
        if (match) {
          sourceContainerId = `kanban-column|${match[1]}`;
        }
      } else if (draggableId.includes("-backlog")) {
        sourceContainerId = "backlog";
      } else if (draggableId.includes("-today-section-")) {
        // Extract section ID - it's everything after "-today-section-"
        const match = draggableId.match(/-today-section-(.+)$/);
        if (match) {
          sourceContainerId = `today-section|${match[1]}`;
        } else {
          console.warn("Failed to extract section ID from draggableId:", draggableId);
        }
      } else if (draggableId.includes("-calendar-untimed-")) {
        const match = draggableId.match(/-calendar-untimed-(.+)$/);
        if (match) {
          const dateStr = match[1];
          sourceContainerId = dateStr.includes("T")
            ? `calendar-day-untimed|${dateStr}`
            : `calendar-week-untimed|${dateStr}`;
        }
      } else if (draggableId.includes("-calendar-timed-")) {
        const match = draggableId.match(/-calendar-timed-(.+)$/);
        if (match) {
          const dateStr = match[1];
          sourceContainerId = dateStr.includes("T") ? `calendar-day|${dateStr}` : `calendar-week|${dateStr}`;
        }
      }

      // Note: We silently fall back to draggableId extraction when sortable containerId
      // is invalid (e.g., internal "Sortable-X" ids from dnd-kit). This is expected behavior.
    }

    // Determine type early
    let type = active.data.current?.type || "TASK";
    if (draggableId.startsWith("section-")) {
      type = "SECTION";
    }

    // Get destination container ID - check droppable ID first, then sortable container
    let destContainerId = null;

    // Check if dropping on a task drop target (for combining tasks)
    const overDroppable = over.data.current;

    // Priority 1: If over.id is a droppable ID pattern, use it directly
    if (
      over.id &&
      (over.id === "backlog" ||
        over.id.startsWith("today-section|") ||
        over.id.startsWith("calendar-") ||
        over.id.startsWith("kanban-column|"))
    ) {
      destContainerId = over.id;
    }
    // Priority 2: Use the sortable container ID (for tasks within sections)
    // But only if it's a valid containerId pattern, not an internal Sortable-X id
    else if (overSortable?.containerId) {
      const isValidDestContainerId =
        overSortable.containerId === "backlog" ||
        overSortable.containerId.startsWith("today-section|") ||
        overSortable.containerId.startsWith("calendar-") ||
        overSortable.containerId.startsWith("kanban-column|");

      if (isValidDestContainerId) {
        destContainerId = overSortable.containerId;
      }
    }

    // Priority 3: Extract container ID from task draggableId pattern
    if (!destContainerId && over.id && over.id.startsWith("task-")) {
      if (over.id.includes("-kanban-")) {
        // Extract status from kanban draggableId: task-{id}-kanban-{status}
        const match = over.id.match(/-kanban-(.+)$/);
        if (match) destContainerId = `kanban-column|${match[1]}`;
      } else if (over.id.includes("-today-section-")) {
        // Extract section ID - it's everything after "-today-section-"
        const match = over.id.match(/-today-section-(.+)$/);
        if (match) destContainerId = `today-section|${match[1]}`;
      } else if (over.id.includes("-backlog")) {
        destContainerId = "backlog";
      }
    }

    // Subtask dragging is disabled - subtasks can only be managed in the task dialog

    // Check if over is a droppable (not a sortable item)
    // Priority: droppable data > task draggableId pattern > section card > droppable ID pattern
    if (overDroppable?.sectionId) {
      // Dropping directly on a section droppable area
      destContainerId = `today-section|${overDroppable.sectionId}`;
    } else if (over.id && over.id.startsWith("task-") && over.id.includes("-today-section-")) {
      // Dropping on a task in a section - extract section from task's draggableId
      // Extract section ID - it's everything after "-today-section-"
      const match = over.id.match(/-today-section-(.+)$/);
      if (match) {
        destContainerId = `today-section|${match[1]}`;
      }
    } else if (over.id && over.id.startsWith("task-") && over.id.includes("-backlog")) {
      // Dropping on a task in backlog - use backlog container
      destContainerId = "backlog";
    } else if (over.id && over.id.startsWith("section-")) {
      // Dropping on a section card itself - extract section ID
      const sectionId = over.id.replace("section-", "");
      destContainerId = `today-section|${sectionId}`;
    }
    // Task combining is now handled in the task dialog, not via drag-and-drop

    // Final fallback: if destContainerId still isn't set and over.id matches droppable patterns
    if (!destContainerId && over.id) {
      if (over.id === "backlog") {
        destContainerId = "backlog";
      } else if (over.id.startsWith("kanban-column|")) {
        destContainerId = over.id;
      } else if (over.id.startsWith("today-section|")) {
        destContainerId = over.id;
      } else if (over.id.startsWith("calendar-")) {
        destContainerId = over.id;
      }
    }

    // For Kanban, we need to handle all operations in the cross-container section
    // because the sortable indices may not match the actual task order in the column
    const isKanbanDrag =
      sourceContainerId?.startsWith("kanban-column|") || destContainerId?.startsWith("kanban-column|");

    // Handle reordering within the same container using arrayMove
    // Skip Kanban here - we handle all Kanban operations in the cross-container section
    if (activeSortable && overSortable && sourceContainerId === destContainerId && sourceContainerId && !isKanbanDrag) {
      const oldIndex = activeSortable.index;
      const newIndex = overSortable.index;

      // Skip if dropped in same position
      if (oldIndex === newIndex) {
        return;
      }

      // Handle section reordering
      if (type === "SECTION" && sourceContainerId === "sections") {
        const sortedSections = [...sections].sort((a, b) => a.order - b.order);
        const reordered = arrayMove(sortedSections, oldIndex, newIndex);
        await reorderSections(reordered);
        return;
      }

      // Handle task reordering within the same section
      if (type === "TASK" && sourceContainerId.startsWith("today-section|")) {
        const sectionId = sourceContainerId.split("|")[1];
        const taskId = extractTaskId(draggableId);

        // Use the reorderTask function which handles the reordering logic
        await reorderTask(taskId, sectionId, sectionId, newIndex);
        return;
      }

      // Handle backlog task reordering
      if (type === "TASK" && sourceContainerId === "backlog") {
        const taskId = extractTaskId(draggableId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Get all backlog tasks sorted by order
        const sortedBacklogTasks = backlogTasks
          .map(t => tasks.find(fullTask => fullTask.id === t.id))
          .filter(Boolean)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Use arrayMove to reorder
        const reordered = arrayMove(sortedBacklogTasks, oldIndex, newIndex);

        // Update order for all affected tasks using batch API
        try {
          const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
          await batchReorderTasks(updates);
        } catch {
          toast({
            title: "Error",
            description: "Failed to reorder backlog tasks",
            status: "error",
            duration: 3000,
          });
        }
        return;
      }

      // Subtask reordering is now handled in the task dialog, not via drag-and-drop
    }

    // Handle cross-container moves (backlog ↔ sections ↔ calendar ↔ kanban)
    // Handle kanban column drops (moving between columns or from other containers)
    if (type === "TASK" && destContainerId) {
      const destParsed = parseDroppableId(destContainerId);

      if (destParsed.type === "kanban-column") {
        const newStatus = destParsed.status;
        const taskId = extractTaskId(draggableId);
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const sourceParsed = sourceContainerId ? parseDroppableId(sourceContainerId) : null;
        const isSameColumn = sourceParsed?.type === "kanban-column" && sourceParsed.status === newStatus;

        // Get all tasks in the destination column
        const destColumnTasks = tasks
          .filter(t => {
            if (t.completionType === "note") return false;
            if (t.recurrence && t.recurrence.type !== "none") return false;
            if (t.parentId) return false;
            return t.status === newStatus;
          })
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // If task status is the same, it's a reorder within the same column
        if (isSameColumn) {
          // Find the old and new indices
          const oldIndex = destColumnTasks.findIndex(t => t.id === taskId);
          const newIndex = overSortable?.index ?? destColumnTasks.length;

          // Skip if no change
          if (oldIndex === newIndex || oldIndex === -1) {
            return;
          }

          // Use arrayMove to reorder
          const reordered = arrayMove(destColumnTasks, oldIndex, newIndex);

          // Update order for all affected tasks using batch API
          try {
            const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
            await batchReorderTasks(updates);
          } catch {
            toast({
              title: "Error",
              description: "Failed to reorder Kanban tasks",
              status: "error",
              duration: 3000,
            });
          }
          return;
        }

        // Moving from different column or from outside Kanban
        // Calculate new order position from sortable index
        const destIndex = overSortable?.index ?? destColumnTasks.length;
        const reordered = [...destColumnTasks];
        reordered.splice(destIndex, 0, task);

        // Update status
        await handleStatusChange(taskId, newStatus);

        // Update order for all affected tasks using batch API
        try {
          const updates = reordered.map((t, idx) => ({ id: t.id, order: idx }));
          await batchReorderTasks(updates);
        } catch {
          toast({
            title: "Error",
            description: "Failed to reorder Kanban tasks",
            status: "error",
            duration: 3000,
          });
        }
        return;
      }
    }

    // Handle section-to-section moves directly
    if (type === "TASK" && sourceContainerId && destContainerId) {
      const sourceParsed = parseDroppableId(sourceContainerId);
      const destParsed = parseDroppableId(destContainerId);

      // Only handle section-to-section moves here (both source and dest must be sections)
      if (sourceParsed.type === "today-section" && destParsed.type === "today-section") {
        const taskId = extractTaskId(draggableId);

        // Find the task to get its current data
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
          console.error("Task not found:", taskId);
          return;
        }

        // Get source and target section IDs
        const sourceSectionId = sourceParsed.sectionId;
        const targetSectionId = destParsed.sectionId;

        // Calculate destination index
        // If dropping on a sortable item, use its index
        // If dropping on empty area, use the length of tasks in target section (append to end)
        let destIndex = 0;
        if (overSortable?.index !== undefined && overSortable.index !== null) {
          destIndex = overSortable.index;
        } else {
          // Dropping on empty area - append to end of target section
          const targetSectionTasks = tasksBySection[targetSectionId] || [];
          destIndex = targetSectionTasks.length;
        }

        // Validate section IDs and index
        if (!sourceSectionId || !targetSectionId) {
          console.error("Invalid section IDs", {
            sourceParsed,
            destParsed,
            sourceSectionId,
            targetSectionId,
            taskSectionId: task.sectionId,
            sourceContainerId,
            destContainerId,
            draggableId,
          });
          return;
        }
        if (typeof destIndex !== "number" || destIndex < 0) {
          console.error("Invalid destination index", { destIndex, overSortable });
          return;
        }

        // Verify sections exist
        const sourceSection = sections.find(s => s.id === sourceSectionId);
        const targetSection = sections.find(s => s.id === targetSectionId);
        if (!sourceSection || !targetSection) {
          console.error("Section not found", {
            sourceSectionId,
            targetSectionId,
            availableSections: sections.map(s => s.id),
          });
          return;
        }

        // Clear any drop time since we're moving to a section (not calendar)
        dropTimeRef.current = null;

        // Use the selected date in Today View (todayViewDate), or fall back to today
        const targetDate = viewDate || today;
        const targetDateStr = formatLocalDate(targetDate);

        // Preserve existing recurrence if it exists, otherwise set to none with today's date
        // For recurring tasks, preserve everything. For one-time tasks, update date if different.
        const currentDateStr = task.recurrence?.startDate?.split("T")[0];
        const needsDateUpdate = currentDateStr !== targetDateStr;

        // Reorder the task (this handles section change and order)
        // eslint-disable-next-line no-console
        console.log("Reordering task:", {
          taskId,
          sourceSectionId,
          targetSectionId,
          destIndex,
          sourceContainerId,
          destContainerId,
        });
        await reorderTask(taskId, sourceSectionId, targetSectionId, destIndex);

        // Apply recurrence updates only for one-time tasks when date changed
        // Preserve existing time - don't clear it
        if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
          // Recurring task - no updates needed, preserve everything
        } else if (needsDateUpdate || !task.recurrence) {
          // One-time task - update date if different or initialize recurrence
          const recurrenceUpdate = {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          };
          await updateTask(taskId, {
            recurrence: recurrenceUpdate,
          });
        }
        // If date is the same and recurrence exists, no updates needed

        return;
      }
    }

    // Convert to the format expected by handleDragEnd for other cross-container moves
    const sourceIndex = activeSortable?.index ?? 0;
    const destIndex = overSortable?.index ?? 0;

    // Ensure destContainerId is set
    if (!destContainerId) {
      console.error("Destination container ID not set", { over, overSortable, overDroppable });
      return;
    }

    const result = {
      draggableId,
      type,
      source: {
        droppableId: sourceContainerId || "unknown",
        index: sourceIndex,
      },
      destination: {
        droppableId: destContainerId,
        index: destIndex,
      },
    };

    await handleDragEnd(result);
  };

  // Show loading while:
  // 1. Auth is not yet initialized (still checking if user has valid session)
  // 2. Auth is loading
  // This ensures we never show the login form while auth check is in progress
  if (!authInitialized || authLoading) {
    return <PageSkeleton showBacklog={false} showDashboard={false} showCalendar={false} />;
  }

  // Now auth is fully initialized - show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // User is authenticated - show loading while data/preferences load
  if (isLoading && tasks.length === 0 && sections.length === 0) {
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
              <Box as="span" color="orange.500">
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
                onClick={() => setTagEditorOpen(true)}
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
                      onClick={() => setBacklogOpen(!backlogOpen)}
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
                        bg="red.500"
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
                    onClick={() => setShowDashboard(!showDashboard)}
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
                    onClick={() => setShowCalendar(!showCalendar)}
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
                      gradientFrom="blue.500"
                      gradientTo="green.500"
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
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
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
                    borderBottomColor="blue.500"
                    color={mobileActiveView === "backlog" ? "blue.500" : textColor}
                    onClick={() => setMobileActiveView("backlog")}
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
                    borderBottomColor="blue.500"
                    color={mobileActiveView === "today" ? "blue.500" : textColor}
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
                    <KanbanView
                      tasks={tasks}
                      onTaskClick={handleEditTask}
                      onCreateTask={({ status }) => {
                        setDefaultSectionId(sections[0]?.id);
                        setEditingTask({ status });
                        openTaskDialog();
                      }}
                      onCreateTaskInline={handleCreateKanbanTaskInline}
                      createDraggableId={createDraggableId}
                      isCompletedOnDate={isCompletedOnDate}
                      getOutcomeOnDate={getOutcomeOnDate}
                      onOutcomeChange={handleOutcomeChange}
                      onEditTask={handleEditTask}
                      onDuplicateTask={handleDuplicateTask}
                      onDeleteTask={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      tags={tags}
                      onTagsChange={handleTaskTagsChange}
                      onCreateTag={createTag}
                      recentlyCompletedTasks={recentlyCompletedTasks}
                      viewDate={viewDate}
                      selectedTaskIds={selectedTaskIds}
                      onTaskSelect={handleTaskSelect}
                      onBulkEdit={handleBulkEdit}
                      onBeginWorkout={handleBeginWorkout}
                      onEditWorkout={handleEditWorkout}
                    />
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
                      onSidebarToggle={() => setNotesSidebarOpen(!notesSidebarOpen)}
                      onSidebarResize={setNotesSidebarWidth}
                      noteListOpen={notesListOpen}
                      noteListWidth={notesListWidth}
                      onNoteListToggle={() => setNotesListOpen(!notesListOpen)}
                      onNoteListResize={setNotesListWidth}
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
                    />
                  </Box>
                )}

                {/* Tasks Tab - Mobile */}
                {mainTabIndex === 0 && (
                  <>
                    {mobileActiveView === "backlog" && (
                      <Box h="100%" overflow="auto">
                        {isLoading ? (
                          <BacklogSkeleton />
                        ) : (
                          <BacklogDrawer
                            onClose={() => setMobileActiveView("today")}
                            backlogTasks={backlogTasks}
                            sections={sections}
                            onDeleteTask={handleDeleteTask}
                            onEditTask={handleEditTask}
                            onEditWorkout={handleEditWorkout}
                            onUpdateTaskTitle={handleUpdateTaskTitle}
                            onDuplicateTask={handleDuplicateTask}
                            onAddTask={handleAddTaskToBacklog}
                            onCreateBacklogTaskInline={handleCreateBacklogTaskInline}
                            onToggleExpand={handleToggleExpand}
                            onToggleSubtask={handleToggleSubtask}
                            onToggleTask={handleToggleTask}
                            createDraggableId={createDraggableId}
                            viewDate={today}
                            tags={tags}
                            onTagsChange={handleTaskTagsChange}
                            onCreateTag={createTag}
                            onOutcomeChange={handleOutcomeChange}
                            getOutcomeOnDate={getOutcomeOnDate}
                            hasRecordOnDate={hasRecordOnDate}
                            onCompleteWithNote={handleCompleteWithNote}
                            onSkipTask={handleNotCompletedTask}
                            getCompletionForDate={getCompletionForDate}
                            selectedTaskIds={selectedTaskIds}
                            onTaskSelect={handleTaskSelect}
                            onBulkEdit={handleBulkEdit}
                            onBeginWorkout={handleBeginWorkout}
                          />
                        )}
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
                              onTagSelect={handleTodayTagSelect}
                              onTagDeselect={handleTodayTagDeselect}
                              onCreateTag={createTag}
                            />
                          </HStack>
                        </Box>

                        {/* Sections */}
                        <Section
                          sections={computedSections}
                          tasksBySection={tasksBySection}
                          onToggleTask={handleToggleTask}
                          onToggleSubtask={handleToggleSubtask}
                          onToggleExpand={handleToggleExpand}
                          onEditTask={handleEditTask}
                          onEditWorkout={handleEditWorkout}
                          onUpdateTaskTitle={handleUpdateTaskTitle}
                          onDeleteTask={handleDeleteTask}
                          onDuplicateTask={handleDuplicateTask}
                          onAddTask={handleAddTask}
                          onCreateTaskInline={handleCreateTaskInline}
                          onEditSection={handleEditSection}
                          onDeleteSection={handleDeleteSection}
                          onAddSection={handleAddSection}
                          onToggleSectionExpand={handleToggleSectionExpand}
                          createDroppableId={createDroppableId}
                          createDraggableId={createDraggableId}
                          viewDate={viewDate}
                          onOutcomeChange={handleOutcomeChange}
                          getOutcomeOnDate={getOutcomeOnDate}
                          hasRecordOnDate={hasRecordOnDate}
                          onCompleteWithNote={handleCompleteWithNote}
                          onSkipTask={handleNotCompletedTask}
                          getCompletionForDate={getCompletionForDate}
                          selectedTaskIds={selectedTaskIds}
                          onTaskSelect={handleTaskSelect}
                          onBulkEdit={handleBulkEdit}
                          onBeginWorkout={handleBeginWorkout}
                          tags={tags}
                          onTagsChange={handleTaskTagsChange}
                          onCreateTag={createTag}
                        />
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
                              setSelectedDate(d);
                            }}
                            onPrevious={() => navigateCalendar(-1)}
                            onNext={() => navigateCalendar(1)}
                            onToday={() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              setSelectedDate(today);
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
                                onTagSelect={handleCalendarTagSelect}
                                onTagDeselect={handleCalendarTagDeselect}
                                onCreateTag={createTag}
                              />
                            </HStack>
                          </Box>
                        </Box>

                        {/* Calendar View */}
                        <Box flex={1} overflow="auto">
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
                                    tasks={filteredTasks}
                                    onTaskClick={handleEditTask}
                                    onTaskTimeChange={handleTaskTimeChange}
                                    onTaskDurationChange={handleTaskDurationChange}
                                    onCreateTask={handleCreateTaskFromCalendar}
                                    onDropTimeChange={time => {
                                      dropTimeRef.current = time;
                                    }}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    getCompletionForDate={getCompletionForDate}
                                    showCompleted={showCompletedTasksCalendar.day}
                                    tags={tags}
                                    onTagsChange={handleTaskTagsChange}
                                    onCreateTag={createTag}
                                    showStatusTasks={_showStatusTasks.day}
                                    zoom={calendarZoom.day}
                                    onEditTask={handleEditTask}
                                    onEditWorkout={handleEditWorkout}
                                    onOutcomeChange={handleOutcomeChange}
                                    onDuplicateTask={handleDuplicateTask}
                                    onDeleteTask={handleDeleteTask}
                                  />
                                )}
                                {calendarView === "week" && selectedDate && (
                                  <CalendarWeekView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onTaskClick={handleEditTask}
                                    onDayClick={d => {
                                      setSelectedDate(d);
                                      setCalendarView("day");
                                    }}
                                    onTaskTimeChange={handleTaskTimeChange}
                                    onTaskDurationChange={handleTaskDurationChange}
                                    onCreateTask={handleCreateTaskFromCalendar}
                                    onDropTimeChange={time => {
                                      dropTimeRef.current = time;
                                    }}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    tags={tags}
                                    onTagsChange={handleTaskTagsChange}
                                    onCreateTag={createTag}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    getCompletionForDate={getCompletionForDate}
                                    showCompleted={showCompletedTasksCalendar.week}
                                    showStatusTasks={_showStatusTasks.week}
                                    zoom={calendarZoom.week}
                                    onEditTask={handleEditTask}
                                    onEditWorkout={handleEditWorkout}
                                    onOutcomeChange={handleOutcomeChange}
                                    onDuplicateTask={handleDuplicateTask}
                                    onDeleteTask={handleDeleteTask}
                                  />
                                )}
                                {calendarView === "month" && selectedDate && (
                                  <CalendarMonthView
                                    date={selectedDate}
                                    tasks={filteredTasks}
                                    onDayClick={d => {
                                      setSelectedDate(d);
                                      setCalendarView("day");
                                    }}
                                    isCompletedOnDate={isCompletedOnDate}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    showCompleted={showCompletedTasksCalendar.month}
                                    zoom={calendarZoom.month}
                                    tags={tags}
                                    onCreateTag={createTag}
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
                    <KanbanView
                      tasks={tasks}
                      onTaskClick={handleEditTask}
                      onCreateTask={({ status }) => {
                        setDefaultSectionId(sections[0]?.id);
                        setEditingTask({ status });
                        openTaskDialog();
                      }}
                      onCreateTaskInline={handleCreateKanbanTaskInline}
                      createDraggableId={createDraggableId}
                      isCompletedOnDate={isCompletedOnDate}
                      getOutcomeOnDate={getOutcomeOnDate}
                      onOutcomeChange={handleOutcomeChange}
                      onEditTask={handleEditTask}
                      onDuplicateTask={handleDuplicateTask}
                      onDeleteTask={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      tags={tags}
                      onTagsChange={handleTaskTagsChange}
                      onCreateTag={createTag}
                      recentlyCompletedTasks={recentlyCompletedTasks}
                      viewDate={viewDate}
                      selectedTaskIds={selectedTaskIds}
                      onTaskSelect={handleTaskSelect}
                      onBulkEdit={handleBulkEdit}
                      onBeginWorkout={handleBeginWorkout}
                      onEditWorkout={handleEditWorkout}
                    />
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
                      onSidebarToggle={() => setNotesSidebarOpen(!notesSidebarOpen)}
                      onSidebarResize={setNotesSidebarWidth}
                      noteListOpen={notesListOpen}
                      noteListWidth={notesListWidth}
                      onNoteListToggle={() => setNotesListOpen(!notesListOpen)}
                      onNoteListResize={setNotesListWidth}
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
                  />
                ) : (
                  /* Tasks Tab Content (mainTabIndex === 0) */
                  <Box w="full" h="full" display="flex" maxW="100%" overflow="hidden">
                    {/* Backlog Section - only show on Tasks tab */}
                    {mainTabIndex === 0 && backlogOpen && (
                      <>
                        <Box
                          w={`${isResizing && resizeType === "backlog" ? localBacklogWidth : backlogWidth}px`}
                          h="100%"
                          transition={isResizing && resizeType === "backlog" ? "none" : "width 0.3s"}
                          overflow="hidden"
                          borderRightWidth="1px"
                          borderColor={borderColor}
                          bg={bgColor}
                          flexShrink={0}
                          display="flex"
                          flexDirection="column"
                          position="relative"
                        >
                          {isLoading ? (
                            <BacklogSkeleton />
                          ) : (
                            <BacklogDrawer
                              onClose={null}
                              backlogTasks={backlogTasks}
                              sections={sections}
                              onDeleteTask={handleDeleteTask}
                              onEditTask={handleEditTask}
                              onEditWorkout={handleEditWorkout}
                              onUpdateTaskTitle={handleUpdateTaskTitle}
                              onDuplicateTask={handleDuplicateTask}
                              onAddTask={handleAddTaskToBacklog}
                              onCreateBacklogTaskInline={handleCreateBacklogTaskInline}
                              onToggleExpand={handleToggleExpand}
                              onToggleSubtask={handleToggleSubtask}
                              onToggleTask={handleToggleTask}
                              createDraggableId={createDraggableId}
                              viewDate={today}
                              tags={tags}
                              onTagsChange={handleTaskTagsChange}
                              onCreateTag={createTag}
                              onOutcomeChange={handleOutcomeChange}
                              getOutcomeOnDate={getOutcomeOnDate}
                              hasRecordOnDate={hasRecordOnDate}
                              onCompleteWithNote={handleCompleteWithNote}
                              onSkipTask={handleNotCompletedTask}
                              getCompletionForDate={getCompletionForDate}
                              selectedTaskIds={selectedTaskIds}
                              onTaskSelect={handleTaskSelect}
                              onBulkEdit={handleBulkEdit}
                              onBeginWorkout={handleBeginWorkout}
                            />
                          )}
                          {/* Resize handle between backlog and today */}
                          <Box
                            position="absolute"
                            right={0}
                            top={0}
                            bottom={0}
                            w="4px"
                            cursor="col-resize"
                            bg={isResizing && resizeType === "backlog" ? "blue.400" : "transparent"}
                            _hover={{ bg: "blue.300" }}
                            transition="background-color 0.2s"
                            onMouseDown={handleBacklogResizeStart}
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
                                ? `${isResizing && resizeType === "today" ? localTodayViewWidth : todayViewWidth}px`
                                : "100%"
                            }
                            h="100%"
                            transition={isResizing && resizeType === "today" ? "none" : "width 0.3s"}
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
                                        onTagSelect={handleTodayTagSelect}
                                        onTagDeselect={handleTodayTagDeselect}
                                        onCreateTag={createTag}
                                      />
                                    </HStack>
                                  </Box>
                                </Box>
                                {/* Scrollable Sections Container */}
                                <Box flex={1} overflowY="auto" minH={0} w="100%" maxW="100%">
                                  <Section
                                    sections={computedSections}
                                    tasksBySection={tasksBySection}
                                    onToggleTask={handleToggleTask}
                                    onToggleSubtask={handleToggleSubtask}
                                    onToggleExpand={handleToggleExpand}
                                    onEditTask={handleEditTask}
                                    onEditWorkout={handleEditWorkout}
                                    onUpdateTaskTitle={handleUpdateTaskTitle}
                                    onDeleteTask={handleDeleteTask}
                                    onDuplicateTask={handleDuplicateTask}
                                    onAddTask={handleAddTask}
                                    onCreateTaskInline={handleCreateTaskInline}
                                    onEditSection={handleEditSection}
                                    onDeleteSection={handleDeleteSection}
                                    onAddSection={handleAddSection}
                                    onToggleSectionExpand={handleToggleSectionExpand}
                                    createDroppableId={createDroppableId}
                                    createDraggableId={createDraggableId}
                                    viewDate={todayViewDate || today}
                                    onOutcomeChange={handleOutcomeChange}
                                    getOutcomeOnDate={getOutcomeOnDate}
                                    hasRecordOnDate={hasRecordOnDate}
                                    onCompleteWithNote={handleCompleteWithNote}
                                    onSkipTask={handleNotCompletedTask}
                                    getCompletionForDate={getCompletionForDate}
                                    selectedTaskIds={selectedTaskIds}
                                    onTaskSelect={handleTaskSelect}
                                    onBulkEdit={handleBulkEdit}
                                    onBeginWorkout={handleBeginWorkout}
                                    tags={tags}
                                    onTagsChange={handleTaskTagsChange}
                                    onCreateTag={createTag}
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
                                bg={isResizing && resizeType === "today" ? "blue.400" : "transparent"}
                                _hover={{ bg: "blue.300" }}
                                transition="background-color 0.2s"
                                onMouseDown={handleTodayResizeStart}
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
                                setSelectedDate(d);
                              }}
                              onPrevious={() => navigateCalendar(-1)}
                              onNext={() => navigateCalendar(1)}
                              onToday={() => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                setSelectedDate(today);
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
                                  onTagSelect={handleCalendarTagSelect}
                                  onTagDeselect={handleCalendarTagDeselect}
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
                                          tasks={filteredTasks}
                                          onTaskClick={handleEditTask}
                                          onTaskTimeChange={handleTaskTimeChange}
                                          onTaskDurationChange={handleTaskDurationChange}
                                          onCreateTask={handleCreateTaskFromCalendar}
                                          onDropTimeChange={time => {
                                            dropTimeRef.current = time;
                                          }}
                                          createDroppableId={createDroppableId}
                                          createDraggableId={createDraggableId}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.day}
                                          zoom={calendarZoom.day}
                                          tags={tags}
                                          onTagsChange={handleTaskTagsChange}
                                          onCreateTag={createTag}
                                          onEditTask={handleEditTask}
                                          onEditWorkout={handleEditWorkout}
                                          onOutcomeChange={handleOutcomeChange}
                                          onDuplicateTask={handleDuplicateTask}
                                          onDeleteTask={handleDeleteTask}
                                        />
                                      )}
                                      {calendarView === "week" && selectedDate && (
                                        <CalendarWeekView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onTaskClick={handleEditTask}
                                          onDayClick={d => {
                                            setSelectedDate(d);
                                            setCalendarView("day");
                                          }}
                                          onTaskTimeChange={handleTaskTimeChange}
                                          onTaskDurationChange={handleTaskDurationChange}
                                          onCreateTask={handleCreateTaskFromCalendar}
                                          onDropTimeChange={time => {
                                            dropTimeRef.current = time;
                                          }}
                                          createDroppableId={createDroppableId}
                                          createDraggableId={createDraggableId}
                                          tags={tags}
                                          onTagsChange={handleTaskTagsChange}
                                          onCreateTag={createTag}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.week}
                                          zoom={calendarZoom.week}
                                          onEditTask={handleEditTask}
                                          onEditWorkout={handleEditWorkout}
                                          onOutcomeChange={handleOutcomeChange}
                                          onDuplicateTask={handleDuplicateTask}
                                          onDeleteTask={handleDeleteTask}
                                        />
                                      )}
                                      {calendarView === "month" && selectedDate && (
                                        <CalendarMonthView
                                          date={selectedDate}
                                          tasks={filteredTasks}
                                          onDayClick={d => {
                                            setSelectedDate(d);
                                            setCalendarView("day");
                                          }}
                                          isCompletedOnDate={isCompletedOnDate}
                                          getOutcomeOnDate={getOutcomeOnDate}
                                          showCompleted={showCompletedTasksCalendar.month}
                                          zoom={calendarZoom.month}
                                          tags={tags}
                                          onCreateTag={createTag}
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
            marginLeft: `${dragState.offset.x}px`,
            marginTop: `${dragState.offset.y}px`,
          }}
        >
          {dragState.activeTask ? (
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
                {dragState.activeTask.title}
              </Text>
            </Box>
          ) : dragState.activeId?.startsWith("section-") ? (
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
                {sections.find(s => `section-${s.id}` === dragState.activeId)?.name || "Section"}
              </Text>
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <TaskDialog
        isOpen={taskDialogOpen}
        onClose={() => {
          closeTaskDialog();
          setEditingTask(null);
          setDefaultSectionId(null);
          setDefaultTime(null);
          setDefaultDate(null);
        }}
        task={editingTask}
        sections={sections}
        onSave={handleSaveTask}
        defaultSectionId={defaultSectionId}
        defaultTime={defaultTime}
        defaultDate={defaultDate}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        allTasks={tasks}
      />
      <SectionDialog
        isOpen={sectionDialogOpen}
        onClose={() => {
          closeSectionDialog();
          setEditingSection(null);
        }}
        section={editingSection}
        onSave={handleSaveSection}
      />
      <TagEditor
        isOpen={tagEditorOpen}
        onClose={() => setTagEditorOpen(false)}
        tags={tags}
        onCreateTag={createTag}
        onUpdateTag={updateTag}
        onDeleteTag={deleteTag}
      />
      <BulkEditDialog
        isOpen={bulkEditDialogOpen}
        onClose={() => {
          setBulkEditDialogOpen(false);
        }}
        onSave={handleBulkEditSave}
        sections={sections}
        tags={tags}
        onCreateTag={createTag}
        onDeleteTag={deleteTag}
        selectedCount={selectedTaskIds.size}
        selectedTasks={tasks.filter(t => selectedTaskIds.has(t.id))}
      />
      <WorkoutModal
        task={workoutModalTask}
        isOpen={workoutModalOpen}
        onClose={() => {
          setWorkoutModalOpen(false);
          setWorkoutModalTask(null);
        }}
        onSaveProgress={handleSaveWorkoutProgress}
        onCompleteTask={(taskId, date) => {
          createCompletion(taskId, date, { outcome: "completed" });
        }}
        currentDate={viewDate}
      />
      <WorkoutBuilder
        key={editingWorkoutTask?.id || "new"}
        isOpen={Boolean(editingWorkoutTask)}
        onClose={() => setEditingWorkoutTask(null)}
        onSave={workoutData => {
          if (editingWorkoutTask) {
            updateTask(editingWorkoutTask.id, { workoutData });
          }
          setEditingWorkoutTask(null);
        }}
        initialData={editingWorkoutTask?.workoutData}
      />
    </Box>
  );
}

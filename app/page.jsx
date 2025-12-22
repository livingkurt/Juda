"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Select,
  HStack,
  Text,
  Flex,
  IconButton,
  useColorModeValue,
  useToast,
  Card,
  CardBody,
  Heading,
  Badge,
  Tabs,
  TabList,
  Tab,
  useDisclosure,
} from "@chakra-ui/react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferencesContext } from "@/contexts/PreferencesContext";
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
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
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
import { DashboardView } from "@/components/DashboardView";
import { PageSkeleton, SectionSkeleton, BacklogSkeleton, CalendarSkeleton } from "@/components/Skeletons";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";

// eslint-disable-next-line react-refresh/only-export-components
export { createDroppableId, createDraggableId, extractTaskId };

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
  const toast = useToast();
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const headerBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const progressBarBg = useColorModeValue("gray.200", "gray.700");
  const dragOverlayBg = useColorModeValue("blue.100", "blue.800");
  const dragOverlayBorder = useColorModeValue("blue.400", "blue.500");
  const dragOverlayText = useColorModeValue("blue.900", "blue.100");

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    reorderTask,
    duplicateTask,
    saveTask,
    batchReorderTasks,
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
  const { createCompletion, deleteCompletion, isCompletedOnDate, fetchCompletions } = useCompletions();
  const { tags, createTag, deleteTag } = useTags();

  // Get preferences from context
  const { preferences, initialized: prefsInitialized, updatePreference } = usePreferencesContext();

  // Use synced color mode
  // const { colorMode, toggleColorMode } = useColorModeSync(); // Already imported above

  // Destructure preferences for easier access
  const {
    showDashboard,
    showCalendar,
    backlogOpen,
    backlogWidth,
    calendarView,
    calendarZoom,
    showCompletedTasks,
    showRecurringTasks,
    showCompletedTasksCalendar,
  } = preferences;

  // Create setter functions that update preferences
  const setShowDashboard = useCallback(value => updatePreference("showDashboard", value), [updatePreference]);
  const setShowCalendar = useCallback(value => updatePreference("showCalendar", value), [updatePreference]);
  const setBacklogOpen = useCallback(value => updatePreference("backlogOpen", value), [updatePreference]);
  const setBacklogWidth = useCallback(value => updatePreference("backlogWidth", value), [updatePreference]);
  const setCalendarView = useCallback(value => updatePreference("calendarView", value), [updatePreference]);
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

  const isLoading = tasksLoading || sectionsLoading || !prefsInitialized;

  // Initialize state with default values (same on server and client)
  const [mainTabIndex, setMainTabIndex] = useState(0); // 0 = Tasks, 1 = History
  const [isResizing, setIsResizing] = useState(false);
  // Initialize selectedDate to null, then set it in useEffect to avoid hydration mismatch
  const [selectedDate, setSelectedDate] = useState(null);
  // Initialize todayViewDate to null, then set it in useEffect to avoid hydration mismatch
  const [todayViewDate, setTodayViewDate] = useState(null);
  // Search state for Today view
  const [todaySearchTerm, setTodaySearchTerm] = useState("");
  const [todaySelectedTagIds, setTodaySelectedTagIds] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [defaultSectionId, setDefaultSectionId] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  // Store drop time calculated from mouse position during drag
  const dropTimeRef = useRef(null);
  // Track active drag item for DragOverlay
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Track recently completed tasks that should remain visible for a delay
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
  const recentlyCompletedTimeoutsRef = useRef({});

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
    }
  }, [showCompletedTasks]);

  const { isOpen: taskDialogOpen, onOpen: openTaskDialog, onClose: closeTaskDialog } = useDisclosure();
  const { isOpen: sectionDialogOpen, onOpen: openSectionDialog, onClose: closeSectionDialog } = useDisclosure();

  // Resize handlers for backlog drawer
  const resizeStartRef = useRef(null);

  // Track which calendar droppable we're over for time calculation
  const currentCalendarDroppableRef = useRef(null);
  const mouseMoveListenerRef = useRef(null);
  const handleResizeStart = e => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startWidth: backlogWidth,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = e => {
      if (!resizeStartRef.current) return;
      const deltaX = e.clientX - resizeStartRef.current.startX;
      const newWidth = Math.max(300, Math.min(800, resizeStartRef.current.startWidth + deltaX));
      setBacklogWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, backlogWidth, setBacklogWidth]);

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
        .filter(task => shouldShowOnDate(task, viewDate))
        .map(task => ({
          ...task,
          // Override completed field with the selected date's completion record status
          completed: isCompletedOnDate(task.id, viewDate),
        })),
    [tasks, viewDate, isCompletedOnDate]
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
      // Filter out completed tasks if showCompletedTasks is false
      // But keep recently completed tasks visible for a delay period
      if (!showCompletedTasks) {
        sectionTasks = sectionTasks.filter(t => {
          const isCompleted =
            t.completed || (t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed));
          // Keep task visible if it's recently completed (within delay period)
          if (isCompleted && recentlyCompletedTasks.has(t.id)) {
            return true;
          }
          return !isCompleted;
        });
      }
      grouped[s.id] = sectionTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [filteredTodaysTasks, sections, showCompletedTasks, recentlyCompletedTasks]);

  // Tasks for backlog: no recurrence AND no time, or recurrence doesn't match today
  // Exclude tasks with future dates/times
  // Note: Backlog is always relative to today, not the selected date in Today View
  const backlogTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // Don't use task.completed field - use completion records instead
        if (shouldShowOnDate(task, today)) return false;
        // Exclude tasks with future date/time
        if (hasFutureDateTime(task)) return false;
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(task => ({
        ...task,
        // Add completion status from records for display
        completed: isCompletedOnDate(task.id, today),
      }));
  }, [tasks, today, isCompletedOnDate]);

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

  // Task handlers
  const handleToggleTask = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if task has no recurrence (appears in backlog)
    const hasNoRecurrence = !task.recurrence;

    // Determine which date to use: viewDate for Today View, today for backlog
    const targetDate = hasNoRecurrence ? today : viewDate;
    const isCompletedOnTargetDate = isCompletedOnDate(taskId, targetDate);

    try {
      // Get current time when checking
      const now = new Date();
      const currentTime = minutesToTime(now.getHours() * 60 + now.getMinutes());

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
        });
      }
      // If task is in Today View and doesn't have a time, set it to current time when checking
      else if (!hasNoRecurrence && !task.time && !isCompletedOnTargetDate) {
        // Task already has a date (from recurrence), just set the time
        await updateTask(taskId, {
          time: currentTime,
        });
      }

      // Update completion record
      if (isCompletedOnTargetDate) {
        // Task is completed on the target date, remove completion record
        await deleteCompletion(taskId, targetDate.toISOString());

        // If hiding completed tasks, remove from recently completed set immediately when unchecked
        if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
          setRecentlyCompletedTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          // Clear any pending timeout
          if (recentlyCompletedTimeoutsRef.current[taskId]) {
            clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
            delete recentlyCompletedTimeoutsRef.current[taskId];
          }
        }
      } else {
        // Task is not completed on the target date, create completion record
        // Add to recently completed set BEFORE creating completion to prevent flash
        if (!showCompletedTasks) {
          setRecentlyCompletedTasks(prev => new Set(prev).add(taskId));

          // Clear any existing timeout for this task
          if (recentlyCompletedTimeoutsRef.current[taskId]) {
            clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
          }

          // Set timeout to remove from recently completed after 2 seconds
          recentlyCompletedTimeoutsRef.current[taskId] = setTimeout(() => {
            setRecentlyCompletedTasks(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
            delete recentlyCompletedTimeoutsRef.current[taskId];
          }, 2000);
        }

        // Create completion record after adding to recently completed set
        try {
          await createCompletion(taskId, targetDate.toISOString());
        } catch (completionError) {
          // If completion creation fails, remove from recently completed set
          if (!showCompletedTasks && recentlyCompletedTasks.has(taskId)) {
            setRecentlyCompletedTasks(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
            if (recentlyCompletedTimeoutsRef.current[taskId]) {
              clearTimeout(recentlyCompletedTimeoutsRef.current[taskId]);
              delete recentlyCompletedTimeoutsRef.current[taskId];
            }
          }
          throw completionError;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error toggling task completion:", error);
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    // Subtasks are now full tasks, just toggle the subtask directly
    await handleToggleTask(subtaskId);
  };

  const handleToggleExpand = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, { expanded: !task.expanded });
  };

  const handleEditTask = task => {
    setEditingTask(task);
    setDefaultSectionId(null);
    setDefaultTime(null);
    openTaskDialog();
  };

  const handleUpdateTaskTitle = async (taskId, newTitle) => {
    if (!newTitle.trim()) return;
    await updateTask(taskId, { title: newTitle.trim() });
  };

  const handleDeleteTask = async taskId => {
    await deleteTask(taskId);
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

      await createTask({
        title: title.trim(),
        sectionId,
        time: null,
        duration: 0,
        color: "#3b82f6",
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

  const handleTodayTagSelect = useCallback(tagId => {
    setTodaySelectedTagIds(prev => [...prev, tagId]);
  }, []);

  const handleTodayTagDeselect = useCallback(tagId => {
    setTodaySelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  const handleTaskTimeChange = async (taskId, newTime) => {
    await updateTask(taskId, { time: newTime });
  };

  const handleTaskDurationChange = async (taskId, newDuration) => {
    await updateTask(taskId, { duration: newDuration });
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
      // Extract task ID from context-aware draggable ID
      const taskId = extractTaskId(draggableId);
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        dropTimeRef.current = null;
        return;
      }

      const sourceParsed = parseDroppableId(source.droppableId);
      const destParsed = parseDroppableId(destination.droppableId);

      // Get the calculated drop time (if dropping on timed calendar area)
      const calculatedTime = dropTimeRef.current || "09:00";
      dropTimeRef.current = null;

      // Determine what updates to make based on source and destination
      let updates = {};

      // DESTINATION: Backlog - clear date, time, and recurrence
      if (destParsed.type === "backlog") {
        updates = {
          time: null,
          recurrence: null,
        };
      }
      // DESTINATION: Today section - set date to the selected date in Today View, clear time, preserve recurrence
      else if (destParsed.type === "today-section") {
        // Don't set sectionId here - let the reordering logic below handle it
        // Use the selected date in Today View (todayViewDate), or fall back to today
        const targetDate = viewDate || today;
        const targetDateStr = formatLocalDate(targetDate);

        // Preserve existing recurrence if it exists, otherwise set to none with today's date
        let recurrenceUpdate;
        if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
          // Preserve the recurrence pattern (daily, weekly, etc.)
          recurrenceUpdate = task.recurrence;
        } else {
          // No recurrence or type is "none" - set to none with the selected date
          recurrenceUpdate = {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          };
        }

        updates = {
          time: null,
          recurrence: recurrenceUpdate,
        };
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

  const handleToggleSectionExpand = async sectionId => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    await updateSection(sectionId, { expanded: !(section.expanded !== false) });
  };

  // Calendar navigation
  const navigateCalendar = dir => {
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

  // Configure sensors for @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Slightly higher for more intentional drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = event => {
    const { active } = event;
    setActiveId(active.id);

    // Calculate offset from click position relative to the dragged element
    const activatorEvent = event.activatorEvent;
    if (activatorEvent && activatorEvent.offsetX !== undefined && activatorEvent.offsetY !== undefined) {
      // offsetX and offsetY are relative to the target element - perfect!
      const clickX = activatorEvent.offsetX;
      const clickY = activatorEvent.offsetY;

      // The DragOverlay positions its top-left at the cursor
      // We want the cursor to be at the click point, so we offset by the click position
      // minus half the preview size to center it
      setDragOffset({
        x: clickX - 90, // 90 is half of 180px preview width
        y: clickY - 20, // 20 is half of 40px preview height
      });
    } else {
      // Fallback: center the preview
      setDragOffset({ x: -90, y: -20 });
    }

    // Extract task ID and find the task (including subtasks)
    try {
      const taskId = extractTaskId(active.id);

      // Helper to recursively find a task (including subtasks)
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

      const task = findTask(tasks, taskId);
      setActiveTask(task);
    } catch (e) {
      // Not a task drag (might be section reorder)
      setActiveTask(null);
    }

    // Clear calendar droppable tracking
    currentCalendarDroppableRef.current = null;
    dropTimeRef.current = null;
  };

  // Handle drag over (for real-time updates like time calculation)
  const handleDragOver = event => {
    const { over } = event;

    if (over && over.id && typeof over.id === "string") {
      const droppableId = over.id;

      // Check if we're over a timed calendar area
      if (droppableId.startsWith("calendar-day|") || droppableId.startsWith("calendar-week|")) {
        currentCalendarDroppableRef.current = droppableId;

        // Set up mousemove listener if not already set
        if (!mouseMoveListenerRef.current) {
          const handleMouseMove = e => {
            if (!currentCalendarDroppableRef.current) return;

            // Find calendar timed area using data attribute
            const timedAreas = Array.from(document.querySelectorAll('[data-calendar-timed="true"]')).filter(el => {
              const rect = el.getBoundingClientRect();
              return (
                rect.top <= e.clientY && rect.bottom >= e.clientY && rect.left <= e.clientX && rect.right >= e.clientX
              );
            });

            if (timedAreas.length > 0) {
              const timedArea = timedAreas[0];
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

    setActiveId(null);
    setActiveTask(null);
    setDragOffset({ x: 0, y: 0 });

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
        sourceContainerId.startsWith("calendar-"));

    if (!sourceContainerId || !isValidContainerId) {
      // Infer from draggableId pattern
      if (draggableId.includes("-backlog")) {
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

      // Log if we had to fall back to draggableId extraction
      if (activeSortable?.containerId && !isValidContainerId) {
        // eslint-disable-next-line no-console
        console.warn("Invalid containerId from sortable, extracted from draggableId:", {
          originalContainerId: activeSortable.containerId,
          extractedContainerId: sourceContainerId,
          draggableId,
        });
      }
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
    if (over.id && (over.id === "backlog" || over.id.startsWith("today-section|") || over.id.startsWith("calendar-"))) {
      destContainerId = over.id;
    }
    // Priority 2: Use the sortable container ID (for tasks within sections)
    else if (overSortable?.containerId) {
      destContainerId = overSortable.containerId;
    }
    // Priority 3: Extract container ID from task draggableId pattern
    else if (over.id && over.id.startsWith("task-")) {
      if (over.id.includes("-today-section-")) {
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
      } else if (over.id.startsWith("today-section|")) {
        destContainerId = over.id;
      } else if (over.id.startsWith("calendar-")) {
        destContainerId = over.id;
      }
    }

    // Handle reordering within the same container using arrayMove
    if (activeSortable && overSortable && sourceContainerId === destContainerId && sourceContainerId) {
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
        } catch (err) {
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

    // Handle cross-container moves (backlog ↔ sections ↔ calendar)
    // First, handle section-to-section moves directly
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
        let recurrenceUpdate;
        if (task.recurrence && task.recurrence.type && task.recurrence.type !== "none") {
          recurrenceUpdate = task.recurrence;
        } else {
          recurrenceUpdate = {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          };
        }

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

        // Apply time/recurrence updates if needed (only if time should be cleared)
        await updateTask(taskId, {
          time: null,
          recurrence: recurrenceUpdate,
        });

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
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" bg={bgColor} color={textColor}>
      {/* Header */}
      <Box as="header" bg={headerBg} borderBottomWidth="1px" borderColor={borderColor} flexShrink={0}>
        <Box w="full" px={4} py={4}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <Box as="span" color="orange.500">
                <GreetingIcon size={28} stroke="currentColor" />
              </Box>
              <Box>
                <Heading as="h1" size="lg" fontWeight="semibold">
                  {greeting.text}
                </Heading>
                <Text fontSize="sm" color={mutedText}>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </Box>
            </Flex>
            <HStack spacing={2}>
              <IconButton
                icon={
                  <Box as="span" color="currentColor">
                    {colorMode === "dark" ? (
                      <Sun size={20} stroke="currentColor" />
                    ) : (
                      <Moon size={20} stroke="currentColor" />
                    )}
                  </Box>
                }
                onClick={toggleColorMode}
                variant="ghost"
                aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              />
              <IconButton
                icon={
                  <Box as="span" color="currentColor">
                    <LogOut size={20} stroke="currentColor" />
                  </Box>
                }
                onClick={logout}
                variant="ghost"
                colorScheme="red"
                aria-label="Logout"
              />
            </HStack>
          </Flex>

          {/* Main Tabs */}
          <Box mt={4}>
            <Tabs index={mainTabIndex} onChange={setMainTabIndex}>
              <TabList>
                <Tab>Tasks</Tab>
                <Tab>History</Tab>
              </TabList>
            </Tabs>
          </Box>

          {/* View toggles and calendar nav - only show in Tasks tab */}
          {mainTabIndex === 0 && (
            <Box mt={4}>
              <Flex align="center" justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Box position="relative">
                    <Button
                      size="sm"
                      variant={backlogOpen ? "solid" : "outline"}
                      colorScheme={backlogOpen ? "blue" : "gray"}
                      onClick={() => setBacklogOpen(!backlogOpen)}
                      leftIcon={
                        <Box as="span" color="currentColor">
                          <List size={16} stroke="currentColor" />
                        </Box>
                      }
                    >
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
                    colorScheme={showDashboard ? "blue" : "gray"}
                    onClick={() => setShowDashboard(!showDashboard)}
                    leftIcon={
                      <Box as="span" color="currentColor">
                        <LayoutDashboard size={16} stroke="currentColor" />
                      </Box>
                    }
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={showCalendar ? "solid" : "outline"}
                    colorScheme={showCalendar ? "blue" : "gray"}
                    onClick={() => setShowCalendar(!showCalendar)}
                    leftIcon={
                      <Box as="span" color="currentColor">
                        <Calendar size={16} stroke="currentColor" />
                      </Box>
                    }
                  >
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
                      bgGradient="linear(to-r, blue.500, green.500)"
                      transition="all"
                      style={{ width: `${progressPercent}%` }}
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
        <Box as="main" flex={1} overflow="hidden" display="flex">
          {/* Backlog Sidebar - only show on Tasks tab */}
          {mainTabIndex === 0 && (
            <Box
              w={backlogOpen ? `${backlogWidth}px` : "0"}
              h="100%"
              transition={isResizing ? "none" : "width 0.3s"}
              overflow="hidden"
              borderRightWidth={backlogOpen ? "1px" : "0"}
              borderColor={borderColor}
              bg={bgColor}
              flexShrink={0}
              display="flex"
              flexDirection="column"
              position="relative"
            >
              {backlogOpen && (
                <>
                  {isLoading ? (
                    <BacklogSkeleton />
                  ) : (
                    <BacklogDrawer
                      onClose={() => setBacklogOpen(false)}
                      backlogTasks={backlogTasks}
                      sections={sections}
                      onDeleteTask={handleDeleteTask}
                      onEditTask={handleEditTask}
                      onUpdateTaskTitle={handleUpdateTaskTitle}
                      onDuplicateTask={handleDuplicateTask}
                      onAddTask={handleAddTaskToBacklog}
                      onToggleExpand={handleToggleExpand}
                      onToggleSubtask={handleToggleSubtask}
                      onToggleTask={handleToggleTask}
                      createDraggableId={createDraggableId}
                      viewDate={today}
                      tags={tags}
                      onCreateTag={createTag}
                    />
                  )}
                  {/* Resize handle */}
                  <Box
                    position="absolute"
                    right={0}
                    top={0}
                    bottom={0}
                    w="4px"
                    cursor="col-resize"
                    bg={isResizing ? "blue.400" : "transparent"}
                    _hover={{ bg: "blue.300" }}
                    transition="background-color 0.2s"
                    onMouseDown={handleResizeStart}
                    zIndex={10}
                    sx={{ userSelect: "none" }}
                  />
                </>
              )}
            </Box>
          )}

          {/* Main Content Area */}
          <Box flex={1} overflow="hidden" display="flex" flexDirection="column">
            <Box flex={1} overflowY="auto">
              {mainTabIndex === 0 ? (
                /* Tasks Tab Content */
                <Box
                  w="full"
                  px={4}
                  py={6}
                  display="flex"
                  gap={6}
                  h="full"
                  justifyContent={!backlogOpen && !showCalendar && showDashboard ? "center" : "flex-start"}
                >
                  {/* Dashboard View */}
                  {showDashboard && (
                    <Box
                      flex={!backlogOpen && !showCalendar ? "0 1 auto" : 1}
                      minW={0}
                      maxW={!backlogOpen && !showCalendar ? "1250px" : "none"}
                      w={!backlogOpen && !showCalendar ? "full" : "auto"}
                      display="flex"
                      flexDirection="column"
                      overflow="hidden"
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
                          >
                            <Flex align="center" justify="space-between" mb={2}>
                              <Heading size="md">Today</Heading>
                              <Flex align="center" gap={2}>
                                <Badge colorScheme="blue">
                                  {filteredTodaysTasks.length} task{filteredTodaysTasks.length !== 1 ? "s" : ""}
                                  {todaySearchTerm &&
                                    filteredTodaysTasks.length !== todaysTasks.length &&
                                    ` of ${todaysTasks.length}`}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                                  leftIcon={
                                    <Box as="span" color="currentColor">
                                      {showCompletedTasks ? (
                                        <Eye size={16} stroke="currentColor" />
                                      ) : (
                                        <EyeOff size={16} stroke="currentColor" />
                                      )}
                                    </Box>
                                  }
                                  fontSize="sm"
                                  color={mutedText}
                                  _hover={{ color: textColor }}
                                >
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
                            <Box mt={3}>
                              <HStack spacing={4} align="center">
                                <Box flex={1}>
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
                          <Box flex={1} overflowY="auto" minH={0}>
                            <Section
                              sections={sortedSections}
                              tasksBySection={tasksBySection}
                              onToggleTask={handleToggleTask}
                              onToggleSubtask={handleToggleSubtask}
                              onToggleExpand={handleToggleExpand}
                              onEditTask={handleEditTask}
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
                            />
                          </Box>
                        </>
                      )}
                    </Box>
                  )}

                  {/* Calendar View */}
                  {showCalendar && (
                    <Box flex={1} minW={0} display="flex" flexDirection="column">
                      {/* Calendar Header */}
                      <Box mb={3} pb={3} borderBottomWidth="1px" borderColor={borderColor}>
                        <Flex align="center" justify="space-between" mb={2}>
                          <Heading size="md">Calendar</Heading>
                          <HStack spacing={2}>
                            <HStack spacing={1}>
                              <IconButton
                                size="sm"
                                variant="ghost"
                                icon={
                                  <Box as="span" color="currentColor">
                                    <ZoomOut size={16} stroke="currentColor" />
                                  </Box>
                                }
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
                              />
                              <Text fontSize="xs" color={mutedText} minW="40px" textAlign="center">
                                {Math.round(calendarZoom[calendarView] * 100)}%
                              </Text>
                              <IconButton
                                size="sm"
                                variant="ghost"
                                icon={
                                  <Box as="span" color="currentColor">
                                    <ZoomIn size={16} stroke="currentColor" />
                                  </Box>
                                }
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
                              />
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
                              leftIcon={
                                <Box as="span" color="currentColor">
                                  {showCompletedTasksCalendar[calendarView] ? (
                                    <Eye size={16} stroke="currentColor" />
                                  ) : (
                                    <EyeOff size={16} stroke="currentColor" />
                                  )}
                                </Box>
                              }
                              fontSize="sm"
                              color={mutedText}
                              _hover={{ color: textColor }}
                            >
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
                              leftIcon={
                                <Box as="span" color="currentColor">
                                  {showRecurringTasks[calendarView] ? (
                                    <Repeat size={16} stroke="currentColor" />
                                  ) : (
                                    <X size={16} stroke="currentColor" />
                                  )}
                                </Box>
                              }
                              fontSize="sm"
                              color={mutedText}
                              _hover={{ color: textColor }}
                            >
                              {showRecurringTasks[calendarView] ? "Hide Recurring" : "Show Recurring"}
                            </Button>
                          </HStack>
                        </Flex>
                        {/* Calendar Controls */}
                        <Flex align="center" gap={2} px={2}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              setSelectedDate(today);
                            }}
                          >
                            Today
                          </Button>
                          <IconButton
                            icon={
                              <Box as="span" color="currentColor">
                                <ChevronLeft size={18} stroke="currentColor" />
                              </Box>
                            }
                            onClick={() => navigateCalendar(-1)}
                            variant="ghost"
                            aria-label="Previous"
                          />
                          <IconButton
                            icon={
                              <Box as="span" color="currentColor">
                                <ChevronRight size={18} stroke="currentColor" />
                              </Box>
                            }
                            onClick={() => navigateCalendar(1)}
                            variant="ghost"
                            aria-label="Next"
                          />
                          <Text fontSize="sm" fontWeight="medium" minW="120px">
                            {getCalendarTitle()}
                          </Text>
                          <Select value={calendarView} onChange={e => setCalendarView(e.target.value)} w={24}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                          </Select>
                        </Flex>
                      </Box>
                      {isLoading && !selectedDate ? (
                        <CalendarSkeleton />
                      ) : (
                        <Card flex={1} overflow="hidden" bg={bgColor} borderColor={borderColor} minH="600px">
                          <CardBody p={0} h="full">
                            {(() => {
                              // Filter tasks based on recurring preference for current view
                              let filteredTasks = showRecurringTasks[calendarView]
                                ? tasks
                                : tasks.filter(task => !task.recurrence || task.recurrence.type === "none");

                              // Filter tasks based on completed preference for current view
                              // For day view, filter here. For week/month views, filter per day in components
                              if (!showCompletedTasksCalendar[calendarView] && calendarView === "day" && selectedDate) {
                                filteredTasks = filteredTasks.filter(task => !isCompletedOnDate(task.id, selectedDate));
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
                                      showCompleted={showCompletedTasksCalendar.day}
                                      zoom={calendarZoom.day}
                                      tags={tags}
                                      onCreateTag={createTag}
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
                                      onCreateTag={createTag}
                                      isCompletedOnDate={isCompletedOnDate}
                                      showCompleted={showCompletedTasksCalendar.week}
                                      zoom={calendarZoom.week}
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
                                      showCompleted={showCompletedTasksCalendar.month}
                                      zoom={calendarZoom.month}
                                      tags={tags}
                                      onCreateTag={createTag}
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </CardBody>
                        </Card>
                      )}
                    </Box>
                  )}
                </Box>
              ) : (
                /* History Tab Content */
                <DashboardView />
              )}
            </Box>
          </Box>
        </Box>

        {/* Drag Overlay - dynamically offset based on click position */}
        <DragOverlay
          style={{
            cursor: "grabbing",
            marginLeft: `${dragOffset.x}px`,
            marginTop: `${dragOffset.y}px`,
          }}
        >
          {activeTask ? (
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
                {activeTask.title}
              </Text>
            </Box>
          ) : activeId?.startsWith("section-") ? (
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
                {sections.find(s => `section-${s.id}` === activeId)?.name || "Section"}
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
    </Box>
  );
}

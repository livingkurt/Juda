"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Select,
  Switch,
  HStack,
  Text,
  Flex,
  IconButton,
  useColorMode,
  useColorModeValue,
  useToast,
  Card,
  CardBody,
  Heading,
  Badge,
  FormLabel,
  Tabs,
  TabList,
  Tab,
} from "@chakra-ui/react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
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

export default function DailyTasksApp() {
  const { colorMode, toggleColorMode } = useColorMode();
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
    combineAsSubtask,
    promoteSubtask,
    saveTask,
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

  const isLoading = tasksLoading || sectionsLoading;

  // Initialize state with default values (same on server and client)
  const [mainTabIndex, setMainTabIndex] = useState(0); // 0 = Tasks, 1 = History
  const [showDashboard, setShowDashboard] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(true);
  // Initialize showCompletedTasks from localStorage if available, otherwise default to true
  const [showCompletedTasks, setShowCompletedTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("juda-view-preferences");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.showCompletedTasks !== undefined) {
            return parsed.showCompletedTasks;
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading show completed tasks preference:", error);
      }
    }
    return true; // Default to showing completed tasks (like Reminders)
  });
  // Initialize backlogWidth from localStorage if available, otherwise default to 500
  const [backlogWidth, setBacklogWidth] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("juda-view-preferences");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.backlogWidth !== undefined) {
            return parsed.backlogWidth;
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading backlog width:", error);
      }
    }
    return 500;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [calendarView, setCalendarView] = useState("week");
  // Initialize showRecurringTasks per view from localStorage if available, otherwise default to true for all
  const [showRecurringTasks, setShowRecurringTasks] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("juda-view-preferences");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.showRecurringTasks) {
            return {
              day: parsed.showRecurringTasks.day !== undefined ? parsed.showRecurringTasks.day : true,
              week: parsed.showRecurringTasks.week !== undefined ? parsed.showRecurringTasks.week : true,
              month: parsed.showRecurringTasks.month !== undefined ? parsed.showRecurringTasks.month : true,
            };
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading show recurring tasks preference:", error);
      }
    }
    return { day: true, week: true, month: true }; // Default to showing recurring tasks
  });
  // Initialize showCompletedTasksCalendar per view from localStorage if available, otherwise default to true for all
  const [showCompletedTasksCalendar, setShowCompletedTasksCalendar] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("juda-view-preferences");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.showCompletedTasksCalendar) {
            return {
              day: parsed.showCompletedTasksCalendar.day !== undefined ? parsed.showCompletedTasksCalendar.day : true,
              week:
                parsed.showCompletedTasksCalendar.week !== undefined ? parsed.showCompletedTasksCalendar.week : true,
              month:
                parsed.showCompletedTasksCalendar.month !== undefined ? parsed.showCompletedTasksCalendar.month : true,
            };
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading show completed tasks calendar preference:", error);
      }
    }
    return { day: true, week: true, month: true }; // Default to showing completed tasks
  });
  // Initialize calendarZoom per view from localStorage if available, otherwise default to 1.0 for all
  const [calendarZoom, setCalendarZoom] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("juda-view-preferences");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.calendarZoom) {
            return {
              day: parsed.calendarZoom.day !== undefined ? parsed.calendarZoom.day : 1.0,
              week: parsed.calendarZoom.week !== undefined ? parsed.calendarZoom.week : 1.0,
              month: parsed.calendarZoom.month !== undefined ? parsed.calendarZoom.month : 1.0,
            };
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error loading calendar zoom preference:", error);
      }
    }
    return { day: 1.0, week: 1.0, month: 1.0 }; // Default to 1.0 (100%)
  });
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
  // Track if preferences have been loaded to avoid saving before load completes
  const preferencesLoadedRef = useRef(false);
  // Track recently completed tasks that should remain visible for a delay
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
  const recentlyCompletedTimeoutsRef = useRef({});

  // Load view preferences from localStorage after mount (client-side only)
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

    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem("juda-view-preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.showDashboard !== undefined) setShowDashboard(parsed.showDashboard);
        if (parsed.showCalendar !== undefined) setShowCalendar(parsed.showCalendar);
        if (parsed.calendarView) setCalendarView(parsed.calendarView);
        if (parsed.backlogOpen !== undefined) setBacklogOpen(parsed.backlogOpen);
        if (parsed.showCompletedTasks !== undefined) setShowCompletedTasks(parsed.showCompletedTasks);
        if (parsed.showRecurringTasks) {
          setShowRecurringTasks({
            day: parsed.showRecurringTasks.day !== undefined ? parsed.showRecurringTasks.day : true,
            week: parsed.showRecurringTasks.week !== undefined ? parsed.showRecurringTasks.week : true,
            month: parsed.showRecurringTasks.month !== undefined ? parsed.showRecurringTasks.month : true,
          });
        }
        if (parsed.showCompletedTasksCalendar) {
          setShowCompletedTasksCalendar({
            day: parsed.showCompletedTasksCalendar.day !== undefined ? parsed.showCompletedTasksCalendar.day : true,
            week: parsed.showCompletedTasksCalendar.week !== undefined ? parsed.showCompletedTasksCalendar.week : true,
            month:
              parsed.showCompletedTasksCalendar.month !== undefined ? parsed.showCompletedTasksCalendar.month : true,
          });
        }
        if (parsed.calendarZoom) {
          setCalendarZoom({
            day: parsed.calendarZoom.day !== undefined ? parsed.calendarZoom.day : 1.0,
            week: parsed.calendarZoom.week !== undefined ? parsed.calendarZoom.week : 1.0,
            month: parsed.calendarZoom.month !== undefined ? parsed.calendarZoom.month : 1.0,
          });
        }
        // backlogWidth is now initialized from localStorage in useState, but update if it exists
        if (parsed.backlogWidth !== undefined) setBacklogWidth(parsed.backlogWidth);
      }
      preferencesLoadedRef.current = true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error loading view preferences:", error);
      preferencesLoadedRef.current = true;
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

  // Save view preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't save until preferences have been loaded to avoid overwriting with defaults
    if (!preferencesLoadedRef.current) return;

    try {
      const preferences = {
        showDashboard,
        showCalendar,
        calendarView,
        backlogOpen,
        backlogWidth,
        showCompletedTasks,
        showRecurringTasks,
        showCompletedTasksCalendar,
        calendarZoom,
      };
      localStorage.setItem("juda-view-preferences", JSON.stringify(preferences));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error saving view preferences:", error);
    }
  }, [
    showDashboard,
    showCalendar,
    calendarView,
    backlogOpen,
    backlogWidth,
    showCompletedTasks,
    showRecurringTasks,
    showCompletedTasksCalendar,
    calendarZoom,
  ]);
  const { isOpen: settingsOpen, onOpen: openSettings, onClose: closeSettings } = useDisclosure();

  // Resize handlers for backlog drawer
  const resizeStartRef = useRef(null);
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
  }, [isResizing, backlogWidth]);

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
        distance: 3, // 3px movement required to start drag (very responsive)
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

    // Extract task ID and find the task
    try {
      const taskId = extractTaskId(active.id);
      const task = tasks.find(t => t.id === taskId);
      setActiveTask(task);
    } catch (e) {
      // Not a task drag (might be section reorder)
      setActiveTask(null);
    }

    // Clear calendar droppable tracking
    currentCalendarDroppableRef.current = null;
    dropTimeRef.current = null;
  };

  // Track which calendar droppable we're over for time calculation
  const currentCalendarDroppableRef = useRef(null);
  const mouseMoveListenerRef = useRef(null);

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
    if (!sourceContainerId) {
      // Infer from draggableId pattern for non-sortable items (calendar tasks)
      if (draggableId.includes("-backlog")) {
        sourceContainerId = "backlog";
      } else if (draggableId.includes("-today-section-")) {
        const match = draggableId.match(/-today-section-([^-]+)/);
        if (match) sourceContainerId = `today-section|${match[1]}`;
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
    }

    // Determine type early
    let type = active.data.current?.type || "TASK";
    if (draggableId.startsWith("section-")) {
      type = "SECTION";
    }

    // Get destination container ID
    let destContainerId = overSortable?.containerId || over.id;

    // Check if dropping on a task drop target (for combining tasks)
    const overDroppable = over.data.current;

    // Check if we're dragging a subtask (type is SUBTASK or draggableId starts with subtask|)
    const isSubtaskDrag = type === "SUBTASK" || draggableId.startsWith("subtask|");

    // If dragging a subtask to a non-task target (section, backlog, calendar), promote it
    if (isSubtaskDrag && (!overDroppable?.type || overDroppable?.type !== "TASK_TARGET")) {
      const subtaskId = extractTaskId(draggableId);

      // Find the subtask to get its current data
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
      const subtask = findTask(tasks, subtaskId);

      if (!subtask) {
        toast({
          title: "Subtask not found",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Parse destination to determine what updates to make
      const destParsed = parseDroppableId(destContainerId);
      let additionalUpdates = {};

      // Get the calculated drop time (if dropping on timed calendar area)
      const calculatedTime = dropTimeRef.current || "09:00";
      dropTimeRef.current = null;

      // DESTINATION: Backlog - clear date, time, and recurrence
      if (destParsed.type === "backlog") {
        additionalUpdates = {
          time: null,
          recurrence: null,
        };
      }
      // DESTINATION: Today section - set date to viewDate, clear time
      else if (destParsed.type === "today-section") {
        const targetDate = viewDate || today;
        const targetDateStr = formatLocalDate(targetDate);

        // Preserve existing recurrence if it exists
        let recurrenceUpdate;
        if (subtask.recurrence && subtask.recurrence.type && subtask.recurrence.type !== "none") {
          recurrenceUpdate = subtask.recurrence;
        } else {
          recurrenceUpdate = {
            type: "none",
            startDate: `${targetDateStr}T00:00:00.000Z`,
          };
        }

        additionalUpdates = {
          sectionId: destParsed.sectionId,
          time: null,
          recurrence: recurrenceUpdate,
        };
      }
      // DESTINATION: Calendar (timed area) - set date and time
      else if (destParsed.type === "calendar" && !destParsed.isUntimed) {
        let dropDateStr;
        if (destParsed.dateStr) {
          dropDateStr = destParsed.dateStr.split("T")[0];
        } else {
          const fallbackDate = selectedDate || new Date();
          dropDateStr = formatLocalDate(fallbackDate);
        }

        let recurrenceUpdate;
        if (subtask.recurrence && subtask.recurrence.type && subtask.recurrence.type !== "none") {
          recurrenceUpdate = subtask.recurrence;
        } else {
          recurrenceUpdate = {
            type: "none",
            startDate: `${dropDateStr}T00:00:00.000Z`,
          };
        }

        additionalUpdates = {
          time: calculatedTime,
          recurrence: recurrenceUpdate,
        };
      }
      // DESTINATION: Calendar (untimed area) - set date, clear time
      else if (destParsed.type === "calendar" && destParsed.isUntimed) {
        let dropDateStr;
        if (destParsed.dateStr) {
          dropDateStr = destParsed.dateStr.split("T")[0];
        } else {
          const fallbackDate = selectedDate || new Date();
          dropDateStr = formatLocalDate(fallbackDate);
        }

        let recurrenceUpdate;
        if (subtask.recurrence && subtask.recurrence.type && subtask.recurrence.type !== "none") {
          recurrenceUpdate = subtask.recurrence;
        } else {
          recurrenceUpdate = {
            type: "none",
            startDate: `${dropDateStr}T00:00:00.000Z`,
          };
        }

        additionalUpdates = {
          time: null,
          recurrence: recurrenceUpdate,
        };
      }

      try {
        await promoteSubtask(subtaskId, additionalUpdates);
        toast({
          title: "Subtask promoted",
          description: "Subtask is now a regular task",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        return;
      } catch (error) {
        toast({
          title: "Failed to promote subtask",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

    if (overDroppable?.type === "TASK_TARGET" && overDroppable?.taskId) {
      // Dropping a task onto another task - combine as subtask
      if (type === "TASK") {
        const sourceTaskId = extractTaskId(draggableId);
        const targetTaskId = overDroppable.taskId;

        // Don't allow dropping task on itself
        if (sourceTaskId !== targetTaskId) {
          try {
            await combineAsSubtask(sourceTaskId, targetTaskId);
            toast({
              title: "Task combined",
              description: "Task has been added as a subtask",
              status: "success",
              duration: 2000,
              isClosable: true,
            });
          } catch (error) {
            toast({
              title: "Failed to combine tasks",
              description: error.message,
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
        return;
      }
    }

    // Check if dropping on a subtask - treat as dropping on parent task
    if (over.id && over.id.startsWith("subtask|")) {
      const [, parentTaskId] = over.id.split("|");
      if (type === "TASK") {
        const sourceTaskId = extractTaskId(draggableId);
        if (sourceTaskId !== parentTaskId) {
          try {
            await combineAsSubtask(sourceTaskId, parentTaskId);
            toast({
              title: "Task combined",
              description: "Task has been added as a subtask",
              status: "success",
              duration: 2000,
              isClosable: true,
            });
          } catch (error) {
            toast({
              title: "Failed to combine tasks",
              description: error.message,
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
        return;
      }
    }

    // Check if over is a droppable (not a sortable item)
    if (overDroppable?.sectionId) {
      // Dropping directly on a section droppable area
      destContainerId = `today-section|${overDroppable.sectionId}`;
    } else if (over.id.startsWith("task-") && over.id.includes("-today-section-")) {
      // Dropping on a task in a section - extract section from task's draggableId
      const match = over.id.match(/-today-section-([^-]+)/);
      if (match) destContainerId = `today-section|${match[1]}`;
    } else if (over.id.startsWith("task-") && over.id.includes("-backlog")) {
      // Dropping on a task in backlog - use backlog container
      destContainerId = "backlog";
    } else if (over.id.startsWith("section-")) {
      // Dropping on a section card itself - extract section ID
      const sectionId = over.id.replace("section-", "");
      destContainerId = `today-section|${sectionId}`;
    } else if (over.id && over.id.startsWith("task|")) {
      // Dropping on a task drop target (fallback check)
      const targetTaskId = over.id.split("|")[1];
      if (type === "TASK") {
        const sourceTaskId = extractTaskId(draggableId);
        if (sourceTaskId !== targetTaskId) {
          try {
            await combineAsSubtask(sourceTaskId, targetTaskId);
            toast({
              title: "Task combined",
              description: "Task has been added as a subtask",
              status: "success",
              duration: 2000,
              isClosable: true,
            });
          } catch (error) {
            toast({
              title: "Failed to combine tasks",
              description: error.message,
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
        return;
      }
    }

    if (!overSortable && over.id) {
      // If it's not a sortable item, it might be a droppable ID directly
      // Check if it matches our droppable ID patterns
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

      // Handle subtask reordering within the same parent task
      if (type === "SUBTASK" && sourceContainerId.startsWith("subtask|")) {
        const [, parentTaskId] = sourceContainerId.split("|");
        const parentTask = tasks.find(t => t.id === parentTaskId);
        if (!parentTask) return;

        const subtaskId = active.data.current?.subtaskId;
        if (!subtaskId) return;

        const currentSubtasks = parentTask.subtasks || [];
        const reorderedSubtasks = arrayMove(currentSubtasks, oldIndex, newIndex).map((st, idx) => ({
          ...st,
          order: idx,
        }));

        await updateTask(parentTaskId, { subtasks: reorderedSubtasks });
        return;
      }
    }

    // Handle cross-container moves (backlog ↔ sections ↔ calendar)
    // Convert to the format expected by handleDragEnd
    const sourceIndex = activeSortable?.index ?? 0;
    const destIndex = overSortable?.index ?? 0;

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

  // Show skeleton on initial load
  if (isLoading && tasks.length === 0 && sections.length === 0) {
    return <PageSkeleton showBacklog={backlogOpen} showDashboard={showDashboard} showCalendar={showCalendar} />;
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
            <Modal isOpen={settingsOpen} onClose={closeSettings}>
              <ModalOverlay />
              <ModalContent bg={bgColor}>
                <ModalHeader>Settings</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <Flex align="center" justify="space-between" py={4}>
                    <Box>
                      <FormLabel>Dark Mode</FormLabel>
                      <Text fontSize="sm" color={mutedText}>
                        Toggle dark theme
                      </Text>
                    </Box>
                    <Switch isChecked={colorMode === "dark"} onChange={toggleColorMode} />
                  </Flex>
                </ModalBody>
              </ModalContent>
            </Modal>
            <IconButton
              icon={
                <Box as="span" color="currentColor">
                  <Settings size={20} stroke="currentColor" />
                </Box>
              }
              onClick={openSettings}
              variant="ghost"
              aria-label="Settings"
            />
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
        collisionDetection={pointerWithin}
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

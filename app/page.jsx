"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Settings, Calendar, LayoutDashboard, List, Sun, Sunset, Moon } from "lucide-react";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { useTasks } from "@/hooks/useTasks";
import { useSections } from "@/hooks/useSections";
import { useCompletions } from "@/hooks/useCompletions";
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

  const { tasks, createTask, updateTask, deleteTask, reorderTask, duplicateTask, loading: tasksLoading } = useTasks();
  const {
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    loading: sectionsLoading,
  } = useSections();
  const { createCompletion, deleteCompletion, isCompletedOnDate, fetchCompletions } = useCompletions();

  const isLoading = tasksLoading || sectionsLoading;

  // Initialize state with default values (same on server and client)
  const [mainTabIndex, setMainTabIndex] = useState(0); // 0 = Tasks, 1 = History
  const [showDashboard, setShowDashboard] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [backlogOpen, setBacklogOpen] = useState(true);
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
  // Initialize selectedDate to null, then set it in useEffect to avoid hydration mismatch
  const [selectedDate, setSelectedDate] = useState(null);
  // Initialize todayViewDate to null, then set it in useEffect to avoid hydration mismatch
  const [todayViewDate, setTodayViewDate] = useState(null);
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
  // Track if preferences have been loaded to avoid saving before load completes
  const preferencesLoadedRef = useRef(false);

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
      };
      localStorage.setItem("juda-view-preferences", JSON.stringify(preferences));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error saving view preferences:", error);
    }
  }, [showDashboard, showCalendar, calendarView, backlogOpen, backlogWidth]);
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

  // Group today's tasks by section
  const tasksBySection = useMemo(() => {
    const grouped = {};
    sections.forEach(s => {
      grouped[s.id] = todaysTasks.filter(t => t.sectionId === s.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [todaysTasks, sections]);

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
  const totalTasks = todaysTasks.length;
  const completedTasks = todaysTasks.filter(t => {
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

    const isCompletedOnViewDate = isCompletedOnDate(taskId, viewDate);

    try {
      // Only update completion record - no need to update task.completed field
      // The UI will reflect completion status via isCompletedOnDate check
      if (isCompletedOnViewDate) {
        // Task is completed on the selected date, remove completion record
        await deleteCompletion(taskId, viewDate.toISOString());
      } else {
        // Task is not completed on the selected date, create completion record
        await createCompletion(taskId, viewDate.toISOString());
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error toggling task completion:", error);
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks =
      task.subtasks?.map(st => (st.id === subtaskId ? { ...st, completed: !st.completed } : st)) || [];
    await updateTask(taskId, { subtasks: updatedSubtasks });
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
        duration: 30,
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
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
    } else {
      await createTask(taskData);
    }
    setEditingTask(null);
    closeTaskDialog();
  };

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

    // Get destination container ID
    let destContainerId = overSortable?.containerId || over.id;

    // Check if over is a droppable (not a sortable item)
    const overDroppable = over.data.current;
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
    } else if (!overSortable && over.id) {
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

    // Determine type
    let type = active.data.current?.type || "TASK";
    if (draggableId.startsWith("section-")) {
      type = "SECTION";
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
                      createDraggableId={createDraggableId}
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
                      overflowY="auto"
                    >
                      {isLoading && sections.length === 0 ? (
                        <Box>
                          <SectionSkeleton />
                          <SectionSkeleton />
                          <SectionSkeleton />
                        </Box>
                      ) : (
                        <>
                          {todayViewDate && (
                            <DateNavigation
                              selectedDate={todayViewDate}
                              onDateChange={handleTodayViewDateChange}
                              onPrevious={() => navigateTodayView(-1)}
                              onNext={() => navigateTodayView(1)}
                              onToday={handleTodayViewToday}
                            />
                          )}
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
                            createDroppableId={createDroppableId}
                            createDraggableId={createDraggableId}
                          />
                        </>
                      )}
                    </Box>
                  )}

                  {/* Calendar View */}
                  {showCalendar && (
                    <Box flex={1} minW={0} display="flex" flexDirection="column">
                      {/* Calendar Controls */}
                      <Flex align="center" gap={2} mb={3} px={2}>
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
                      {isLoading && !selectedDate ? (
                        <CalendarSkeleton />
                      ) : (
                        <Card flex={1} overflow="hidden" bg={bgColor} borderColor={borderColor} minH="600px">
                          <CardBody p={0} h="full">
                            {calendarView === "day" && selectedDate && (
                              <CalendarDayView
                                date={selectedDate}
                                tasks={tasks}
                                onTaskClick={handleEditTask}
                                onTaskTimeChange={handleTaskTimeChange}
                                onTaskDurationChange={handleTaskDurationChange}
                                onCreateTask={handleCreateTaskFromCalendar}
                                onDropTimeChange={time => {
                                  dropTimeRef.current = time;
                                }}
                                createDroppableId={createDroppableId}
                              />
                            )}
                            {calendarView === "week" && selectedDate && (
                              <CalendarWeekView
                                date={selectedDate}
                                tasks={tasks}
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
                              />
                            )}
                            {calendarView === "month" && selectedDate && (
                              <CalendarMonthView
                                date={selectedDate}
                                tasks={tasks}
                                onDayClick={d => {
                                  setSelectedDate(d);
                                  setCalendarView("day");
                                }}
                              />
                            )}
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

        {/* Drag Overlay */}
        <DragOverlay
          style={{
            cursor: "grabbing",
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

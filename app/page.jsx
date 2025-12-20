"use client";

import { useState, useMemo, useRef } from "react";
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
  Card,
  CardBody,
  Heading,
  Badge,
  FormLabel,
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Calendar,
  LayoutDashboard,
  List,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { Section } from "@/components/Section";
import { TaskDialog } from "@/components/TaskDialog";
import { SectionDialog } from "@/components/SectionDialog";
import { BacklogDrawer } from "@/components/BacklogDrawer";
import { useTasks } from "@/hooks/useTasks";
import { useSections } from "@/hooks/useSections";
import { useBacklog } from "@/hooks/useBacklog";
import {
  shouldShowOnDate,
  getGreeting,
  hasFutureDateTime,
  minutesToTime,
  snapToIncrement,
} from "@/lib/utils";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";

// Helper to parse droppable IDs consistently
const parseDroppableId = droppableId => {
  if (droppableId === "backlog") {
    return { type: "backlog" };
  }

  // Calendar droppables use format: "calendar-{view}-{subtype}|{date}"
  // Using pipe instead of colon to avoid conflicts with ISO dates
  if (droppableId.startsWith("calendar-")) {
    const [prefix, dateStr] = droppableId.split("|");
    const parts = prefix.split("-");
    const view = parts[1]; // "day" or "week"
    const isUntimed = parts[2] === "untimed";

    return {
      type: "calendar",
      view,
      isUntimed,
      date: dateStr ? new Date(dateStr) : null,
    };
  }

  // Today view sections use format: "today-section|{sectionId}"
  if (droppableId.startsWith("today-section|")) {
    const sectionId = droppableId.split("|")[1];
    return { type: "today-section", sectionId };
  }

  // Legacy: assume it's a section ID for backwards compatibility
  return { type: "today-section", sectionId: droppableId };
};

// Helper to create droppable IDs
export const createDroppableId = {
  backlog: () => "backlog",
  todaySection: sectionId => `today-section|${sectionId}`,
  calendarDay: date => `calendar-day|${date.toISOString()}`,
  calendarDayUntimed: date => `calendar-day-untimed|${date.toISOString()}`,
  calendarWeek: date => `calendar-week|${date.toISOString()}`,
  calendarWeekUntimed: date => `calendar-week-untimed|${date.toISOString()}`,
};

// Helper to create context-aware draggable IDs
// This ensures each task instance has a unique ID based on its context
export const createDraggableId = {
  backlog: taskId => `task-${taskId}-backlog`,
  todaySection: (taskId, sectionId) =>
    `task-${taskId}-today-section-${sectionId}`,
  calendarUntimed: (taskId, date) =>
    `task-${taskId}-calendar-untimed-${date.toISOString()}`,
  calendarTimed: (taskId, date) =>
    `task-${taskId}-calendar-timed-${date.toISOString()}`,
};

// Helper to extract task ID from context-aware draggable ID
export const extractTaskId = draggableId => {
  // All draggable IDs must be context-aware: "task-{taskId}-{context}"
  if (!draggableId.startsWith("task-")) {
    throw new Error(
      `Invalid draggableId format: ${draggableId}. Expected format: task-{taskId}-{context}`
    );
  }

  // Remove "task-" prefix
  const withoutPrefix = draggableId.substring(5);

  // Find the task ID by looking for known context suffixes
  // Format: {taskId}-{context}
  const suffixes = [
    "-backlog",
    "-today-section-",
    "-calendar-untimed-",
    "-calendar-timed-",
  ];

  for (const suffix of suffixes) {
    const index = withoutPrefix.indexOf(suffix);
    if (index !== -1) {
      return withoutPrefix.substring(0, index);
    }
  }

  // If no known suffix found, this is an error
  throw new Error(
    `Could not extract task ID from draggableId: ${draggableId}. Unknown context format.`
  );
};

export default function DailyTasksApp() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const headerBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  const { tasks, createTask, updateTask, deleteTask, reorderTask } = useTasks();
  const {
    sections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  } = useSections();
  const { backlog, createBacklogItem, updateBacklogItem, deleteBacklogItem } =
    useBacklog();

  const [showDashboard, setShowDashboard] = useState(true);
  const [showCalendar, setShowCalendar] = useState(true);
  const [calendarView, setCalendarView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
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

  const {
    isOpen: taskDialogOpen,
    onOpen: openTaskDialog,
    onClose: closeTaskDialog,
  } = useDisclosure();
  const {
    isOpen: sectionDialogOpen,
    onOpen: openSectionDialog,
    onClose: closeSectionDialog,
  } = useDisclosure();
  const [backlogOpen, setBacklogOpen] = useState(false);
  const {
    isOpen: settingsOpen,
    onOpen: openSettings,
    onClose: closeSettings,
  } = useDisclosure();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const greeting = getGreeting();
  const GreetingIcon =
    greeting.icon === "Sun" ? Sun : greeting.icon === "Sunset" ? Sunset : Moon;

  // Tasks that should show in today's dashboard
  const todaysTasks = useMemo(
    () => tasks.filter(task => shouldShowOnDate(task, today)),
    [tasks, today]
  );

  // Group today's tasks by section
  const tasksBySection = useMemo(() => {
    const grouped = {};
    sections.forEach(s => {
      grouped[s.id] = todaysTasks
        .filter(t => t.sectionId === s.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [todaysTasks, sections]);

  // Tasks for backlog: no recurrence AND no time, or recurrence doesn't match today
  // Exclude tasks with future dates/times
  const backlogTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.completed) return false;
      if (shouldShowOnDate(task, today)) return false;
      // Exclude tasks with future date/time
      if (hasFutureDateTime(task)) return false;
      return true;
    });
  }, [tasks, today]);

  // Progress calculation
  const totalTasks = todaysTasks.length;
  const completedTasks = todaysTasks.filter(
    t =>
      t.completed ||
      (t.subtasks &&
        t.subtasks.length > 0 &&
        t.subtasks.every(st => st.completed))
  ).length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Task handlers
  const handleToggleTask = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, {
      completed: !task.completed,
      subtasks:
        task.subtasks?.map(st => ({ ...st, completed: !task.completed })) || [],
    });
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedSubtasks =
      task.subtasks?.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      ) || [];
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

  const handleDeleteTask = async taskId => {
    await deleteTask(taskId);
  };

  const handleAddTask = sectionId => {
    setDefaultSectionId(sectionId);
    setDefaultTime(null);
    setEditingTask(null);
    openTaskDialog();
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
    setDefaultDate(day ? day.toISOString().split("T")[0] : null);
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
      const newSections = Array.from(sections).sort(
        (a, b) => a.order - b.order
      );
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

      console.log("Drag:", {
        from: sourceParsed,
        to: destParsed,
        task: task.title,
        calculatedTime,
      });

      // Determine what updates to make based on source and destination
      let updates = {};

      // DESTINATION: Backlog - clear date and time
      if (destParsed.type === "backlog") {
        updates = {
          time: null,
          recurrence: null,
        };
      }
      // DESTINATION: Today section - set date to today, clear time
      else if (destParsed.type === "today-section") {
        const targetSectionId = destParsed.sectionId;
        const sourceSectionId =
          sourceParsed.type === "today-section" ? sourceParsed.sectionId : null;

        // If moving between sections, use reorderTask
        if (sourceSectionId && sourceSectionId !== targetSectionId) {
          // Moving between sections - use reorderTask which handles both sections
          await reorderTask(
            taskId,
            sourceSectionId,
            targetSectionId,
            destination.index
          );
          // Still need to update date/time/recurrence
          await updateTask(taskId, {
            time: null,
            recurrence: {
              type: "none",
              startDate: today.toISOString(),
            },
          });
          return; // reorderTask handles the reordering, so we're done
        }

        // For same-section moves or coming from backlog/calendar, handle reordering here
        // Don't set sectionId here - let the reordering logic below handle it
        updates = {
          time: null,
          recurrence: {
            type: "none",
            startDate: today.toISOString(),
          },
        };
      }
      // DESTINATION: Calendar (timed area) - set date and time
      else if (destParsed.type === "calendar" && !destParsed.isUntimed) {
        const dropDate = destParsed.date || selectedDate;
        updates = {
          time: calculatedTime,
          recurrence: {
            type: "none",
            startDate: dropDate.toISOString(),
          },
        };
      }
      // DESTINATION: Calendar (untimed area) - set date, clear time
      else if (destParsed.type === "calendar" && destParsed.isUntimed) {
        const dropDate = destParsed.date || selectedDate;
        updates = {
          time: null,
          recurrence:
            task.recurrence?.type && task.recurrence.type !== "none"
              ? task.recurrence // Keep recurring pattern
              : {
                  type: "none",
                  startDate: dropDate.toISOString(),
                },
        };
      }

      // Handle reordering when dropping into a section
      if (destParsed.type === "today-section") {
        const targetSectionId = destParsed.sectionId;
        const sourceSectionId =
          sourceParsed.type === "today-section" ? sourceParsed.sectionId : null;

        // Get current tasks in target section (excluding the moved task)
        const targetSectionTasks = [
          ...(tasksBySection[targetSectionId] || []).filter(
            t => t.id !== taskId
          ),
        ];

        // Insert the moved task at the destination index
        targetSectionTasks.splice(destination.index, 0, task);

        // Update orders for all tasks in target section
        const updatePromises = targetSectionTasks.map((t, i) => {
          if (t.id === taskId) {
            // Update the moved task with new section, order, and other updates
            return updateTask(taskId, {
              sectionId: targetSectionId,
              order: i,
              ...updates, // Include time/recurrence updates
            });
          } else if (t.order !== i) {
            // Update other tasks in target section if order changed
            return updateTask(t.id, { order: i });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);

        // Clear updates since they've been applied
        updates = {};

        // If moving from another section, reorder source section tasks
        if (sourceSectionId && sourceSectionId !== targetSectionId) {
          const sourceSectionTasks = [
            ...(tasksBySection[sourceSectionId] || []).filter(
              t => t.id !== taskId
            ),
          ];

          // Update orders for remaining tasks in source section
          const sourceUpdatePromises = sourceSectionTasks.map((t, i) => {
            if (t.order !== i) {
              return updateTask(t.id, { order: i });
            }
            return Promise.resolve();
          });

          await Promise.all(sourceUpdatePromises);
        }
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
      alert("Need at least one section");
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
    setSelectedDate(d);
  };

  const getCalendarTitle = () => {
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
        distance: 8, // 8px movement required to start drag
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
      if (
        droppableId.startsWith("calendar-day|") ||
        droppableId.startsWith("calendar-week|")
      ) {
        currentCalendarDroppableRef.current = droppableId;

        // Set up mousemove listener if not already set
        if (!mouseMoveListenerRef.current) {
          const handleMouseMove = e => {
            if (!currentCalendarDroppableRef.current) return;

            // Find calendar timed area using data attribute
            const timedAreas = Array.from(
              document.querySelectorAll('[data-calendar-timed="true"]')
            ).filter(el => {
              const rect = el.getBoundingClientRect();
              return (
                rect.top <= e.clientY &&
                rect.bottom >= e.clientY &&
                rect.left <= e.clientX &&
                rect.right >= e.clientX
              );
            });

            if (timedAreas.length > 0) {
              const timedArea = timedAreas[0];
              const rect = timedArea.getBoundingClientRect();
              const y = e.clientY - rect.top;

              // Get HOUR_HEIGHT from data attribute or use default based on view
              const hourHeight =
                parseInt(timedArea.getAttribute("data-hour-height")) ||
                (calendarView === "day" ? 64 : 48);

              const minutes = Math.max(
                0,
                Math.min(24 * 60 - 1, Math.floor((y / hourHeight) * 60))
              );
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
        if (
          droppableId.startsWith("calendar-day-untimed|") ||
          droppableId.startsWith("calendar-week-untimed|")
        ) {
          dropTimeRef.current = null;
        }
      }
    }
  };

  // Handle drag end - convert from @dnd-kit format to @hello-pangea/dnd format
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

    // Determine source container ID
    // For sortable items, it's in sortable.containerId
    // For non-sortable items (calendar tasks), we need to infer from the draggableId
    let sourceDroppableId = active.data.current?.sortable?.containerId;

    if (!sourceDroppableId) {
      // Infer from draggableId pattern
      if (draggableId.includes("-backlog")) {
        sourceDroppableId = "backlog";
      } else if (draggableId.includes("-today-section-")) {
        const match = draggableId.match(/-today-section-([^-]+)/);
        if (match) sourceDroppableId = `today-section|${match[1]}`;
      } else if (draggableId.includes("-calendar-untimed-")) {
        const match = draggableId.match(/-calendar-untimed-(.+)$/);
        if (match) {
          const dateStr = match[1];
          // Determine if it's day or week view based on the droppable ID format
          if (dateStr.includes("T")) {
            sourceDroppableId = `calendar-day-untimed|${dateStr}`;
          } else {
            sourceDroppableId = `calendar-week-untimed|${dateStr}`;
          }
        }
      } else if (draggableId.includes("-calendar-timed-")) {
        const match = draggableId.match(/-calendar-timed-(.+)$/);
        if (match) {
          const dateStr = match[1];
          // Determine if it's day or week view
          if (dateStr.includes("T")) {
            sourceDroppableId = `calendar-day|${dateStr}`;
          } else {
            sourceDroppableId = `calendar-week|${dateStr}`;
          }
        }
      }
    }

    const destDroppableId = over.id;

    // For sortable items, get the index from the sorted items
    const sourceIndex = active.data.current?.sortable?.index ?? 0;
    const destIndex = over.data.current?.sortable?.index ?? 0;

    // Determine type based on draggableId
    let type = "TASK";
    if (draggableId.startsWith("section-")) {
      type = "SECTION";
    }

    // Create result object similar to @hello-pangea/dnd format
    const result = {
      draggableId,
      type,
      source: {
        droppableId: sourceDroppableId,
        index: sourceIndex,
      },
      destination: {
        droppableId: destDroppableId,
        index: destIndex,
      },
    };

    // Call the existing handler
    await handleDragEnd(result);
  };

  return (
    <Box
      h="100vh"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      bg={bgColor}
      color={textColor}
    >
      {/* Header */}
      <Box
        as="header"
        bg={headerBg}
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexShrink={0}
      >
        <Box w="full" px={4} py={4}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <GreetingIcon color="orange.500" size={28} />
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
                    <Switch
                      isChecked={colorMode === "dark"}
                      onChange={toggleColorMode}
                    />
                  </Flex>
                </ModalBody>
              </ModalContent>
            </Modal>
            <IconButton
              icon={<Settings size={20} />}
              onClick={openSettings}
              variant="ghost"
              aria-label="Settings"
            />
          </Flex>

          {/* View toggles and calendar nav */}
          <Box mt={4}>
            <Flex align="center" justify="space-between" mb={3}>
              <HStack spacing={2}>
                <Box position="relative">
                  <Button
                    size="sm"
                    variant={backlogOpen ? "solid" : "outline"}
                    colorScheme={backlogOpen ? "blue" : "gray"}
                    onClick={() => setBacklogOpen(!backlogOpen)}
                    leftIcon={<List size={16} />}
                  >
                    Backlog
                  </Button>
                  {(backlog.filter(b => !b.completed).length > 0 ||
                    backlogTasks.length > 0) && (
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
                      {backlog.filter(b => !b.completed).length +
                        backlogTasks.length}
                    </Badge>
                  )}
                </Box>
                <Button
                  size="sm"
                  variant={showDashboard ? "solid" : "outline"}
                  colorScheme={showDashboard ? "blue" : "gray"}
                  onClick={() => setShowDashboard(!showDashboard)}
                  leftIcon={<LayoutDashboard size={16} />}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={showCalendar ? "solid" : "outline"}
                  colorScheme={showCalendar ? "blue" : "gray"}
                  onClick={() => setShowCalendar(!showCalendar)}
                  leftIcon={<Calendar size={16} />}
                >
                  Calendar
                </Button>
              </HStack>
              {showCalendar && (
                <Flex align="center" gap={2}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                  <IconButton
                    icon={<ChevronLeft size={18} />}
                    onClick={() => navigateCalendar(-1)}
                    variant="ghost"
                    aria-label="Previous"
                  />
                  <IconButton
                    icon={<ChevronRight size={18} />}
                    onClick={() => navigateCalendar(1)}
                    variant="ghost"
                    aria-label="Next"
                  />
                  <Text fontSize="sm" fontWeight="medium" minW="120px">
                    {getCalendarTitle()}
                  </Text>
                  <Select
                    value={calendarView}
                    onChange={e => setCalendarView(e.target.value)}
                    w={24}
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </Select>
                </Flex>
              )}
            </Flex>

            {/* Progress bar */}
            {showDashboard && (
              <Box>
                <Flex
                  justify="space-between"
                  fontSize="sm"
                  color={mutedText}
                  mb={1}
                >
                  <Text>Today's Progress</Text>
                  <Text>
                    {completedTasks}/{totalTasks} ({progressPercent}%)
                  </Text>
                </Flex>
                <Box
                  h={2}
                  bg={useColorModeValue("gray.200", "gray.700")}
                  borderRadius="full"
                  overflow="hidden"
                >
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
          {/* Backlog Sidebar */}
          <Box
            w={backlogOpen ? "320px" : "0"}
            transition="width 0.3s"
            overflow="hidden"
            borderRightWidth={backlogOpen ? "1px" : "0"}
            borderColor={borderColor}
            bg={bgColor}
            flexShrink={0}
          >
            {backlogOpen && (
              <BacklogDrawer
                isOpen={true}
                onClose={() => setBacklogOpen(false)}
                backlog={backlog}
                backlogTasks={backlogTasks}
                sections={sections}
                onToggleBacklog={async id => {
                  const item = backlog.find(b => b.id === id);
                  if (item) await updateBacklogItem(id, !item.completed);
                }}
                onToggleTask={handleToggleTask}
                onDeleteBacklog={deleteBacklogItem}
                onDeleteTask={handleDeleteTask}
                onEditTask={handleEditTask}
                onAdd={createBacklogItem}
                onAddTask={handleAddTaskToBacklog}
                createDraggableId={createDraggableId}
              />
            )}
          </Box>

          {/* Main Content Area */}
          <Box flex={1} overflow="hidden" display="flex" flexDirection="column">
            <Box flex={1} overflowY="auto">
              <Box w="full" px={4} py={6} display="flex" gap={6} h="full">
                {/* Dashboard View */}
                {showDashboard && (
                  <Box flex={1} minW={0} overflowY="auto">
                    <Section
                      sections={sortedSections}
                      tasksBySection={tasksBySection}
                      onToggleTask={handleToggleTask}
                      onToggleSubtask={handleToggleSubtask}
                      onToggleExpand={handleToggleExpand}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onAddTask={handleAddTask}
                      onEditSection={handleEditSection}
                      onDeleteSection={handleDeleteSection}
                      onAddSection={handleAddSection}
                      createDroppableId={createDroppableId}
                      createDraggableId={createDraggableId}
                    />
                  </Box>
                )}

                {/* Calendar View */}
                {showCalendar && (
                  <Box flex={1} minW={0} display="flex" flexDirection="column">
                    <Card
                      flex={1}
                      overflow="hidden"
                      bg={bgColor}
                      borderColor={borderColor}
                      minH="600px"
                    >
                      <CardBody p={0} h="full">
                        {calendarView === "day" && (
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
                        {calendarView === "week" && (
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
                        {calendarView === "month" && (
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
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <Box
              px={4}
              py={2}
              borderRadius="lg"
              bg={useColorModeValue("blue.100", "blue.800")}
              borderWidth="2px"
              borderColor={useColorModeValue("blue.400", "blue.500")}
              boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4)"
              w="180px"
              h="40px"
            >
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={useColorModeValue("blue.900", "blue.100")}
                isTruncated
              >
                {activeTask.title}
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

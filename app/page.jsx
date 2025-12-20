"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
  Collapse,
  Progress,
} from "@chakra-ui/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import { shouldShowOnDate, getGreeting } from "@/lib/utils";
import { CalendarDayView } from "@/components/CalendarDayView";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { CalendarMonthView } from "@/components/CalendarMonthView";

export default function DailyTasksApp() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const headerBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const progressBarBg = useColorModeValue("gray.200", "gray.700");

  const { tasks, createTask, updateTask, deleteTask, reorderTask, setTasks } =
    useTasks();
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
  const dropTimeRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const pointerPositionRef = useRef({ x: 0, y: 0 });

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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  const tasksBySection = useMemo(() => {
    const grouped = {};
    sortedSections.forEach(section => {
      grouped[section.id] = [];
    });
    // Filter tasks to only show today's tasks in the dashboard view
    const todaysTasksForSections = tasks.filter(task =>
      shouldShowOnDate(task, today)
    );
    todaysTasksForSections.forEach(task => {
      if (grouped[task.sectionId]) {
        grouped[task.sectionId].push(task);
      }
    });
    Object.keys(grouped).forEach(sectionId => {
      grouped[sectionId].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [tasks, sortedSections, today]);

  const todaysTasks = useMemo(() => {
    return tasks.filter(task => shouldShowOnDate(task, today));
  }, [tasks, today]);

  // Tasks that should appear in backlog:
  // 1. Tasks that don't match today's date (based on recurrence/startDate)
  // 2. Tasks without recurrence and without time
  // 3. Not completed
  const backlogTasks = useMemo(() => {
    return tasks.filter(task => {
      // Skip completed tasks
      if (task.completed) return false;

      // If task matches today's date (has recurrence/startDate that matches), exclude from backlog
      if (shouldShowOnDate(task, today)) return false;

      // Include tasks without recurrence and without time
      if (!task.recurrence && !task.time) return true;

      // Include tasks that don't match today's recurrence
      return true;
    });
  }, [tasks, today]);

  const handleToggleTask = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { completed: !task.completed });
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
      const updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      await updateTask(taskId, { subtasks: updatedSubtasks });
    }
  };

  const handleToggleExpand = async taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await updateTask(taskId, { expanded: !task.expanded });
    }
  };

  const handleEditTask = task => {
    setEditingTask(task);
    openTaskDialog();
  };

  const handleDeleteTask = async taskId => {
    await deleteTask(taskId);
  };

  const handleAddTask = sectionId => {
    setDefaultSectionId(sectionId);
    setDefaultTime(null);
    setDefaultDate(null);
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

  const handleDragStart = useCallback(
    event => {
      const id = event.active.id;
      setActiveId(id);
      const task = tasks.find(t => t.id === id);
      setActiveTask(task || null);

      // Track initial position
      if (event.activatorEvent) {
        pointerPositionRef.current = {
          x: event.activatorEvent.clientX,
          y: event.activatorEvent.clientY,
        };
      }

      // Add global mouse move listener to track current position during drag
      const handleGlobalMouseMove = e => {
        pointerPositionRef.current = {
          x: e.clientX,
          y: e.clientY,
        };
      };

      window.addEventListener("mousemove", handleGlobalMouseMove);

      // Store cleanup function on active data
      if (!event.active.data.current) {
        event.active.data.current = {};
      }
      event.active.data.current.cleanup = () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
      };
    },
    [tasks]
  );

  // Helper to calculate time from mouse position relative to droppable element
  const calculateTimeFromPosition = useCallback(
    (clientY, droppableId, calendarView) => {
      // Find the droppable element by its ID
      const droppableElement = document.querySelector(
        `[data-droppable-id="${droppableId}"]`
      );
      if (!droppableElement) {
        // Fallback to stored time
        return dropTimeRef.current || "09:00";
      }

      const rect = droppableElement.getBoundingClientRect();
      const HOUR_HEIGHT = calendarView === "week" ? 48 : 64;

      // Find the scrollable parent container (look for overflow-y: auto/scroll)
      let scrollContainer = droppableElement.parentElement;
      while (scrollContainer && scrollContainer !== document.body) {
        const style = window.getComputedStyle(scrollContainer);
        if (
          scrollContainer.scrollHeight > scrollContainer.clientHeight &&
          (style.overflowY === "auto" || style.overflowY === "scroll")
        ) {
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
      const scrollTop = scrollContainer?.scrollTop || 0;

      // Calculate relative Y position accounting for scroll
      // For week view, we need to account for the column position
      let y = clientY - rect.top + scrollTop;

      // If week view, adjust for column offset
      if (calendarView === "week" && droppableId.includes("calendar-week:")) {
        // The droppable is the column, so y is already relative to it
        y = clientY - rect.top + scrollTop;
      }

      const minutes = Math.max(
        0,
        Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60))
      );
      const snappedMinutes = Math.round(minutes / 15) * 15;
      const h = Math.floor(snappedMinutes / 60) % 24;
      const m = Math.floor(snappedMinutes % 60);
      return `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
    },
    []
  );

  const handleDragMove = useCallback(event => {
    // Position is tracked by global listener in handleDragStart
  }, []);

  // Helper function to determine destination type
  const getDestination = (overData, overId) => {
    if (overData.droppableId === "backlog" || overId === "backlog") {
      return { type: "backlog" };
    }
    if (overData.sectionId) {
      return {
        type: "today-section",
        sectionId: overData.sectionId,
        index: overData.index,
      };
    }
    if (typeof overId === "string" && overId.startsWith("calendar-")) {
      const isUntimed = overId.includes("untimed");
      const parts = overId.split(":");
      const dateStr = parts.slice(1).join(":");
      let date;
      try {
        date = dateStr ? new Date(dateStr) : selectedDate;
        if (isNaN(date.getTime())) date = selectedDate;
      } catch (e) {
        date = selectedDate;
      }
      return {
        type: isUntimed ? "calendar-untimed" : "calendar-timed",
        date,
      };
    }
    return null;
  };

  const handleDragEnd = async event => {
    const { active, over } = event;

    // Cleanup global mouse listener
    const cleanup = active.data.current?.cleanup;
    if (cleanup) cleanup();

    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const activeData = active.data.current || {};
    const overData = over.data.current || {};
    const overId = over.id;

    // Get final mouse position for accurate time calculation
    // Use the most recent tracked position
    const finalMouseY =
      pointerPositionRef.current?.y || event.activatorEvent?.clientY;

    // Handle section reordering
    if (activeData.type === "SECTION" && overData.type === "SECTION") {
      const newSections = Array.from(sections).sort(
        (a, b) => a.order - b.order
      );
      const oldIndex = newSections.findIndex(s => s.id === taskId);
      const newIndex = newSections.findIndex(s => s.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedSections = arrayMove(newSections, oldIndex, newIndex);
        await reorderSections(reorderedSections);
      }
      return;
    }

    // Handle task dragging
    if (activeData.type !== "TASK") return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const source = activeData.source || "backlog";
    const destination = getDestination(overData, overId);
    if (!destination) return;

    // Handle different destination types
    if (destination.type === "backlog") {
      // Move to backlog - clear time and recurrence
      await updateTask(taskId, { time: null, recurrence: null });
    } else if (destination.type === "today-section") {
      // Move to today view section
      const currentRecurrence = task.recurrence;
      let recurrence = currentRecurrence;
      if (!recurrence) {
        recurrence = {
          type: "none",
          startDate: today.toISOString(),
        };
      } else if (recurrence.type === "none" && recurrence.startDate) {
        recurrence = {
          ...recurrence,
          startDate: today.toISOString(),
        };
      }

      if (
        source === "today" &&
        activeData.sectionId === destination.sectionId
      ) {
        // Reordering within same section
        const sectionTasks = [...(tasksBySection[destination.sectionId] || [])];
        const oldIndex = sectionTasks.findIndex(t => t.id === taskId);
        const newIndex =
          destination.index !== undefined
            ? destination.index
            : sectionTasks.length - 1;

        if (oldIndex !== -1 && oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(sectionTasks, oldIndex, newIndex);
          const previousTasks = [...tasks];
          setTasks(prev =>
            prev.map(t => {
              const newTaskIndex = reorderedTasks.findIndex(
                rt => rt.id === t.id
              );
              return newTaskIndex !== -1 &&
                t.sectionId === destination.sectionId
                ? { ...t, order: newTaskIndex }
                : t;
            })
          );

          try {
            const updatePromises = reorderedTasks.map((t, index) =>
              updateTask(t.id, { order: index }, null)
            );
            await Promise.all(updatePromises);
          } catch (err) {
            setTasks(previousTasks);
            throw err;
          }
        }
      } else {
        // Moving to different section
        await reorderTask(
          taskId,
          activeData.sectionId,
          destination.sectionId,
          destination.index || 0,
          {
            sectionId: destination.sectionId,
            time: null,
            recurrence,
            order: destination.index || 0,
          }
        );
      }
    } else if (destination.type === "calendar-timed") {
      // Move to calendar timed area - set date and time
      // Calculate time from final drop position
      let dropTime = "09:00";
      if (finalMouseY && overId) {
        dropTime = calculateTimeFromPosition(finalMouseY, overId, calendarView);
      } else {
        dropTime = dropTimeRef.current || "09:00";
      }
      dropTimeRef.current = null;

      await updateTask(
        taskId,
        {
          time: dropTime,
          recurrence: {
            type: source === "today" ? "daily" : "none",
            startDate: destination.date.toISOString(),
          },
          sectionId: task.sectionId,
        },
        {
          time: dropTime,
          recurrence: {
            type: source === "today" ? "daily" : "none",
            startDate: destination.date.toISOString(),
          },
        }
      );
    } else if (destination.type === "calendar-untimed") {
      // Move to calendar untimed area - set date, clear time
      await updateTask(
        taskId,
        {
          time: null,
          recurrence: task.recurrence || {
            type: "none",
            startDate: destination.date.toISOString(),
          },
        },
        {
          time: null,
          recurrence: task.recurrence || {
            type: "none",
            startDate: destination.date.toISOString(),
          },
        }
      );
    }
  };

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

  const navigateCalendar = dir => {
    const d = new Date(selectedDate);
    if (calendarView === "day") {
      d.setDate(d.getDate() + dir);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() + dir * 7);
    } else if (calendarView === "month") {
      d.setMonth(d.getMonth() + dir);
    }
    setSelectedDate(d);
  };

  const getCalendarTitle = () => {
    if (calendarView === "day") {
      return selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (calendarView === "week") {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } else {
      return selectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    }
  };

  const completedTodayCount = todaysTasks.filter(
    t =>
      t.completed ||
      (t.subtasks &&
        t.subtasks.length > 0 &&
        t.subtasks.every(st => st.completed))
  ).length;

  const dailyProgressPercentage =
    todaysTasks.length > 0
      ? Math.round((completedTodayCount / todaysTasks.length) * 100)
      : 0;

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg={bgColor}>
      <Box
        as="header"
        bg={headerBg}
        borderBottomWidth="1px"
        borderColor={borderColor}
        px={4}
        py={3}
        flexShrink={0}
      >
        <Flex align="center" justify="space-between">
          <HStack spacing={4}>
            <Heading size="md">{getGreeting()}</Heading>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant={backlogOpen ? "solid" : "ghost"}
                onClick={() => setBacklogOpen(!backlogOpen)}
                position="relative"
                leftIcon={<List size={18} />}
              >
                Backlog
                {backlogTasks.length > 0 && (
                  <Badge
                    position="absolute"
                    top="-1"
                    right="-1"
                    bg="red.500"
                    color="white"
                    fontSize="2xs"
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
              </Button>
              <Button
                size="sm"
                variant={showDashboard ? "solid" : "ghost"}
                onClick={() => setShowDashboard(!showDashboard)}
                leftIcon={<LayoutDashboard size={18} />}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant={showCalendar ? "solid" : "ghost"}
                onClick={() => setShowCalendar(!showCalendar)}
                leftIcon={<Calendar size={18} />}
              >
                Calendar
              </Button>
            </HStack>
          </HStack>
          <HStack spacing={2}>
            {showDashboard && (
              <Text fontSize="sm" color={mutedText}>
                Today's Progress: {completedTodayCount}/{todaysTasks.length} (
                {todaysTasks.length > 0
                  ? Math.round((completedTodayCount / todaysTasks.length) * 100)
                  : 0}
                %)
              </Text>
            )}
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
            <IconButton
              icon={
                colorMode === "light" ? <Moon size={18} /> : <Sun size={18} />
              }
              onClick={toggleColorMode}
              variant="ghost"
              aria-label="Toggle color mode"
            />
            <IconButton
              icon={<Settings size={18} />}
              variant="ghost"
              aria-label="Settings"
            />
          </HStack>
        </Flex>
        {showDashboard && todaysTasks.length > 0 && (
          <Box w="full" h="6px" bg={progressBarBg} flexShrink={0}>
            <Progress
              value={dailyProgressPercentage}
              size="xs"
              colorScheme="blue"
              borderRadius="none"
              h="6px"
              bg="transparent"
            />
          </Box>
        )}
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
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
              />
            )}
          </Box>

          {/* Main Content */}
          <Box flex={1} overflow="hidden" display="flex" flexDirection="column">
            <Box flex={1} overflowY="auto">
              <Box w="full" px={4} py={6} display="flex" gap={6} h="full">
                {/* Dashboard View */}
                {showDashboard && (
                  <Box flex={1} minW={0} overflowY="auto">
                    <SortableContext
                      items={sortedSections.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <Box>
                        {sortedSections.map((section, index) => (
                          <Section
                            key={section.id}
                            section={section}
                            index={index}
                            tasks={tasksBySection[section.id] || []}
                            onToggleTask={handleToggleTask}
                            onToggleSubtask={handleToggleSubtask}
                            onToggleExpand={handleToggleExpand}
                            onEditTask={handleEditTask}
                            onDeleteTask={handleDeleteTask}
                            onAddTask={handleAddTask}
                            onEditSection={handleEditSection}
                            onDeleteSection={handleDeleteSection}
                          />
                        ))}
                        <Button
                          variant="outline"
                          onClick={handleAddSection}
                          w="full"
                          py={6}
                          borderStyle="dashed"
                          mt={4}
                        >
                          <Plus size={20} style={{ marginRight: "8px" }} />
                          Add Section
                        </Button>
                      </Box>
                    </SortableContext>
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
        <DragOverlay>
          {activeTask ? (
            <Box
              p={3}
              borderRadius="md"
              bg={activeTask.color || "#3b82f6"}
              color="white"
              boxShadow="xl"
              minW="200px"
            >
              <Text fontWeight="medium">{activeTask.title}</Text>
              {activeTask.time && (
                <Text fontSize="sm" opacity={0.8} mt={1}>
                  {activeTask.time}
                </Text>
              )}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

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

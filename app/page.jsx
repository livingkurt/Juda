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
  Collapse,
} from "@chakra-ui/react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
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
  const dropTimeRef = useRef(null);
  const [hoveredDroppable, setHoveredDroppable] = useState(null);

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
  const greeting = getGreeting();
  const GreetingIcon =
    greeting.icon === "Sun" ? Sun : greeting.icon === "Sunset" ? Sunset : Moon;

  const todaysTasks = useMemo(
    () => tasks.filter(task => shouldShowOnDate(task, today)),
    [tasks]
  );
  const tasksBySection = useMemo(() => {
    const grouped = {};
    sections.forEach(s => {
      grouped[s.id] = todaysTasks
        .filter(t => t.sectionId === s.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [todaysTasks, sections]);

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

  const handleDragEnd = async result => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (type === "SECTION") {
      const newSections = Array.from(sections).sort(
        (a, b) => a.order - b.order
      );
      const [reorderedSection] = newSections.splice(source.index, 1);
      newSections.splice(destination.index, 0, reorderedSection);
      await reorderSections(newSections);
    } else if (type === "TASK") {
      const sourceDroppableId = source.droppableId;
      const destDroppableId = destination.droppableId;
      const taskId = draggableId;

      // Handle drag from backlog
      if (sourceDroppableId === "backlog") {
        if (destDroppableId === "backlog") {
          // Reordering within backlog - not applicable for tasks
          return;
        } else if (
          destDroppableId.startsWith("calendar-") &&
          !destDroppableId.includes("untimed")
        ) {
          // Dropped on calendar (timed area) - set date/time based on position
          const dropParts = destDroppableId.split(":");
          // dropParts[0] = "calendar-day" or "calendar-week"
          // Join everything after the first colon (date string may contain colons from ISO format)
          const dropDateStr = dropParts.slice(1).join(":");
          let dropDate;
          try {
            if (dropDateStr) {
              dropDate = new Date(dropDateStr);
              // Validate the date
              if (isNaN(dropDate.getTime())) {
                console.error("Invalid date string:", dropDateStr);
                dropDate = selectedDate;
              }
            } else {
              // Fallback to selectedDate if no date in droppable ID
              dropDate = selectedDate;
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            dropDate = selectedDate;
          }
          // Use stored drop time from ref, default to 9 AM
          const dropTime = dropTimeRef.current || "09:00";
          dropTimeRef.current = null; // Reset

          // Find the task to update
          const taskToUpdate = tasks.find(t => t.id === taskId);
          if (!taskToUpdate) return;

          // Optimistically update immediately
          const optimisticUpdate = {
            time: dropTime,
            recurrence: {
              type: "none",
              startDate: dropDate.toISOString(),
            },
          };

          // Set as one-time task (no recurrence) with the specific date/time
          await updateTask(
            taskId,
            {
              time: dropTime,
              recurrence: {
                type: "none",
                startDate: dropDate.toISOString(),
              },
              sectionId: taskToUpdate.sectionId, // Keep the section
            },
            optimisticUpdate
          );
        } else {
          // Dropped on today view section - set date to today, no time, preserve recurrence
          const taskToUpdateToday = tasks.find(t => t.id === taskId);
          if (!taskToUpdateToday) return;

          // Keep existing recurrence or set as one-time with today's date
          const currentRecurrence = taskToUpdateToday.recurrence;
          let recurrence = currentRecurrence;
          if (!recurrence) {
            // If no recurrence, set as one-time task for today
            recurrence = {
              type: "none",
              startDate: today.toISOString(),
            };
          } else if (recurrence.type === "none" && recurrence.startDate) {
            // Update startDate to today if it's already a one-time task
            recurrence = {
              ...recurrence,
              startDate: today.toISOString(),
            };
          }
          // For recurring tasks, we keep the recurrence as-is (it will show up based on recurrence pattern)

          await updateTask(taskId, {
            sectionId: destDroppableId,
            time: null,
            recurrence,
            order: destination.index,
          });
        }
      }
      // Handle drag from today view sections
      else if (
        sourceDroppableId !== "backlog" &&
        !sourceDroppableId.startsWith("calendar-")
      ) {
        if (destDroppableId === "backlog") {
          // Dropped on backlog - remove date/time
          const optimisticUpdate = { time: null, recurrence: null };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        } else if (destDroppableId.startsWith("calendar-")) {
          // Dropped on calendar - set date/time based on position
          const dropParts = destDroppableId.split(":");
          const calendarType = dropParts[0].split("-")[1];
          const dropDateStr = dropParts.slice(1).join(":");
          let dropDate;
          try {
            dropDate = dropDateStr ? new Date(dropDateStr) : selectedDate;
            if (isNaN(dropDate.getTime())) dropDate = selectedDate;
          } catch (e) {
            dropDate = selectedDate;
          }
          // Use stored drop time from ref, default to 9 AM
          const dropTime = dropTimeRef.current || "09:00";
          dropTimeRef.current = null; // Reset

          const optimisticUpdate = {
            time: dropTime,
            recurrence: {
              type: "daily",
              startDate: dropDate.toISOString(),
            },
          };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        } else {
          // Moving within or between sections
          if (sourceDroppableId === destDroppableId) {
            const sectionTasks = [...(tasksBySection[sourceDroppableId] || [])];
            const [reorderedTask] = sectionTasks.splice(source.index, 1);
            sectionTasks.splice(destination.index, 0, reorderedTask);

            // Batch optimistic updates first
            const previousTasks = [...tasks];
            setTasks(prev =>
              prev.map(t => {
                const newIndex = sectionTasks.findIndex(st => st.id === t.id);
                return newIndex !== -1 && t.sectionId === sourceDroppableId
                  ? { ...t, order: newIndex }
                  : t;
              })
            );

            // Then make API calls
            try {
              const updatePromises = sectionTasks.map((t, index) =>
                updateTask(t.id, { order: index }, null)
              );
              await Promise.all(updatePromises);
            } catch (err) {
              // Rollback on error
              setTasks(previousTasks);
              throw err;
            }
          } else {
            const taskToMove = tasks.find(t => t.id === taskId);
            if (taskToMove) {
              const optimisticUpdate = {
                sectionId: destDroppableId,
                order: destination.index,
              };
              await reorderTask(
                taskId,
                sourceDroppableId,
                destDroppableId,
                destination.index,
                optimisticUpdate
              );
            }
          }
        }
      }
      // Handle drag from calendar (including untimed tasks area)
      else if (sourceDroppableId.startsWith("calendar-")) {
        if (destDroppableId === "backlog") {
          // Dropped on backlog - remove date/time
          const optimisticUpdate = { time: null, recurrence: null };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        } else if (
          destDroppableId.startsWith("calendar-") &&
          !destDroppableId.includes("untimed")
        ) {
          // Moving to timed calendar area - update time/date
          const dropParts = destDroppableId.split(":");
          const calendarType = dropParts[0].split("-")[1]; // "day" or "week"
          // Join everything after the first colon (date string may contain colons from ISO format)
          const dropDateStr = dropParts.slice(1).join(":");
          let dropDate;
          try {
            if (dropDateStr) {
              dropDate = new Date(dropDateStr);
              // Validate the date
              if (isNaN(dropDate.getTime())) {
                console.error("Invalid date string:", dropDateStr);
                dropDate = selectedDate;
              }
            } else {
              // Fallback to selectedDate if no date in droppable ID
              dropDate = selectedDate;
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            dropDate = selectedDate;
          }
          // Use stored drop time from ref, default to 9 AM
          const dropTime = dropTimeRef.current || "09:00";
          dropTimeRef.current = null; // Reset

          // Find the task to update
          const taskToUpdate = tasks.find(t => t.id === taskId);
          if (!taskToUpdate) return;

          // When moving calendar items to a different date, always set as one-time task
          // This ensures the task appears only on the date it's dropped on
          const optimisticUpdate = {
            time: dropTime,
            recurrence: {
              type: "none",
              startDate: dropDate.toISOString(),
            },
          };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        } else if (destDroppableId.includes("untimed")) {
          // Moving from timed to untimed area - remove time but keep date
          const dropParts = destDroppableId.split(":");
          // Handle both "calendar-day-untimed:" and "calendar-week-untimed:" formats
          // Join everything after the first colon (date string may contain colons from ISO format)
          const dropDateStr = dropParts.slice(1).join(":");
          let dropDate;
          try {
            if (dropDateStr) {
              dropDate = new Date(dropDateStr);
              // Validate the date
              if (isNaN(dropDate.getTime())) {
                console.error("Invalid date string:", dropDateStr);
                dropDate = selectedDate;
              }
            } else {
              // Fallback to selectedDate if no date in droppable ID
              dropDate = selectedDate;
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            dropDate = selectedDate;
          }

          const taskToUpdate = tasks.find(t => t.id === taskId);
          if (!taskToUpdate) return;

          // Keep recurrence but remove time
          const currentRecurrence = taskToUpdate.recurrence;
          const optimisticUpdate = {
            time: null,
            recurrence: currentRecurrence || {
              type: "none",
              startDate: dropDate.toISOString(),
            },
          };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        } else {
          // Dropped on today view section - set date to today, no time, preserve recurrence
          const taskToUpdateToday = tasks.find(t => t.id === taskId);
          if (!taskToUpdateToday) return;

          // Keep existing recurrence or set as one-time with today's date
          const currentRecurrence = taskToUpdateToday.recurrence;
          let recurrence = currentRecurrence;
          if (!recurrence) {
            // If no recurrence, set as one-time task for today
            recurrence = {
              type: "none",
              startDate: today.toISOString(),
            };
          } else if (recurrence.type === "none" && recurrence.startDate) {
            // Update startDate to today if it's already a one-time task
            recurrence = {
              ...recurrence,
              startDate: today.toISOString(),
            };
          }
          // For recurring tasks, we keep the recurrence as-is (it will show up based on recurrence pattern)

          const optimisticUpdate = {
            sectionId: destDroppableId,
            time: null,
            recurrence,
            order: destination.index,
          };
          await updateTask(taskId, optimisticUpdate, optimisticUpdate);
        }
      }
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

  return (
    <Box
      h="100vh"
      display="flex"
      flexDirection="column"
      overflow="hidden"
      bg={bgColor}
      color={textColor}
    >
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
                  {today.toLocaleDateString("en-US", {
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

      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragUpdate={update => {
          // Track which droppable is being hovered over
          if (update.destination) {
            setHoveredDroppable(update.destination.droppableId);
          } else {
            setHoveredDroppable(null);
          }
        }}
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
                    <Droppable
                      droppableId="sections"
                      type="SECTION"
                      direction="vertical"
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          bg={
                            snapshot.isDraggingOver
                              ? useColorModeValue("gray.50", "gray.800")
                              : "transparent"
                          }
                          borderRadius="md"
                        >
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
                              hoveredDroppable={hoveredDroppable}
                            />
                          ))}
                          {provided.placeholder}
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
                      )}
                    </Droppable>
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
      </DragDropContext>

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

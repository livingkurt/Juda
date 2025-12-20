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
import { DragDropContext } from "@hello-pangea/dnd";
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

// Helper to parse droppable IDs consistently
const parseDroppableId = (droppableId) => {
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
  todaySection: (sectionId) => `today-section|${sectionId}`,
  calendarDay: (date) => `calendar-day|${date.toISOString()}`,
  calendarDayUntimed: (date) => `calendar-day-untimed|${date.toISOString()}`,
  calendarWeek: (date) => `calendar-week|${date.toISOString()}`,
  calendarWeekUntimed: (date) => `calendar-week-untimed|${date.toISOString()}`,
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
  const [hoveredDroppable, setHoveredDroppable] = useState(null);
  
  // Store drop time calculated from mouse position during drag
  const dropTimeRef = useRef(null);

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
  const backlogTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.completed) return false;
      if (shouldShowOnDate(task, today)) return false;
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
    
    // Clear hovered state
    setHoveredDroppable(null);

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
      const taskId = draggableId;
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
        updates = {
          sectionId: destParsed.sectionId,
          time: null,
          recurrence: {
            type: "none",
            startDate: today.toISOString(),
          },
          order: destination.index,
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
          recurrence: task.recurrence?.type && task.recurrence.type !== "none"
            ? task.recurrence // Keep recurring pattern
            : {
                type: "none",
                startDate: dropDate.toISOString(),
              },
        };
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await updateTask(taskId, updates);
      }

      // Handle reordering within same container
      if (
        source.droppableId === destination.droppableId &&
        sourceParsed.type === "today-section"
      ) {
        // Reorder within section
        const sectionTasks = [...(tasksBySection[sourceParsed.sectionId] || [])];
        const [movedTask] = sectionTasks.splice(source.index, 1);
        sectionTasks.splice(destination.index, 0, movedTask);
        
        // Update order for all tasks in section
        for (let i = 0; i < sectionTasks.length; i++) {
          if (sectionTasks[i].order !== i) {
            await updateTask(sectionTasks[i].id, { order: i });
          }
        }
      }
    }
  };

  const handleDragUpdate = update => {
    if (update.destination) {
      setHoveredDroppable(update.destination.droppableId);
    } else {
      setHoveredDroppable(null);
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

      {/* Main content with DragDropContext */}
      <DragDropContext
        onDragEnd={handleDragEnd}
        onDragUpdate={handleDragUpdate}
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
                      hoveredDroppable={hoveredDroppable}
                      createDroppableId={createDroppableId}
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

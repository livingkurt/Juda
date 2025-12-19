"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Tabs,
  TabList,
  Tab,
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
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Calendar,
  LayoutDashboard,
  PanelLeftOpen,
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

  const [activeTab, setActiveTab] = useState("dashboard");
  const [calendarView, setCalendarView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTask, setEditingTask] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [defaultSectionId, setDefaultSectionId] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);

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
  const {
    isOpen: backlogOpen,
    onOpen: openBacklog,
    onClose: closeBacklog,
  } = useDisclosure();
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
      const sourceSectionId = source.droppableId;
      const destSectionId = destination.droppableId;
      const taskId = draggableId;

      if (sourceSectionId === destSectionId) {
        const sectionTasks = [...(tasksBySection[sourceSectionId] || [])];
        const [reorderedTask] = sectionTasks.splice(source.index, 1);
        sectionTasks.splice(destination.index, 0, reorderedTask);

        const updatePromises = sectionTasks.map((t, index) =>
          updateTask(t.id, { order: index })
        );
        await Promise.all(updatePromises);
      } else {
        await reorderTask(
          taskId,
          sourceSectionId,
          destSectionId,
          destination.index
        );
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
        <Box maxW="6xl" mx="auto" px={4} py={4}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <Box position="relative">
                <IconButton
                  icon={<PanelLeftOpen size={20} />}
                  onClick={openBacklog}
                  variant="ghost"
                  aria-label="Open backlog"
                />
                {backlog.filter(b => !b.completed).length > 0 && (
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
                    {backlog.filter(b => !b.completed).length}
                  </Badge>
                )}
              </Box>
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
          {activeTab === "dashboard" && (
            <Box mt={4}>
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
        <Box maxW="6xl" mx="auto" px={4}>
          <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
            <Tabs
              index={activeTab === "dashboard" ? 0 : 1}
              onChange={index =>
                setActiveTab(index === 0 ? "dashboard" : "calendar")
              }
            >
              <TabList bg={useColorModeValue("gray.100", "gray.700")}>
                <Tab>
                  <LayoutDashboard size={16} style={{ marginRight: "8px" }} />
                  Today
                </Tab>
                <Tab>
                  <Calendar size={16} style={{ marginRight: "8px" }} />
                  Calendar
                </Tab>
              </TabList>
            </Tabs>
            {activeTab === "calendar" && (
              <Flex align="center" gap={2} pb={2}>
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
        </Box>
      </Box>

      <Box as="main" flex={1} overflow="hidden">
        {activeTab === "dashboard" && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Box h="full" overflowY="auto">
              <Box maxW="3xl" mx="auto" px={4} py={6}>
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
            </Box>
          </DragDropContext>
        )}
        {activeTab === "calendar" && (
          <Box h="full" maxW="6xl" mx="auto" px={4} py={4}>
            <Card
              h="full"
              overflow="hidden"
              bg={bgColor}
              borderColor={borderColor}
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

      <BacklogDrawer
        isOpen={backlogOpen}
        onClose={closeBacklog}
        backlog={backlog}
        onToggle={async id => {
          const item = backlog.find(b => b.id === id);
          if (item) await updateBacklogItem(id, !item.completed);
        }}
        onDelete={deleteBacklogItem}
        onAdd={createBacklogItem}
      />
      <TaskDialog
        isOpen={taskDialogOpen}
        onClose={() => {
          closeTaskDialog();
          setEditingTask(null);
          setDefaultSectionId(null);
          setDefaultTime(null);
        }}
        task={editingTask}
        sections={sections}
        onSave={handleSaveTask}
        defaultSectionId={defaultSectionId}
        defaultTime={defaultTime}
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

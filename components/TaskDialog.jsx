"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Dialog,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  IconButton,
  Tabs,
  createListCollection,
} from "@chakra-ui/react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Search, Dumbbell } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS, ORDINAL_OPTIONS, MONTH_OPTIONS, COMPLETION_TYPES } from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";
import { TagSelector } from "./TagSelector";
import { TaskItem } from "./TaskItem";
import { RichTextEditor } from "./RichTextEditor";
import { TagChip } from "./TagChip";
import WorkoutBuilder from "./WorkoutBuilder";
import WeekdaySelector from "./WeekdaySelector";
import { SelectDropdown } from "./SelectDropdown";
import { useGetWorkoutProgramQuery } from "@/lib/store/api/workoutProgramsApi";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// Internal component that resets when key changes
function TaskDialogForm({
  task,
  sections,
  onSave,
  onClose,
  defaultSectionId,
  defaultTime,
  defaultDate,
  tags,
  onCreateTag,
  onDeleteTag,
  allTasks,
}) {
  const { mode } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const searchResultBg = mode.bg.muted;
  const borderColor = mode.border.default;

  // Initialize state from task or defaults
  const [title, setTitle] = useState(task?.title || "");
  const [sectionId, setSectionId] = useState(task?.sectionId || defaultSectionId || sections[0]?.id || "");
  const [time, setTime] = useState(task?.time || defaultTime || "");
  const [date, setDate] = useState(() => {
    if (task?.recurrence?.startDate) {
      return task.recurrence.startDate.split("T")[0];
    }
    return defaultDate || (defaultTime ? formatLocalDate(new Date()) : "");
  });
  const [duration, setDuration] = useState(task?.duration ?? (defaultTime ? 30 : 0));
  const [recurrenceType, setRecurrenceType] = useState(task?.recurrence?.type || "none");
  const [status, setStatus] = useState(task?.status || (task ? undefined : "todo"));
  const [selectedDays, setSelectedDays] = useState(task?.recurrence?.days || []);
  const [endDate, setEndDate] = useState(() => {
    if (task?.recurrence?.endDate) {
      return task.recurrence.endDate.split("T")[0];
    }
    return "";
  });
  // Monthly recurrence state
  const [monthlyMode, setMonthlyMode] = useState(() => {
    if (task?.recurrence?.type === "monthly" && task.recurrence.weekPattern) {
      return "weekPattern";
    }
    return "dayOfMonth";
  });
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(task?.recurrence?.dayOfMonth || []);
  const [monthlyOrdinal, setMonthlyOrdinal] = useState(task?.recurrence?.weekPattern?.ordinal || 1);
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState(task?.recurrence?.weekPattern?.dayOfWeek || 0);
  const [monthlyInterval, setMonthlyInterval] = useState(task?.recurrence?.interval || 1);

  // Yearly recurrence state
  const [yearlyMode, setYearlyMode] = useState(() => {
    if (task?.recurrence?.type === "yearly" && task.recurrence.weekPattern) {
      return "weekPattern";
    }
    return "dayOfMonth";
  });
  const [yearlyMonth, setYearlyMonth] = useState(() => {
    if (task?.recurrence?.type === "yearly") {
      return task.recurrence.month || 1;
    }
    return new Date().getMonth() + 1;
  });
  const [yearlyDayOfMonth, setYearlyDayOfMonth] = useState(() => {
    if (task?.recurrence?.type === "yearly") {
      return task.recurrence.dayOfMonth || 1;
    }
    return new Date().getDate();
  });
  const [yearlyOrdinal, setYearlyOrdinal] = useState(task?.recurrence?.weekPattern?.ordinal || 1);
  const [yearlyDayOfWeek, setYearlyDayOfWeek] = useState(task?.recurrence?.weekPattern?.dayOfWeek || 0);
  const [yearlyInterval, setYearlyInterval] = useState(task?.recurrence?.interval || 1);

  const [subtasks, setSubtasks] = useState(() => {
    const taskSubtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
    // Create a copy before sorting to avoid mutating frozen Redux state
    return [...taskSubtasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((st, idx) => ({ ...st, order: idx }));
  });
  const [newSubtask, setNewSubtask] = useState("");
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskTime, setSubtaskTime] = useState("");
  const [subtaskDuration, setSubtaskDuration] = useState(30);
  const [selectedTagIds, setSelectedTagIds] = useState(() => {
    const taskTags = Array.isArray(task?.tags) ? task.tags : [];
    return taskTags.map(t => t.id);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [subtaskTabIndex, setSubtaskTabIndex] = useState(0);
  const [activeSubtaskId, setActiveSubtaskId] = useState(null);
  const [completionType, setCompletionType] = useState(task?.completionType || "checkbox");
  const [content, setContent] = useState(task?.content || "");
  const [workoutBuilderOpen, setWorkoutBuilderOpen] = useState(false);
  const { data: workoutProgram } = useGetWorkoutProgramQuery(task?.id, {
    skip: !task?.id,
  });
  // Derive workout program status from Redux query
  const hasWorkoutProgram = Boolean(workoutProgram);
  const workoutProgramWeeks = workoutProgram?.numberOfWeeks || 0;

  // Workout program status is now derived from workoutProgram query data

  // Calculate total weeks from recurrence dates
  const totalWeeks = useMemo(() => {
    if (!date || !endDate) return 1;
    const startDate = new Date(date);
    const end = new Date(endDate);
    const daysDiff = Math.floor((end - startDate) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(daysDiff / 7);
    return Math.max(1, weeks);
  }, [date, endDate]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Create collections for selects
  const sectionCollection = useMemo(
    () => createListCollection({ items: sections.map(s => ({ label: s.name, value: s.id })) }),
    [sections]
  );

  const durationCollection = useMemo(
    () => createListCollection({ items: DURATION_OPTIONS.map(d => ({ label: d.label, value: d.value.toString() })) }),
    []
  );

  const completionTypeCollection = useMemo(
    () =>
      createListCollection({
        items: COMPLETION_TYPES,
      }),
    []
  );

  const recurrenceCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "None (One-time task)", value: "none" },
          { label: "Every day", value: "daily" },
          { label: "Specific days", value: "weekly" },
          { label: "Monthly", value: "monthly" },
          { label: "Yearly", value: "yearly" },
        ],
      }),
    []
  );

  const monthlyModeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "On specific day(s) of month", value: "dayOfMonth" },
          { label: "On a specific weekday pattern", value: "weekPattern" },
        ],
      }),
    []
  );

  const yearlyModeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "On specific date", value: "dayOfMonth" },
          { label: "On a specific weekday pattern", value: "weekPattern" },
        ],
      }),
    []
  );

  const ordinalCollection = useMemo(
    () =>
      createListCollection({ items: ORDINAL_OPTIONS.map(opt => ({ label: opt.label, value: opt.value.toString() })) }),
    []
  );

  const monthCollection = useMemo(
    () =>
      createListCollection({ items: MONTH_OPTIONS.map(opt => ({ label: opt.label, value: opt.value.toString() })) }),
    []
  );

  const dayOfWeekCollection = useMemo(
    () => createListCollection({ items: DAYS_OF_WEEK.map(day => ({ label: day.label, value: day.value.toString() })) }),
    []
  );

  const dayOfMonthSelectCollection = useMemo(
    () =>
      createListCollection({
        items: Array.from({ length: 31 }, (_, i) => ({ label: (i + 1).toString(), value: (i + 1).toString() })),
      }),
    []
  );

  const statusCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Todo", value: "todo" },
          { label: "In Progress", value: "in_progress" },
          { label: "Complete", value: "complete" },
        ],
      }),
    []
  );

  // State initialization is now handled in useState initializers above
  // No need for useLayoutEffect since we're using a key prop to reset the form

  const handleSave = () => {
    if (!title.trim()) return;

    let recurrence = null;
    if (recurrenceType === "none") {
      if (date) {
        // Create ISO string at midnight UTC from the date string to avoid timezone shifts
        recurrence = {
          type: "none",
          startDate: `${date}T00:00:00.000Z`,
        };
      }
    } else if (recurrenceType === "daily") {
      recurrence = {
        type: "daily",
        ...(date && { startDate: `${date}T00:00:00.000Z` }),
        ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
      };
    } else if (recurrenceType === "weekly") {
      recurrence = {
        type: "weekly",
        days: selectedDays,
        ...(date && { startDate: `${date}T00:00:00.000Z` }),
        ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
      };
    } else if (recurrenceType === "monthly") {
      recurrence = {
        type: "monthly",
        ...(monthlyMode === "dayOfMonth"
          ? { dayOfMonth: selectedDayOfMonth }
          : { weekPattern: { ordinal: monthlyOrdinal, dayOfWeek: monthlyDayOfWeek } }),
        ...(monthlyInterval > 1 && { interval: monthlyInterval }),
        ...(date && { startDate: `${date}T00:00:00.000Z` }),
        ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
      };
    } else if (recurrenceType === "yearly") {
      recurrence = {
        type: "yearly",
        month: yearlyMonth,
        ...(yearlyMode === "dayOfMonth"
          ? { dayOfMonth: yearlyDayOfMonth }
          : { weekPattern: { ordinal: yearlyOrdinal, dayOfWeek: yearlyDayOfWeek } }),
        ...(yearlyInterval > 1 && { interval: yearlyInterval }),
        ...(date && { startDate: `${date}T00:00:00.000Z` }),
        ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
      };
    }

    // Ensure all subtasks have proper order field set
    const orderedSubtasks = subtasks.map((st, idx) => ({
      ...st,
      order: idx,
    }));

    onSave({
      id: task?.id,
      title,
      sectionId,
      time: time || null,
      duration,
      recurrence,
      subtasks: orderedSubtasks,
      // Note: Task completion is tracked via TaskCompletion records, not a field on Task
      expanded: task?.expanded || false,
      order: task?.order ?? 999,
      tagIds: selectedTagIds,
      completionType,
      content: content || null,
      // workoutData removed - now saved separately via WorkoutBuilder
      status: recurrenceType === "none" ? status || "todo" : "todo",
    });
    onClose();
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    handleSave();
  };

  // Handle drag and drop for subtasks
  const handleDragStart = event => {
    setActiveSubtaskId(event.active.id);
  };

  const handleDragEnd = event => {
    const { active, over } = event;
    setActiveSubtaskId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = subtasks.findIndex(st => `subtask-${st.id}` === active.id);
    const newIndex = subtasks.findIndex(st => `subtask-${st.id}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedSubtasks = arrayMove(subtasks, oldIndex, newIndex);
      setSubtasks(reorderedSubtasks.map((st, idx) => ({ ...st, order: idx })));
    }
  };

  const handleDragCancel = () => {
    setActiveSubtaskId(null);
  };

  // Get the active subtask for drag overlay
  const activeSubtask = activeSubtaskId ? subtasks.find(st => `subtask-${st.id}` === activeSubtaskId) : null;

  // Search and add existing task as subtask
  const filteredTasks = allTasks.filter(t => {
    // Exclude current task and its subtasks
    if (task && t.id === task.id) return false;
    if (subtasks.some(st => st.id === t.id)) return false;
    // Filter by search query
    if (searchQuery.trim()) {
      return t.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  const addExistingTaskAsSubtask = existingTask => {
    // Add the task as a subtask (it will be converted when saved)
    setSubtasks([
      ...subtasks,
      {
        id: existingTask.id,
        title: existingTask.title,
        completed: false,
        time: existingTask.time,
        duration: existingTask.duration || 30,
        order: subtasks.length,
        isExisting: true, // Flag to indicate this is an existing task
      },
    ]);
    setSearchQuery("");
    setSubtaskTabIndex(0); // Switch back to subtasks list
  };

  return (
    <>
      <Dialog.Root open={true} onOpenChange={({ open }) => !open && onClose()} size="md">
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content bg={bgColor} maxH="90vh" overflowY="auto">
            <Dialog.Header>{task ? "Edit Task" : "New Task"}</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <form onSubmit={handleFormSubmit}>
                <VStack spacing={4} py={4}>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Task Name
                    </Text>
                    <Input
                      autoFocus
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && title.trim()) {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                    />
                  </Box>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Section
                    </Text>
                    <SelectDropdown
                      collection={sectionCollection}
                      value={[sectionId]}
                      onValueChange={({ value }) => setSectionId(value[0])}
                      placeholder="Select section"
                      inModal={true}
                    />
                  </Box>
                  <SimpleGrid columns={2} spacing={4} w="full">
                    <Box>
                      <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                        Date
                      </Text>
                      <Input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        placeholder="Optional"
                        borderColor={borderColor}
                        fontSize={{ base: "md", md: "md" }}
                        _focus={{
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && title.trim()) {
                            e.preventDefault();
                            handleSave();
                          }
                        }}
                      />
                      {date && (
                        <Button size="xs" variant="ghost" mt={1} onClick={() => setDate("")}>
                          Clear date
                        </Button>
                      )}
                    </Box>
                    <Box>
                      <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                        Time
                      </Text>
                      <Input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        placeholder="Optional"
                        borderColor={borderColor}
                        fontSize={{ base: "md", md: "md" }}
                        _focus={{
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && title.trim()) {
                            e.preventDefault();
                            handleSave();
                          }
                        }}
                      />
                      {time && (
                        <Button size="xs" variant="ghost" mt={1} onClick={() => setTime("")}>
                          Clear time
                        </Button>
                      )}
                    </Box>
                  </SimpleGrid>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Duration
                    </Text>
                    <SelectDropdown
                      collection={durationCollection}
                      value={[duration.toString()]}
                      onValueChange={({ value }) => setDuration(parseInt(value[0]))}
                      placeholder="Select duration"
                      inModal={true}
                    />
                  </Box>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Completion Type
                    </Text>
                    <SelectDropdown
                      collection={completionTypeCollection}
                      value={[completionType]}
                      onValueChange={({ value }) => setCompletionType(value[0])}
                      placeholder="Select completion type"
                      inModal={true}
                    />
                    {completionType === "note" && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Notes appear in the Notes tab, not in Backlog/Today/Calendar
                      </Text>
                    )}
                    {completionType === "workout" && (
                      <Box mt={2}>
                        <Button
                          size="sm"
                          colorPalette="blue"
                          variant="outline"
                          onClick={() => setWorkoutBuilderOpen(true)}
                        >
                          <Dumbbell size={14} />
                          <Text ml={1}>{hasWorkoutProgram ? "Edit Workout Structure" : "Configure Workout"}</Text>
                        </Button>
                        {hasWorkoutProgram && (
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {title || "Workout"} - {workoutProgramWeeks > 0 ? workoutProgramWeeks : totalWeeks} weeks
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>
                  {/* Status field - only show for non-recurring tasks */}
                  {recurrenceType === "none" && (
                    <Box w="full">
                      <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                        Status
                      </Text>
                      <SelectDropdown
                        collection={statusCollection}
                        value={[status || "todo"]}
                        onValueChange={({ value }) => setStatus(value[0])}
                        placeholder="Select status"
                        inModal={true}
                      />
                    </Box>
                  )}
                  {/* Note Content Editor - Always visible for adding/editing note content */}
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Note Content
                    </Text>
                    <Box
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                      overflow="hidden"
                      h="400px"
                      bg={bgColor}
                    >
                      <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Start writing your note..."
                        showToolbar={true}
                      />
                    </Box>
                  </Box>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Recurrence
                    </Text>
                    <SelectDropdown
                      collection={recurrenceCollection}
                      value={[recurrenceType]}
                      onValueChange={({ value }) => setRecurrenceType(value[0])}
                      placeholder="Select recurrence"
                      inModal={true}
                    />
                  </Box>
                  {recurrenceType === "weekly" && (
                    <WeekdaySelector selectedDays={selectedDays} onChange={setSelectedDays} size="sm" />
                  )}
                  {recurrenceType === "monthly" && (
                    <VStack spacing={3} w="full" align="stretch">
                      <SelectDropdown
                        collection={monthlyModeCollection}
                        value={[monthlyMode]}
                        onValueChange={({ value }) => setMonthlyMode(value[0])}
                        placeholder="Select pattern type"
                        inModal={true}
                      />
                      {monthlyMode === "dayOfMonth" && (
                        <Box>
                          <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={2}>
                            Select day(s) of month
                          </Text>
                          <SimpleGrid columns={7} spacing={1}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <Button
                                key={day}
                                size="sm"
                                h={8}
                                fontSize="xs"
                                onClick={() =>
                                  setSelectedDayOfMonth(prev =>
                                    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                                  )
                                }
                                colorPalette={selectedDayOfMonth.includes(day) ? "blue" : "gray"}
                                variant={selectedDayOfMonth.includes(day) ? "solid" : "outline"}
                              >
                                {day}
                              </Button>
                            ))}
                          </SimpleGrid>
                        </Box>
                      )}
                      {monthlyMode === "weekPattern" && (
                        <HStack spacing={2}>
                          <SelectDropdown
                            collection={ordinalCollection}
                            value={[monthlyOrdinal.toString()]}
                            onValueChange={({ value }) => setMonthlyOrdinal(Number(value[0]))}
                            placeholder="Select"
                            w="120px"
                            inModal={true}
                          />
                          <SelectDropdown
                            collection={dayOfWeekCollection}
                            value={[monthlyDayOfWeek.toString()]}
                            onValueChange={({ value }) => setMonthlyDayOfWeek(Number(value[0]))}
                            placeholder="Select day"
                            flex={1}
                            inModal={true}
                          />
                        </HStack>
                      )}
                      <HStack>
                        <Text fontSize={{ base: "xs", md: "sm" }}>Every</Text>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={monthlyInterval}
                          onChange={e => setMonthlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          w="60px"
                          size="sm"
                        />
                        <Text fontSize={{ base: "xs", md: "sm" }}>month(s)</Text>
                      </HStack>
                    </VStack>
                  )}
                  {recurrenceType === "yearly" && (
                    <VStack spacing={3} w="full" align="stretch">
                      <SelectDropdown
                        collection={yearlyModeCollection}
                        value={[yearlyMode]}
                        onValueChange={({ value }) => setYearlyMode(value[0])}
                        placeholder="Select pattern type"
                        inModal={true}
                      />
                      <HStack spacing={2}>
                        <SelectDropdown
                          collection={monthCollection}
                          value={[yearlyMonth.toString()]}
                          onValueChange={({ value }) => setYearlyMonth(Number(value[0]))}
                          placeholder="Select month"
                          flex={1}
                          inModal={true}
                        />
                        {yearlyMode === "dayOfMonth" && (
                          <SelectDropdown
                            collection={dayOfMonthSelectCollection}
                            value={[yearlyDayOfMonth.toString()]}
                            onValueChange={({ value }) => setYearlyDayOfMonth(Number(value[0]))}
                            placeholder="Day"
                            w="80px"
                            inModal={true}
                          />
                        )}
                      </HStack>
                      {yearlyMode === "weekPattern" && (
                        <HStack spacing={2}>
                          <SelectDropdown
                            collection={ordinalCollection}
                            value={[yearlyOrdinal.toString()]}
                            onValueChange={({ value }) => setYearlyOrdinal(Number(value[0]))}
                            placeholder="Select"
                            w="120px"
                            inModal={true}
                          />
                          <SelectDropdown
                            collection={dayOfWeekCollection}
                            value={[yearlyDayOfWeek.toString()]}
                            onValueChange={({ value }) => setYearlyDayOfWeek(Number(value[0]))}
                            placeholder="Select day"
                            flex={1}
                            inModal={true}
                          />
                        </HStack>
                      )}
                      <HStack>
                        <Text fontSize={{ base: "xs", md: "sm" }}>Every</Text>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={yearlyInterval}
                          onChange={e => setYearlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          w="60px"
                          size="sm"
                        />
                        <Text fontSize={{ base: "xs", md: "sm" }}>year(s)</Text>
                      </HStack>
                    </VStack>
                  )}
                  {/* End Date - only show for recurring tasks */}
                  {recurrenceType !== "none" && (
                    <Box w="full">
                      <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                        End Date (Optional)
                      </Text>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        placeholder="No end date"
                        min={date || undefined}
                        borderColor={borderColor}
                        _focus={{
                          borderColor: "blue.400",
                          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && title.trim()) {
                            e.preventDefault();
                            handleSave();
                          }
                        }}
                      />
                      {endDate && (
                        <Button size="xs" variant="ghost" mt={1} onClick={() => setEndDate("")}>
                          Clear end date
                        </Button>
                      )}
                    </Box>
                  )}
                  {/* Tags */}
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Tags
                    </Text>
                    <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" p={3} minH="48px">
                      <HStack spacing={2} flexWrap="wrap" align="center">
                        {/* Tags */}
                        {Array.isArray(tags) &&
                          tags
                            .filter(t => selectedTagIds.includes(t.id))
                            .map(tag => <TagChip key={tag.id} tag={tag} size="sm" />)}
                        {/* Add Tag button */}
                        <TagSelector
                          tags={tags}
                          selectedTagIds={selectedTagIds}
                          onTagsChange={setSelectedTagIds}
                          onCreateTag={onCreateTag}
                          onDeleteTag={onDeleteTag}
                          inline
                        />
                      </HStack>
                    </Box>
                  </Box>
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Subtasks
                    </Text>
                    <Tabs.Root
                      value={subtaskTabIndex.toString()}
                      onValueChange={({ value }) => setSubtaskTabIndex(parseInt(value))}
                      variant="line"
                      size="sm"
                    >
                      <Tabs.List>
                        <Tabs.Trigger value="0">Manage ({subtasks.length})</Tabs.Trigger>
                        <Tabs.Trigger value="1">Add Existing</Tabs.Trigger>
                      </Tabs.List>
                      <Tabs.Content value="0" px={0} py={3}>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onDragCancel={handleDragCancel}
                        >
                          <SortableContext
                            items={subtasks.map(st => `subtask-${st.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <VStack align="stretch" spacing={2}>
                              {subtasks.map(st => (
                                <TaskItem
                                  key={st.id}
                                  task={st}
                                  variant="subtask"
                                  containerId="task-dialog-subtasks"
                                  draggableId={`subtask-${st.id}`}
                                  onEdit={() => {
                                    setEditingSubtask(st);
                                    setSubtaskTitle(st.title);
                                    setSubtaskTime(st.time || "");
                                    setSubtaskDuration(st.duration || 30);
                                  }}
                                  onDelete={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}
                                />
                              ))}
                            </VStack>
                          </SortableContext>
                          <DragOverlay>
                            {activeSubtask ? (
                              <TaskItem
                                task={activeSubtask}
                                variant="subtask"
                                containerId="task-dialog-subtasks"
                                draggableId={`subtask-${activeSubtask.id}`}
                              />
                            ) : null}
                          </DragOverlay>
                        </DndContext>
                        <Box borderTopWidth="1px" borderColor={borderColor} my={2} />
                        <HStack spacing={2}>
                          <Input
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            placeholder="Create new subtask"
                            size="sm"
                            onKeyDown={e => {
                              if (e.key === "Enter" && newSubtask.trim()) {
                                e.preventDefault();
                                e.stopPropagation();
                                setSubtasks([
                                  ...subtasks,
                                  {
                                    id: Date.now().toString(),
                                    title: newSubtask.trim(),
                                    completed: false,
                                    time: null,
                                    duration: 30,
                                    order: subtasks.length,
                                  },
                                ]);
                                setNewSubtask("");
                              }
                            }}
                          />
                          <IconButton
                            onClick={() => {
                              if (newSubtask.trim()) {
                                setSubtasks([
                                  ...subtasks,
                                  {
                                    id: Date.now().toString(),
                                    title: newSubtask.trim(),
                                    completed: false,
                                    time: null,
                                    duration: 30,
                                    order: subtasks.length,
                                  },
                                ]);
                                setNewSubtask("");
                              }
                            }}
                            size="sm"
                            variant="outline"
                            aria-label="Add subtask"
                          >
                            <Box as="span" color="currentColor">
                              <Plus size={14} stroke="currentColor" />
                            </Box>
                          </IconButton>
                        </HStack>
                      </Tabs.Content>

                      {/* Add Existing Task Tab */}
                      <Tabs.Content value="1" px={0} py={3}>
                        <VStack align="stretch" spacing={3}>
                          <HStack spacing={2}>
                            <Box as="span" color="gray.500">
                              <Search size={14} />
                            </Box>
                            <Input
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              placeholder="Search for tasks to add as subtasks..."
                              size="sm"
                            />
                          </HStack>
                          {searchQuery.trim() && (
                            <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto">
                              {filteredTasks.length > 0 ? (
                                filteredTasks.map(t => (
                                  <Box
                                    key={t.id}
                                    cursor="pointer"
                                    _hover={{ opacity: 0.8 }}
                                    onClick={() => addExistingTaskAsSubtask(t)}
                                    position="relative"
                                  >
                                    <TaskItem
                                      task={t}
                                      variant="subtask"
                                      containerId="task-dialog-search"
                                      draggableId={`dialog-search-${t.id}`}
                                    />
                                    <Box
                                      position="absolute"
                                      right={2}
                                      top="50%"
                                      transform="translateY(-50%)"
                                      bg={searchResultBg}
                                      borderRadius="md"
                                      p={1}
                                    >
                                      <IconButton
                                        size="xs"
                                        variant="ghost"
                                        aria-label="Add as subtask"
                                        onClick={e => {
                                          e.stopPropagation();
                                          addExistingTaskAsSubtask(t);
                                        }}
                                      >
                                        <Box as="span" color="currentColor">
                                          <Plus size={14} stroke="currentColor" />
                                        </Box>
                                      </IconButton>
                                    </Box>
                                  </Box>
                                ))
                              ) : (
                                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                                  No tasks found
                                </Text>
                              )}
                            </VStack>
                          )}
                          {!searchQuery.trim() && (
                            <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                              Type to search for existing tasks
                            </Text>
                          )}
                        </VStack>
                      </Tabs.Content>
                    </Tabs.Root>
                  </Box>
                  {/* Subtask Edit Modal */}
                  <Dialog.Root
                    open={editingSubtask !== null}
                    onOpenChange={({ open }) => !open && setEditingSubtask(null)}
                    size="sm"
                  >
                    <Dialog.Backdrop bg="blackAlpha.600" />
                    <Dialog.Positioner>
                      <Dialog.Content bg={bgColor}>
                        <Dialog.Header>Edit Subtask</Dialog.Header>
                        <Dialog.CloseTrigger />
                        <Dialog.Body>
                          <VStack spacing={4} py={4}>
                            <Box w="full">
                              <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                                Title
                              </Text>
                              <Input
                                value={subtaskTitle}
                                onChange={e => setSubtaskTitle(e.target.value)}
                                placeholder="Subtask title"
                              />
                            </Box>
                            <SimpleGrid columns={2} spacing={4} w="full">
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                                  Time
                                </Text>
                                <Input
                                  type="time"
                                  value={subtaskTime}
                                  onChange={e => setSubtaskTime(e.target.value)}
                                  placeholder="Optional"
                                />
                              </Box>
                              <Box>
                                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                                  Duration
                                </Text>
                                <SelectDropdown
                                  collection={durationCollection}
                                  value={[subtaskDuration.toString()]}
                                  onValueChange={({ value }) => setSubtaskDuration(parseInt(value[0]))}
                                  placeholder="Select duration"
                                  inModal={true}
                                />
                              </Box>
                            </SimpleGrid>
                          </VStack>
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Button variant="outline" mr={3} onClick={() => setEditingSubtask(null)}>
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (subtaskTitle.trim() && editingSubtask) {
                                setSubtasks(
                                  subtasks.map(st =>
                                    st.id === editingSubtask.id
                                      ? {
                                          ...st,
                                          title: subtaskTitle.trim(),
                                          time: subtaskTime || null,
                                          duration: subtaskDuration,
                                        }
                                      : st
                                  )
                                );
                                setEditingSubtask(null);
                                setSubtaskTitle("");
                                setSubtaskTime("");
                                setSubtaskDuration(30);
                              }
                            }}
                            isDisabled={!subtaskTitle.trim()}
                          >
                            Save
                          </Button>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Positioner>
                  </Dialog.Root>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} isDisabled={!title.trim()}>
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Workout Builder Modal */}
      {workoutBuilderOpen && task?.id && (
        <WorkoutBuilder
          isOpen={workoutBuilderOpen}
          onClose={() => setWorkoutBuilderOpen(false)}
          taskId={task.id}
          onSaveComplete={() => {
            // Redux query will automatically refetch and update workoutProgram
            setWorkoutBuilderOpen(false);
          }}
        />
      )}
    </>
  );
}

// Wrapper component that uses key prop to reset form state
export const TaskDialog = ({ isOpen, task, ...props }) => {
  if (!isOpen) return null;

  // Use key to reset form state when task changes or dialog opens with new task
  const key = task?.id || `new-${isOpen}`;

  return <TaskDialogForm key={key} task={task} {...props} />;
};

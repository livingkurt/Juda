"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Dialog,
  Select,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  IconButton,
  Tag,
  Tabs,
  createListCollection,
} from "@chakra-ui/react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS, ORDINAL_OPTIONS, MONTH_OPTIONS } from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";
import { TagSelector } from "./TagSelector";
import { TaskItem } from "./TaskItem";
import { RichTextEditor } from "./RichTextEditor";

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
  const bgColor = { _light: "white", _dark: "gray.800" };
  const searchResultBg = { _light: "gray.100", _dark: "gray.600" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };

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
    return taskSubtasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((st, idx) => ({ ...st, order: idx }));
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
        items: [
          { label: "Checkbox", value: "checkbox" },
          { label: "Text Input", value: "text" },
          { label: "Note", value: "note" },
        ],
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
                  <Select.Root
                    collection={sectionCollection}
                    value={[sectionId]}
                    onValueChange={({ value }) => setSectionId(value[0])}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select section" />
                    </Select.Trigger>
                    <Select.Content>
                      {sectionCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
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
                  <Select.Root
                    collection={durationCollection}
                    value={[duration.toString()]}
                    onValueChange={({ value }) => setDuration(parseInt(value[0]))}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select duration" />
                    </Select.Trigger>
                    <Select.Content>
                      {durationCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>
                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Completion Type
                  </Text>
                  <Select.Root
                    collection={completionTypeCollection}
                    value={[completionType]}
                    onValueChange={({ value }) => setCompletionType(value[0])}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select completion type" />
                    </Select.Trigger>
                    <Select.Content>
                      {completionTypeCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  {completionType === "note" && (
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Notes appear in the Notes tab, not in Backlog/Today/Calendar
                    </Text>
                  )}
                </Box>
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
                  <Select.Root
                    collection={recurrenceCollection}
                    value={[recurrenceType]}
                    onValueChange={({ value }) => setRecurrenceType(value[0])}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select recurrence" />
                    </Select.Trigger>
                    <Select.Content>
                      {recurrenceCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>
                {recurrenceType === "weekly" && (
                  <HStack spacing={1} w="full">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        w={9}
                        h={9}
                        borderRadius="full"
                        fontSize={{ base: "xs", md: "sm" }}
                        fontWeight="medium"
                        onClick={() =>
                          setSelectedDays(prev =>
                            prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value]
                          )
                        }
                        colorPalette={selectedDays.includes(day.value) ? "blue" : "gray"}
                        variant={selectedDays.includes(day.value) ? "solid" : "outline"}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </HStack>
                )}
                {recurrenceType === "monthly" && (
                  <VStack spacing={3} w="full" align="stretch">
                    <Select.Root
                      collection={monthlyModeCollection}
                      value={[monthlyMode]}
                      onValueChange={({ value }) => setMonthlyMode(value[0])}
                    >
                      <Select.Trigger>
                        <Select.ValueText placeholder="Select pattern type" />
                      </Select.Trigger>
                      <Select.Content>
                        {monthlyModeCollection.items.map(item => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
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
                        <Select.Root
                          collection={ordinalCollection}
                          value={[monthlyOrdinal.toString()]}
                          onValueChange={({ value }) => setMonthlyOrdinal(Number(value[0]))}
                        >
                          <Select.Trigger w="120px">
                            <Select.ValueText placeholder="Select" />
                          </Select.Trigger>
                          <Select.Content>
                            {ordinalCollection.items.map(item => (
                              <Select.Item key={item.value} item={item}>
                                {item.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                        <Select.Root
                          collection={dayOfWeekCollection}
                          value={[monthlyDayOfWeek.toString()]}
                          onValueChange={({ value }) => setMonthlyDayOfWeek(Number(value[0]))}
                        >
                          <Select.Trigger flex={1}>
                            <Select.ValueText placeholder="Select day" />
                          </Select.Trigger>
                          <Select.Content>
                            {dayOfWeekCollection.items.map(item => (
                              <Select.Item key={item.value} item={item}>
                                {item.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
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
                    <Select.Root
                      collection={yearlyModeCollection}
                      value={[yearlyMode]}
                      onValueChange={({ value }) => setYearlyMode(value[0])}
                    >
                      <Select.Trigger>
                        <Select.ValueText placeholder="Select pattern type" />
                      </Select.Trigger>
                      <Select.Content>
                        {yearlyModeCollection.items.map(item => (
                          <Select.Item key={item.value} item={item}>
                            {item.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    <HStack spacing={2}>
                      <Select.Root
                        collection={monthCollection}
                        value={[yearlyMonth.toString()]}
                        onValueChange={({ value }) => setYearlyMonth(Number(value[0]))}
                      >
                        <Select.Trigger flex={1}>
                          <Select.ValueText placeholder="Select month" />
                        </Select.Trigger>
                        <Select.Content>
                          {monthCollection.items.map(item => (
                            <Select.Item key={item.value} item={item}>
                              {item.label}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                      {yearlyMode === "dayOfMonth" && (
                        <Select.Root
                          collection={dayOfMonthSelectCollection}
                          value={[yearlyDayOfMonth.toString()]}
                          onValueChange={({ value }) => setYearlyDayOfMonth(Number(value[0]))}
                        >
                          <Select.Trigger w="80px">
                            <Select.ValueText placeholder="Day" />
                          </Select.Trigger>
                          <Select.Content>
                            {dayOfMonthSelectCollection.items.map(item => (
                              <Select.Item key={item.value} item={item}>
                                {item.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                      )}
                    </HStack>
                    {yearlyMode === "weekPattern" && (
                      <HStack spacing={2}>
                        <Select.Root
                          collection={ordinalCollection}
                          value={[yearlyOrdinal.toString()]}
                          onValueChange={({ value }) => setYearlyOrdinal(Number(value[0]))}
                        >
                          <Select.Trigger w="120px">
                            <Select.ValueText placeholder="Select" />
                          </Select.Trigger>
                          <Select.Content>
                            {ordinalCollection.items.map(item => (
                              <Select.Item key={item.value} item={item}>
                                {item.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
                        <Select.Root
                          collection={dayOfWeekCollection}
                          value={[yearlyDayOfWeek.toString()]}
                          onValueChange={({ value }) => setYearlyDayOfWeek(Number(value[0]))}
                        >
                          <Select.Trigger flex={1}>
                            <Select.ValueText placeholder="Select day" />
                          </Select.Trigger>
                          <Select.Content>
                            {dayOfWeekCollection.items.map(item => (
                              <Select.Item key={item.value} item={item}>
                                {item.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
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
                          .map(tag => (
                            <Tag.Root
                              key={tag.id}
                              size="sm"
                              borderRadius="full"
                              variant="solid"
                              bg={tag.color}
                              color="white"
                              fontSize="xs"
                            >
                              <Tag.Label>{tag.name}</Tag.Label>
                            </Tag.Root>
                          ))}
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
                      <Box borderTopWidth="1px" borderColor={{ _light: "gray.200", _dark: "gray.600" }} my={2} />
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
                              <Select.Root
                                collection={durationCollection}
                                value={[subtaskDuration.toString()]}
                                onValueChange={({ value }) => setSubtaskDuration(parseInt(value[0]))}
                              >
                                <Select.Trigger>
                                  <Select.ValueText placeholder="Select duration" />
                                </Select.Trigger>
                                <Select.Content>
                                  {durationCollection.items.map(item => (
                                    <Select.Item key={item.value} item={item}>
                                      {item.label}
                                    </Select.Item>
                                  ))}
                                </Select.Content>
                              </Select.Root>
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
  );
}

// Wrapper component that uses key prop to reset form state
export const TaskDialog = ({ isOpen, task, ...props }) => {
  if (!isOpen) return null;

  // Use key to reset form state when task changes or dialog opens with new task
  const key = task?.id || `new-${isOpen}`;

  return <TaskDialogForm key={key} task={task} {...props} />;
};

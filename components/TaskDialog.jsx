"use client";

import { useState, useMemo } from "react";
import { Box, Button, TextInput, Modal, Stack, Group, SimpleGrid, Text, ActionIcon, Tabs } from "@mantine/core";
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
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
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
  const [updateTaskMutation] = useUpdateTaskMutation();

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

  // Create options for selects
  const sectionOptions = useMemo(() => sections.map(s => ({ label: s.name, value: s.id })), [sections]);

  const durationOptions = useMemo(() => DURATION_OPTIONS.map(d => ({ label: d.label, value: d.value.toString() })), []);

  const completionTypeOptions = useMemo(() => COMPLETION_TYPES, []);

  const recurrenceOptions = useMemo(
    () => [
      { label: "None (One-time task)", value: "none" },
      { label: "Every day", value: "daily" },
      { label: "Specific days", value: "weekly" },
      { label: "Monthly", value: "monthly" },
      { label: "Yearly", value: "yearly" },
    ],
    []
  );

  const monthlyModeOptions = useMemo(
    () => [
      { label: "On specific day(s) of month", value: "dayOfMonth" },
      { label: "On a specific weekday pattern", value: "weekPattern" },
    ],
    []
  );

  const yearlyModeOptions = useMemo(
    () => [
      { label: "On specific date", value: "dayOfMonth" },
      { label: "On a specific weekday pattern", value: "weekPattern" },
    ],
    []
  );

  const ordinalOptions = useMemo(
    () => ORDINAL_OPTIONS.map(opt => ({ label: opt.label, value: opt.value.toString() })),
    []
  );

  const monthOptions = useMemo(() => MONTH_OPTIONS.map(opt => ({ label: opt.label, value: opt.value.toString() })), []);

  const dayOfWeekOptions = useMemo(
    () => DAYS_OF_WEEK.map(day => ({ label: day.label, value: day.value.toString() })),
    []
  );

  const dayOfMonthSelectOptions = useMemo(
    () => Array.from({ length: 31 }, (_, i) => ({ label: (i + 1).toString(), value: (i + 1).toString() })),
    []
  );

  const statusOptions = useMemo(
    () => [
      { label: "Todo", value: "todo" },
      { label: "In Progress", value: "in_progress" },
      { label: "Complete", value: "complete" },
    ],
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

  // Handle removing subtask from parent
  const handleRemoveSubtaskFromParent = async subtask => {
    // Check if this is an existing task (has isExisting flag or was loaded from task.subtasks)
    // New subtasks created in dialog have timestamp IDs (all digits, >= 13 digits)
    const isNewSubtask = /^\d{13,}$/.test(subtask.id);
    const isExistingTask = subtask.isExisting === true || !isNewSubtask;

    if (isExistingTask) {
      // For existing tasks, call API to remove parent relationship
      try {
        await updateTaskMutation({ id: subtask.id, parentId: null }).unwrap();
      } catch (error) {
        console.error("Failed to remove subtask from parent:", error);
        // Don't remove from local state if API call failed
        return;
      }
    }

    // Remove from local state (for both new and existing tasks)
    setSubtasks(subtasks.filter(s => s.id !== subtask.id));
  };

  return (
    <>
      <Modal
        opened={true}
        onClose={onClose}
        size="md"
        title={task ? "Edit Task" : "New Task"}
        styles={{ body: { maxHeight: "90vh", overflowY: "auto", background: bgColor } }}
      >
        <form onSubmit={handleFormSubmit}>
          <Stack gap={16} style={{ paddingTop: 16, paddingBottom: 16 }}>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Task Name
              </Text>
              <TextInput
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                styles={{
                  input: {
                    borderColor: borderColor,
                    "&:focus": {
                      borderColor: mode.border.focus,
                      boxShadow: `0 0 0 1px ${mode.border.focus}`,
                    },
                  },
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && title.trim()) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </Box>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Section
              </Text>
              <SelectDropdown
                data={sectionOptions}
                value={sectionId || null}
                onChange={setSectionId}
                placeholder="Select section"
                inModal={true}
              />
            </Box>
            <SimpleGrid cols={2} spacing={16} style={{ width: "100%" }}>
              <Box>
                <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                  Date
                </Text>
                <TextInput
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  placeholder="Optional"
                  styles={{
                    input: {
                      borderColor: borderColor,
                      fontSize: "var(--mantine-font-size-md)",
                      "&:focus": {
                        borderColor: "var(--mantine-color-blue-4)",
                        boxShadow: "0 0 0 1px var(--mantine-color-blue-4)",
                      },
                    },
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && title.trim()) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
                {date && (
                  <Button size="xs" variant="subtle" style={{ marginTop: 4 }} onClick={() => setDate("")}>
                    Clear date
                  </Button>
                )}
              </Box>
              <Box>
                <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                  Time
                </Text>
                <TextInput
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="Optional"
                  styles={{
                    input: {
                      borderColor: borderColor,
                      fontSize: "var(--mantine-font-size-md)",
                      "&:focus": {
                        borderColor: "var(--mantine-color-blue-4)",
                        boxShadow: "0 0 0 1px var(--mantine-color-blue-4)",
                      },
                    },
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && title.trim()) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
                {time && (
                  <Button size="xs" variant="subtle" style={{ marginTop: 4 }} onClick={() => setTime("")}>
                    Clear time
                  </Button>
                )}
              </Box>
            </SimpleGrid>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Duration
              </Text>
              <SelectDropdown
                data={durationOptions}
                value={duration.toString()}
                onChange={val => setDuration(parseInt(val))}
                placeholder="Select duration"
                inModal={true}
              />
            </Box>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Completion Type
              </Text>
              <SelectDropdown
                data={completionTypeOptions}
                value={completionType}
                onChange={setCompletionType}
                placeholder="Select completion type"
                inModal={true}
              />
              {completionType === "note" && (
                <Text size="xs" c="gray.6" style={{ marginTop: 4 }}>
                  Notes appear in the Notes tab, not in Backlog/Today/Calendar
                </Text>
              )}
              {completionType === "workout" && (
                <Box style={{ marginTop: 8 }}>
                  <Button
                    size="sm"
                    color="blue"
                    variant="outline"
                    onClick={() => setWorkoutBuilderOpen(true)}
                    leftSection={<Dumbbell size={14} />}
                  >
                    {hasWorkoutProgram ? "Edit Workout Structure" : "Configure Workout"}
                  </Button>
                  {hasWorkoutProgram && (
                    <Text size="xs" c="gray.6" style={{ marginTop: 4 }}>
                      {title || "Workout"} - {workoutProgramWeeks > 0 ? workoutProgramWeeks : totalWeeks} weeks
                    </Text>
                  )}
                </Box>
              )}
            </Box>
            {/* Status field - only show for non-recurring tasks */}
            {recurrenceType === "none" && (
              <Box style={{ width: "100%" }}>
                <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                  Status
                </Text>
                <SelectDropdown
                  data={statusOptions}
                  value={status || "todo"}
                  onChange={setStatus}
                  placeholder="Select status"
                  inModal={true}
                />
              </Box>
            )}
            {/* Note Content Editor - Always visible for adding/editing note content */}
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Note Content
              </Text>
              <Box
                style={{
                  borderWidth: "1px",
                  borderColor: borderColor,
                  borderStyle: "solid",
                  borderRadius: "var(--mantine-radius-md)",
                  overflow: "hidden",
                  height: "400px",
                  background: bgColor,
                }}
              >
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your note..."
                  showToolbar={true}
                />
              </Box>
            </Box>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Recurrence
              </Text>
              <SelectDropdown
                data={recurrenceOptions}
                value={recurrenceType}
                onChange={setRecurrenceType}
                placeholder="Select recurrence"
                inModal={true}
              />
            </Box>
            {recurrenceType === "weekly" && (
              <WeekdaySelector selectedDays={selectedDays} onChange={setSelectedDays} size="sm" />
            )}
            {recurrenceType === "monthly" && (
              <Stack gap={12} style={{ width: "100%" }} align="stretch">
                <SelectDropdown
                  data={monthlyModeOptions}
                  value={monthlyMode}
                  onChange={setMonthlyMode}
                  placeholder="Select pattern type"
                  inModal={true}
                />
                {monthlyMode === "dayOfMonth" && (
                  <Box>
                    <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 8 }}>
                      Select day(s) of month
                    </Text>
                    <SimpleGrid cols={7} spacing={4}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <Button
                          key={day}
                          size="sm"
                          style={{ height: 32, fontSize: "var(--mantine-font-size-xs)" }}
                          onClick={() =>
                            setSelectedDayOfMonth(prev =>
                              prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                            )
                          }
                          color={selectedDayOfMonth.includes(day) ? "blue" : "gray"}
                          variant={selectedDayOfMonth.includes(day) ? "filled" : "outline"}
                        >
                          {day}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </Box>
                )}
                {monthlyMode === "weekPattern" && (
                  <Group gap={8}>
                    <SelectDropdown
                      data={ordinalOptions}
                      value={monthlyOrdinal.toString()}
                      onChange={val => setMonthlyOrdinal(Number(val))}
                      placeholder="Select"
                      width="120px"
                      inModal={true}
                    />
                    <SelectDropdown
                      data={dayOfWeekOptions}
                      value={monthlyDayOfWeek.toString()}
                      onChange={val => setMonthlyDayOfWeek(Number(val))}
                      placeholder="Select day"
                      style={{ flex: 1 }}
                      inModal={true}
                    />
                  </Group>
                )}
                <Group gap={8}>
                  <Text size={["xs", "sm"]}>Every</Text>
                  <TextInput
                    type="number"
                    min={1}
                    max={12}
                    value={monthlyInterval}
                    onChange={e => setMonthlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: "60px" }}
                    size="sm"
                  />
                  <Text size={["xs", "sm"]}>month(s)</Text>
                </Group>
              </Stack>
            )}
            {recurrenceType === "yearly" && (
              <Stack gap={12} style={{ width: "100%" }} align="stretch">
                <SelectDropdown
                  data={yearlyModeOptions}
                  value={yearlyMode}
                  onChange={setYearlyMode}
                  placeholder="Select pattern type"
                  inModal={true}
                />
                <Group gap={8}>
                  <SelectDropdown
                    data={monthOptions}
                    value={yearlyMonth.toString()}
                    onChange={val => setYearlyMonth(Number(val))}
                    placeholder="Select month"
                    style={{ flex: 1 }}
                    inModal={true}
                  />
                  {yearlyMode === "dayOfMonth" && (
                    <SelectDropdown
                      data={dayOfMonthSelectOptions}
                      value={yearlyDayOfMonth.toString()}
                      onChange={val => setYearlyDayOfMonth(Number(val))}
                      placeholder="Day"
                      width="80px"
                      inModal={true}
                    />
                  )}
                </Group>
                {yearlyMode === "weekPattern" && (
                  <Group gap={8}>
                    <SelectDropdown
                      data={ordinalOptions}
                      value={yearlyOrdinal.toString()}
                      onChange={val => setYearlyOrdinal(Number(val))}
                      placeholder="Select"
                      width="120px"
                      inModal={true}
                    />
                    <SelectDropdown
                      data={dayOfWeekOptions}
                      value={yearlyDayOfWeek.toString()}
                      onChange={val => setYearlyDayOfWeek(Number(val))}
                      placeholder="Select day"
                      style={{ flex: 1 }}
                      inModal={true}
                    />
                  </Group>
                )}
                <Group gap={8}>
                  <Text size={["xs", "sm"]}>Every</Text>
                  <TextInput
                    type="number"
                    min={1}
                    max={10}
                    value={yearlyInterval}
                    onChange={e => setYearlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ width: "60px" }}
                    size="sm"
                  />
                  <Text size={["xs", "sm"]}>year(s)</Text>
                </Group>
              </Stack>
            )}
            {/* End Date - only show for recurring tasks */}
            {recurrenceType !== "none" && (
              <Box style={{ width: "100%" }}>
                <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                  End Date (Optional)
                </Text>
                <TextInput
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  placeholder="No end date"
                  min={date || undefined}
                  styles={{
                    input: {
                      borderColor: borderColor,
                      "&:focus": {
                        borderColor: "var(--mantine-color-blue-4)",
                        boxShadow: "0 0 0 1px var(--mantine-color-blue-4)",
                      },
                    },
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && title.trim()) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
                {endDate && (
                  <Button size="xs" variant="subtle" style={{ marginTop: 4 }} onClick={() => setEndDate("")}>
                    Clear end date
                  </Button>
                )}
              </Box>
            )}
            {/* Tags */}
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Tags
              </Text>
              <Box
                style={{
                  borderWidth: "1px",
                  borderColor: borderColor,
                  borderStyle: "solid",
                  borderRadius: "var(--mantine-radius-md)",
                  padding: 12,
                  minHeight: "48px",
                }}
              >
                <Group gap={8} wrap="wrap" align="center">
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
                </Group>
              </Box>
            </Box>
            <Box style={{ width: "100%" }}>
              <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                Subtasks
              </Text>
              <Tabs
                value={subtaskTabIndex.toString()}
                onChange={value => setSubtaskTabIndex(parseInt(value || "0"))}
                variant="default"
              >
                <Tabs.List>
                  <Tabs.Tab value="0">Manage ({subtasks.length})</Tabs.Tab>
                  <Tabs.Tab value="1">Add Existing</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="0" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 12, paddingBottom: 12 }}>
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
                      <Stack align="stretch" gap={8}>
                        {subtasks.map(st => (
                          <TaskItem
                            key={st.id}
                            task={{ ...st, parentId: task?.id }}
                            variant="subtask"
                            containerId="task-dialog-subtasks"
                            draggableId={`subtask-${st.id}`}
                            parentTaskId={task?.id}
                            onEdit={() => {
                              setEditingSubtask(st);
                              setSubtaskTitle(st.title);
                              setSubtaskTime(st.time || "");
                              setSubtaskDuration(st.duration || 30);
                            }}
                            onDelete={() => {
                              // Just remove from local state - that's all we need to do
                              // The subtask relationship is managed when the parent task is saved
                              setSubtasks(subtasks.filter(s => s.id !== st.id));
                            }}
                            onRemoveFromParent={() => {
                              // Handle removal properly - call API for existing tasks
                              handleRemoveSubtaskFromParent(st);
                            }}
                          />
                        ))}
                      </Stack>
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
                  <Box
                    style={{
                      borderTopWidth: "1px",
                      borderTopColor: borderColor,
                      borderTopStyle: "solid",
                      marginTop: 8,
                      marginBottom: 8,
                    }}
                  />
                  <Group gap={8}>
                    <TextInput
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      placeholder="Create new subtask"
                      size="sm"
                      style={{ flex: 1 }}
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
                    <ActionIcon
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
                      <Plus size={14} stroke="currentColor" />
                    </ActionIcon>
                  </Group>
                </Tabs.Panel>

                {/* Add Existing Task Tab */}
                <Tabs.Panel value="1" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 12, paddingBottom: 12 }}>
                  <Stack align="stretch" gap={12}>
                    <Group gap={8}>
                      <Search size={14} style={{ color: mode.text.secondary }} />
                      <TextInput
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search for tasks to add as subtasks..."
                        size="sm"
                        style={{ flex: 1 }}
                      />
                    </Group>
                    {searchQuery.trim() && (
                      <Stack align="stretch" gap={8} style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {filteredTasks.length > 0 ? (
                          filteredTasks.map(t => (
                            <Box
                              key={t.id}
                              style={{ cursor: "pointer", position: "relative" }}
                              onMouseEnter={e => {
                                e.currentTarget.style.opacity = "0.8";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.opacity = "1";
                              }}
                              onClick={() => addExistingTaskAsSubtask(t)}
                            >
                              <TaskItem
                                task={t}
                                variant="subtask"
                                containerId="task-dialog-search"
                                draggableId={`dialog-search-${t.id}`}
                              />
                              <Box
                                style={{
                                  position: "absolute",
                                  right: 8,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  background: searchResultBg,
                                  borderRadius: "var(--mantine-radius-md)",
                                  padding: 4,
                                }}
                              >
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  aria-label="Add as subtask"
                                  onClick={e => {
                                    e.stopPropagation();
                                    addExistingTaskAsSubtask(t);
                                  }}
                                >
                                  <Plus size={14} stroke="currentColor" />
                                </ActionIcon>
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Text size="sm" c="gray.6" ta="center" style={{ paddingTop: 16, paddingBottom: 16 }}>
                            No tasks found
                          </Text>
                        )}
                      </Stack>
                    )}
                    {!searchQuery.trim() && (
                      <Text size="sm" c="gray.6" ta="center" style={{ paddingTop: 16, paddingBottom: 16 }}>
                        Type to search for existing tasks
                      </Text>
                    )}
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Box>
            {/* Subtask Edit Modal */}
            <Modal
              opened={editingSubtask !== null}
              onClose={() => setEditingSubtask(null)}
              size="sm"
              title="Edit Subtask"
              styles={{ body: { background: bgColor } }}
            >
              <Stack gap={16} style={{ paddingTop: 16, paddingBottom: 16 }}>
                <Box style={{ width: "100%" }}>
                  <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                    Title
                  </Text>
                  <TextInput
                    value={subtaskTitle}
                    onChange={e => setSubtaskTitle(e.target.value)}
                    placeholder="Subtask title"
                  />
                </Box>
                <SimpleGrid cols={2} spacing={16} style={{ width: "100%" }}>
                  <Box>
                    <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                      Time
                    </Text>
                    <TextInput
                      type="time"
                      value={subtaskTime}
                      onChange={e => setSubtaskTime(e.target.value)}
                      placeholder="Optional"
                    />
                  </Box>
                  <Box>
                    <Text size={["xs", "sm"]} fw={500} style={{ marginBottom: 4 }}>
                      Duration
                    </Text>
                    <SelectDropdown
                      data={durationOptions}
                      value={subtaskDuration.toString()}
                      onChange={val => setSubtaskDuration(parseInt(val))}
                      placeholder="Select duration"
                      inModal={true}
                    />
                  </Box>
                </SimpleGrid>
              </Stack>
              <Group justify="flex-end" style={{ marginTop: 16 }}>
                <Button variant="outline" onClick={() => setEditingSubtask(null)}>
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
                  disabled={!subtaskTitle.trim()}
                >
                  Save
                </Button>
              </Group>
            </Modal>
          </Stack>
        </form>
        <Group justify="flex-end" style={{ marginTop: 16 }}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Save
          </Button>
        </Group>
      </Modal>

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

"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Stack,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Chip,
  InputAdornment,
} from "@mui/material";
import GLGrid from "./GLGrid";
import { Close, Add, Delete, DragIndicator, Search } from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { FitnessCenter, Edit } from "@mui/icons-material";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { DAYS_OF_WEEK, DURATION_OPTIONS, ORDINAL_OPTIONS, MONTH_OPTIONS, COMPLETION_TYPES } from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";
import { TagSelector } from "./TagSelector";
import { TaskItem } from "./TaskItem";
import { RichTextEditor } from "./RichTextEditor";
import { TagChip } from "./TagChip";
// import WorkoutBuilder from "./WorkoutBuilder";
import WeekdaySelector from "./WeekdaySelector";
import { useGetWorkoutProgramQuery } from "@/lib/store/api/workoutProgramsApi";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery, useCreateTagMutation, useDeleteTagMutation } from "@/lib/store/api/tagsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useTaskOperations } from "@/hooks/useTaskOperations";

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
  // const [workoutBuilderOpen, setWorkoutBuilderOpen] = useState(false);
  const { data: workoutProgram } = useGetWorkoutProgramQuery(task?.id, {
    skip: !task?.id,
  });
  // Derive workout program status from Redux query
  const hasWorkoutProgram = Boolean(workoutProgram);
  const workoutProgramWeeks = workoutProgram?.numberOfWeeks || 0;

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

  // Convert date/time strings to dayjs objects for DatePicker/TimePicker
  const dateValue = date ? dayjs(date) : null;
  const timeValue = time ? dayjs(time, "HH:mm") : null;
  const endDateValue = endDate ? dayjs(endDate) : null;
  const subtaskTimeValue = subtaskTime ? dayjs(subtaskTime, "HH:mm") : null;

  return (
    <>
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <DialogTitle>
            {task ? "Edit Task" : "New Task"}
            <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} size="small">
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2, overflow: "auto", flex: 1 }}>
            <GLGrid container spacing={2}>
              {/* Task Name */}
              <GLGrid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Task Name"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter" && title.trim()) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
              </GLGrid>

              {/* Tags */}
              <GLGrid item xs={12}>
                <Box>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Tags
                  </Typography>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "#575c64",
                      borderRadius: 1,
                      p: 1.5,
                      minHeight: 48,
                    }}
                  >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
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
                    </Stack>
                  </Box>
                </Box>
              </GLGrid>

              {/* Section */}
              <GLGrid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select value={sectionId} onChange={e => setSectionId(e.target.value)} label="Section">
                    {sections.map(section => (
                      <MenuItem key={section.id} value={section.id}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GLGrid>

              {/* Date & Time */}
              <GLGrid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={dateValue}
                  onChange={newDate => {
                    const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
                    setDate(dateStr);
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
                {date && (
                  <Button size="small" variant="text" sx={{ mt: 0.5 }} onClick={() => setDate("")}>
                    Clear date
                  </Button>
                )}
              </GLGrid>
              <GLGrid item xs={12} sm={6}>
                <TimePicker
                  label="Time"
                  value={timeValue}
                  onChange={newTime => {
                    const timeStr = newTime ? newTime.format("HH:mm") : "";
                    setTime(timeStr);
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
                {time && (
                  <Button size="small" variant="text" sx={{ mt: 0.5 }} onClick={() => setTime("")}>
                    Clear time
                  </Button>
                )}
              </GLGrid>

              {/* Duration & End Date */}
              <GLGrid item xs={12} sm={recurrenceType !== "none" ? 6 : 12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={duration.toString()}
                    onChange={e => setDuration(parseInt(e.target.value))}
                    label="Duration"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <MenuItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GLGrid>
              {recurrenceType !== "none" && (
                <GLGrid item xs={12} sm={6}>
                  <DatePicker
                    label="End Date (Optional)"
                    value={endDateValue}
                    onChange={newDate => {
                      const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
                      setEndDate(dateStr);
                    }}
                    slotProps={{
                      textField: { size: "small", fullWidth: true },
                    }}
                  />
                  {endDate && (
                    <Button size="small" variant="text" sx={{ mt: 0.5 }} onClick={() => setEndDate("")}>
                      Clear end date
                    </Button>
                  )}
                </GLGrid>
              )}

              {/* Completion Type */}
              <GLGrid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Completion Type</InputLabel>
                  <Select
                    value={completionType}
                    onChange={e => setCompletionType(e.target.value)}
                    label="Completion Type"
                  >
                    {COMPLETION_TYPES.map(ct => (
                      <MenuItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GLGrid>
              {completionType === "note" && (
                <GLGrid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Notes appear in the Notes tab, not in Backlog/Today/Calendar
                  </Typography>
                </GLGrid>
              )}
              {/* {completionType === "workout" && (
                <GLGrid item xs={12}>
                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FitnessCenter fontSize="small" />}
                      onClick={() => setWorkoutBuilderOpen(true)}
                      sx={{ mb: 1 }}
                    >
                      {hasWorkoutProgram ? "Edit Workout Structure" : "Configure Workout"}
                    </Button>
                    {hasWorkoutProgram && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {title || "Workout"} - {workoutProgramWeeks > 0 ? workoutProgramWeeks : totalWeeks} weeks
                      </Typography>
                    )}
                  </Box>
                </GLGrid>
              )} */}

              {/* Status field - only show for non-recurring tasks */}
              {recurrenceType === "none" && (
                <GLGrid item xs={12}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select value={status || "todo"} onChange={e => setStatus(e.target.value)} label="Status">
                      <MenuItem value="todo">Todo</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="complete">Complete</MenuItem>
                    </Select>
                  </FormControl>
                </GLGrid>
              )}

              {/* Note Content Editor */}
              <GLGrid item xs={12}>
                <Box>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Note Content
                  </Typography>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      overflow: "hidden",
                      height: "400px",
                    }}
                  >
                    <RichTextEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Start writing your note..."
                      showToolbar={false}
                    />
                  </Box>
                </Box>
              </GLGrid>

              {/* Recurrence */}
              <GLGrid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Recurrence</InputLabel>
                  <Select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)} label="Recurrence">
                    <MenuItem value="none">None (One-time task)</MenuItem>
                    <MenuItem value="daily">Every day</MenuItem>
                    <MenuItem value="weekly">Specific days</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </GLGrid>

              {/* Weekly recurrence */}
              {recurrenceType === "weekly" && (
                <GLGrid item xs={12}>
                  <WeekdaySelector selectedDays={selectedDays} onChange={setSelectedDays} size="sm" />
                </GLGrid>
              )}

              {/* Monthly recurrence */}
              {recurrenceType === "monthly" && (
                <GLGrid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Pattern Type</InputLabel>
                        <Select value={monthlyMode} onChange={e => setMonthlyMode(e.target.value)} label="Pattern Type">
                          <MenuItem value="dayOfMonth">On specific day(s) of month</MenuItem>
                          <MenuItem value="weekPattern">On a specific weekday pattern</MenuItem>
                        </Select>
                      </FormControl>

                      {monthlyMode === "dayOfMonth" && (
                        <Box>
                          <Typography variant="body2" fontWeight={500} gutterBottom>
                            Select day(s) of month
                          </Typography>
                          <GLGrid container spacing={0.5}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <GLGrid item xs={1.7} key={day}>
                                <Chip
                                  label={day}
                                  onClick={() =>
                                    setSelectedDayOfMonth(prev =>
                                      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                                    )
                                  }
                                  color={selectedDayOfMonth.includes(day) ? "primary" : "default"}
                                  variant={selectedDayOfMonth.includes(day) ? "filled" : "outlined"}
                                  size="small"
                                  sx={{ width: "100%" }}
                                />
                              </GLGrid>
                            ))}
                          </GLGrid>
                        </Box>
                      )}

                      {monthlyMode === "weekPattern" && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControl size="small" sx={{ width: 120 }}>
                            <InputLabel>Ordinal</InputLabel>
                            <Select
                              value={monthlyOrdinal.toString()}
                              onChange={e => setMonthlyOrdinal(Number(e.target.value))}
                              label="Ordinal"
                            >
                              {ORDINAL_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value.toString()}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Day of Week</InputLabel>
                            <Select
                              value={monthlyDayOfWeek.toString()}
                              onChange={e => setMonthlyDayOfWeek(Number(e.target.value))}
                              label="Day of Week"
                            >
                              {DAYS_OF_WEEK.map(day => (
                                <MenuItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                      )}

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">Every</Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={monthlyInterval}
                          onChange={e => setMonthlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          inputProps={{ min: 1, max: 12 }}
                          sx={{ width: 70 }}
                        />
                        <Typography variant="body2">month(s)</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </GLGrid>
              )}

              {/* Yearly recurrence */}
              {recurrenceType === "yearly" && (
                <GLGrid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Pattern Type</InputLabel>
                        <Select value={yearlyMode} onChange={e => setYearlyMode(e.target.value)} label="Pattern Type">
                          <MenuItem value="dayOfMonth">On specific date</MenuItem>
                          <MenuItem value="weekPattern">On a specific weekday pattern</MenuItem>
                        </Select>
                      </FormControl>

                      <Stack direction="row" spacing={1}>
                        <FormControl size="small" sx={{ flex: 1 }}>
                          <InputLabel>Month</InputLabel>
                          <Select
                            value={yearlyMonth.toString()}
                            onChange={e => setYearlyMonth(Number(e.target.value))}
                            label="Month"
                          >
                            {MONTH_OPTIONS.map(opt => (
                              <MenuItem key={opt.value} value={opt.value.toString()}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {yearlyMode === "dayOfMonth" && (
                          <FormControl size="small" sx={{ width: 80 }}>
                            <InputLabel>Day</InputLabel>
                            <Select
                              value={yearlyDayOfMonth.toString()}
                              onChange={e => setYearlyDayOfMonth(Number(e.target.value))}
                              label="Day"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <MenuItem key={day} value={day.toString()}>
                                  {day}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Stack>

                      {yearlyMode === "weekPattern" && (
                        <Stack direction="row" spacing={1}>
                          <FormControl size="small" sx={{ width: 120 }}>
                            <InputLabel>Ordinal</InputLabel>
                            <Select
                              value={yearlyOrdinal.toString()}
                              onChange={e => setYearlyOrdinal(Number(e.target.value))}
                              label="Ordinal"
                            >
                              {ORDINAL_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value.toString()}>
                                  {opt.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl size="small" sx={{ flex: 1 }}>
                            <InputLabel>Day of Week</InputLabel>
                            <Select
                              value={yearlyDayOfWeek.toString()}
                              onChange={e => setYearlyDayOfWeek(Number(e.target.value))}
                              label="Day of Week"
                            >
                              {DAYS_OF_WEEK.map(day => (
                                <MenuItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Stack>
                      )}

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">Every</Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={yearlyInterval}
                          onChange={e => setYearlyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          inputProps={{ min: 1, max: 10 }}
                          sx={{ width: 70 }}
                        />
                        <Typography variant="body2">year(s)</Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </GLGrid>
              )}

              {/* Subtasks */}
              <GLGrid item xs={12}>
                <Box>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    Subtasks ({subtasks.length})
                  </Typography>
                  <Paper variant="outlined" sx={{ mt: 1 }}>
                    <Tabs value={subtaskTabIndex} onChange={(e, newValue) => setSubtaskTabIndex(newValue)}>
                      <Tab label={`Manage (${subtasks.length})`} />
                      <Tab label="Add Existing" />
                    </Tabs>

                    {/* Manage Subtasks Tab */}
                    {subtaskTabIndex === 0 && (
                      <Box sx={{ p: 2 }}>
                        {subtasks.length > 0 ? (
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
                              <List dense sx={{ mb: 2 }}>
                                {subtasks.map((st, index) => (
                                  <ListItem key={st.id} divider={index < subtasks.length - 1} sx={{ py: 1, px: 0 }}>
                                    <DragIndicator sx={{ mr: 1, color: "text.disabled", cursor: "grab" }} />
                                    <ListItemText primary={st.title} secondary={st.time || undefined} />
                                    <ListItemSecondaryAction>
                                      <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => {
                                          setEditingSubtask(st);
                                          setSubtaskTitle(st.title);
                                          setSubtaskTime(st.time || "");
                                          setSubtaskDuration(st.duration || 30);
                                        }}
                                        sx={{ mr: 1 }}
                                      >
                                        <Edit fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => {
                                          setSubtasks(subtasks.filter(s => s.id !== st.id));
                                        }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
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
                        ) : (
                          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                            No subtasks yet
                          </Typography>
                        )}
                        <Divider sx={{ my: 1.5 }} />
                        <Stack direction="row" spacing={1}>
                          <TextField
                            fullWidth
                            size="small"
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            placeholder="Create new subtask"
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
                            size="small"
                            color="primary"
                          >
                            <Add />
                          </IconButton>
                        </Stack>
                      </Box>
                    )}

                    {/* Add Existing Task Tab */}
                    {subtaskTabIndex === 1 && (
                      <Box sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            size="small"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search for tasks to add as subtasks..."
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Search fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          {searchQuery.trim() && (
                            <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                              {filteredTasks.length > 0 ? (
                                <List dense>
                                  {filteredTasks.map(t => (
                                    <ListItem
                                      key={t.id}
                                      button
                                      onClick={() => addExistingTaskAsSubtask(t)}
                                      sx={{ "&:hover": { opacity: 0.8 } }}
                                    >
                                      <TaskItem
                                        task={t}
                                        variant="subtask"
                                        containerId="task-dialog-search"
                                        draggableId={`dialog-search-${t.id}`}
                                      />
                                      <ListItemSecondaryAction>
                                        <IconButton
                                          edge="end"
                                          size="small"
                                          onClick={e => {
                                            e.stopPropagation();
                                            addExistingTaskAsSubtask(t);
                                          }}
                                        >
                                          <Add />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  ))}
                                </List>
                              ) : (
                                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                                  No tasks found
                                </Typography>
                              )}
                            </Box>
                          )}
                          {!searchQuery.trim() && (
                            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                              Type to search for existing tasks
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </GLGrid>
            </GLGrid>
          </DialogContent>

          <DialogActions sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" disabled={!title.trim()}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Subtask Edit Dialog */}
      <Dialog open={editingSubtask !== null} onClose={() => setEditingSubtask(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Subtask</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Title"
              value={subtaskTitle}
              onChange={e => setSubtaskTitle(e.target.value)}
              placeholder="Subtask title"
            />
            <GLGrid container spacing={2}>
              <GLGrid item xs={6}>
                <TimePicker
                  label="Time"
                  value={subtaskTimeValue}
                  onChange={newTime => {
                    const timeStr = newTime ? newTime.format("HH:mm") : "";
                    setSubtaskTime(timeStr);
                  }}
                  slotProps={{
                    textField: { size: "small", fullWidth: true },
                  }}
                />
              </GLGrid>
              <GLGrid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Duration</InputLabel>
                  <Select
                    value={subtaskDuration.toString()}
                    onChange={e => setSubtaskDuration(parseInt(e.target.value))}
                    label="Duration"
                  >
                    {DURATION_OPTIONS.map(d => (
                      <MenuItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GLGrid>
            </GLGrid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingSubtask(null)}>Cancel</Button>
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
            variant="contained"
            disabled={!subtaskTitle.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workout Builder Modal */}
      {/* {workoutBuilderOpen && task?.id && (
        <WorkoutBuilder
          isOpen={workoutBuilderOpen}
          onClose={() => setWorkoutBuilderOpen(false)}
          taskId={task.id}
          onSaveComplete={() => {
            // Redux query will automatically refetch and update workoutProgram
            setWorkoutBuilderOpen(false);
          }}
        />
      )} */}
    </>
  );
}

// Wrapper component that uses key prop to reset form state
export const TaskDialog = () => {
  const dialogState = useDialogState();
  const { data: sections = [] } = useGetSectionsQuery();
  const { data: tags = [] } = useGetTagsQuery();
  const { data: allTasks = [] } = useGetTasksQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [deleteTagMutation] = useDeleteTagMutation();
  const taskOps = useTaskOperations();

  const isOpen = dialogState.taskDialogOpen;
  const task = dialogState.editingTask;

  const handleClose = () => {
    dialogState.closeTaskDialog();
    dialogState.setEditingTask(null);
    dialogState.setDefaultSectionId(null);
    dialogState.setDefaultTime(null);
    dialogState.setDefaultDate(null);
  };

  const handleCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };

  const handleDeleteTag = async id => {
    return await deleteTagMutation(id).unwrap();
  };

  if (!isOpen) return null;

  // Use key to reset form state when task changes or dialog opens with new task
  const key = task?.id || `new-${isOpen}`;

  return (
    <TaskDialogForm
      key={key}
      task={task}
      sections={sections}
      onSave={taskOps.handleSaveTask}
      onClose={handleClose}
      defaultSectionId={dialogState.defaultSectionId}
      defaultTime={dialogState.defaultTime}
      defaultDate={dialogState.defaultDate}
      tags={tags}
      onCreateTag={handleCreateTag}
      onDeleteTag={handleDeleteTag}
      allTasks={allTasks}
    />
  );
};

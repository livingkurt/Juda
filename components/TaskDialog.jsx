"use client";

import { useState, useCallback, useMemo } from "react";
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
  useTheme,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import GLGrid from "./GLGrid";
import { Close, Add, Delete, DragIndicator, Search, Edit } from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  DAYS_OF_WEEK,
  DURATION_OPTIONS,
  ORDINAL_OPTIONS,
  MONTH_OPTIONS,
  COMPLETION_TYPES,
  REFLECTION_TEMPLATES,
  PRIORITY_LEVELS,
} from "@/lib/constants";
import { formatLocalDate } from "@/lib/utils";
import { TagSelector } from "./TagSelector";
import { TaskItem } from "./TaskItem";
import { RichTextEditor } from "./RichTextEditor";
import { TagChip } from "./TagChip";
// import WorkoutBuilder from "./WorkoutBuilder";
import WeekdaySelector from "./WeekdaySelector";
import { useGetWorkoutProgramQuery } from "@/lib/store/api/workoutProgramsApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useGetTagsQuery, useCreateTagMutation, useDeleteTagMutation } from "@/lib/store/api/tagsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useTaskItemShared } from "@/hooks/useTaskItemShared";
import RecurringEditScopeDialog from "./RecurringEditScopeDialog";
import {
  requiresSeriesScopeDecision,
  prepareThisOccurrenceEdit,
  prepareFutureOccurrencesEdit,
} from "@/lib/recurringSeriesUtils";

// Internal component that resets when key changes
function TaskDialogForm({
  task,
  sections,
  onSave,
  onClose,
  defaultSectionId,
  defaultTime,
  defaultDate,
  clickedRecurringDate,
  defaultCompletionType,
  defaultGoalYear,
  tags,
  onCreateTag,
  allTasks,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dialogViewDate = new Date();
  dialogViewDate.setHours(0, 0, 0, 0);

  const taskItemShared = useTaskItemShared({
    allTasks,
    viewDate: dialogViewDate,
    tags,
    onCreateTag,
  });
  // Initialize state from task or defaults
  const [title, setTitle] = useState(task?.title || "");
  // Use null for sectionId if task has null, otherwise use defaultSectionId (don't auto-select first section)
  const [sectionId, setSectionId] = useState(task ? (task.sectionId ?? null) : (defaultSectionId ?? null));
  const [time, setTime] = useState(task?.time || defaultTime || "");
  const [date, setDate] = useState(() => {
    // For recurring tasks being edited from calendar, use the clicked date
    // This is the date the user clicked on, not the series start date
    if (defaultDate) {
      return defaultDate;
    }
    if (clickedRecurringDate) {
      // Handle both Date objects and ISO strings
      const clickedDate =
        typeof clickedRecurringDate === "string" ? new Date(clickedRecurringDate) : clickedRecurringDate;
      return formatLocalDate(clickedDate);
    }
    // For backlog tasks (no date), don't set any date unless explicitly provided
    // Backlog tasks are determined by not having a date (recurrence is null or recurrence.startDate is missing)
    // When editing from backlog, don't auto-fill date/time
    const hasDate = task?.recurrence?.startDate;
    if (!hasDate) {
      // Task has no date - return empty string (backlog task)
      return "";
    }
    // Task has a date - use it
    return task.recurrence.startDate.split("T")[0];
  });
  const [duration, setDuration] = useState(task?.duration ?? (defaultTime ? 30 : 0));
  const [recurrenceType, setRecurrenceType] = useState(task?.recurrence?.type || "none");
  const [status, setStatus] = useState(task?.status || (task ? undefined : "todo"));
  const [priority, setPriority] = useState(task?.priority || null);
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
  const [completionType, setCompletionType] = useState(task?.completionType || defaultCompletionType || "checkbox");
  const [content, setContent] = useState(task?.content || "");
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);

  // Goal-specific state
  const [goalYear, setGoalYear] = useState(task?.goalYear || defaultGoalYear || new Date().getFullYear());
  const [goalMonths, setGoalMonths] = useState(task?.goalMonths || []);
  const [goalData] = useState(task?.goalData || {});
  const [parentId, setParentId] = useState(task?.parentId || null);

  // Reflection-specific state
  const [reflectionData, setReflectionData] = useState(() => {
    const existing = task?.reflectionData || { questions: [] };
    // Ensure all questions have IDs
    const questionsWithIds = existing.questions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${idx}-${Date.now()}`,
      order: q.order !== undefined ? q.order : idx,
    }));
    return { ...existing, questions: questionsWithIds };
  });
  const [selectedTemplate, setSelectedTemplate] = useState("custom");

  // Selection-specific state
  const [selectionData, setSelectionData] = useState(() => {
    const existing = task?.selectionData || { options: [] };
    return { ...existing, options: existing.options || [] };
  });

  // Helper to generate unique question ID
  const generateQuestionId = useCallback(() => {
    return `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Load template into questions
  const handleTemplateSelect = useCallback(
    templateName => {
      setSelectedTemplate(templateName);
      if (templateName === "custom") {
        // Keep existing questions
        return;
      }
      const template = REFLECTION_TEMPLATES[templateName];
      if (template) {
        const questionsWithIds = template.map((q, idx) => ({
          id: generateQuestionId(),
          question: q.question,
          order: q.order !== undefined ? q.order : idx,
          linkedGoalType: q.linkedGoalType || null,
          allowGoalCreation: q.allowGoalCreation || false,
          goalCreationType: q.goalCreationType || null,
        }));
        setReflectionData(prev => ({ ...prev, questions: questionsWithIds }));
      }
    },
    [generateQuestionId]
  );

  // Add new question
  const handleAddQuestion = useCallback(() => {
    const newQuestion = {
      id: generateQuestionId(),
      question: "",
      order: reflectionData.questions.length,
      linkedGoalType: null,
      allowGoalCreation: false,
      goalCreationType: null,
    };
    setReflectionData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  }, [reflectionData.questions.length, generateQuestionId]);

  // Remove question
  const handleRemoveQuestion = useCallback(
    questionId => {
      setReflectionData(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId).map((q, idx) => ({ ...q, order: idx })),
      }));
      // Reset template to custom if question removed
      if (selectedTemplate !== "custom") {
        setSelectedTemplate("custom");
      }
    },
    [selectedTemplate]
  );

  // Update question
  const handleUpdateQuestion = useCallback(
    (questionId, updates) => {
      setReflectionData(prev => ({
        ...prev,
        questions: prev.questions.map(q => (q.id === questionId ? { ...q, ...updates } : q)),
      }));
      // Reset template to custom if question edited
      if (selectedTemplate !== "custom") {
        setSelectedTemplate("custom");
      }
    },
    [selectedTemplate]
  );

  // Reorder questions (drag and drop)
  const handleQuestionDragEnd = useCallback(
    result => {
      if (!result.destination) return;
      const items = Array.from(reflectionData.questions);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      // Update order values
      const reordered = items.map((q, idx) => ({ ...q, order: idx }));
      setReflectionData(prev => ({ ...prev, questions: reordered }));
      // Reset template to custom if reordered
      if (selectedTemplate !== "custom") {
        setSelectedTemplate("custom");
      }
    },
    [reflectionData.questions, selectedTemplate]
  );

  // Selection-specific handlers
  const handleAddSelectionOption = useCallback(() => {
    setSelectionData(prev => ({
      ...prev,
      options: [...(prev.options || []), ""],
    }));
  }, []);

  const handleRemoveSelectionOption = useCallback(index => {
    setSelectionData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateSelectionOption = useCallback((index, value) => {
    setSelectionData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
    }));
  }, []);

  // Reorder selection options (drag and drop)
  const handleSelectionOptionDragEnd = useCallback(
    result => {
      if (!result.destination) return;
      const items = Array.from(selectionData.options || []);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setSelectionData(prev => ({ ...prev, options: items }));
    },
    [selectionData.options]
  );
  // const [workoutBuilderOpen, setWorkoutBuilderOpen] = useState(false);
  // Note: workoutProgram query kept for potential future use
  useGetWorkoutProgramQuery(task?.id, {
    skip: !task?.id,
  });

  // Store the date that was clicked when opening this dialog (for recurring series splitting)
  // This should NOT change even if the user edits the date picker
  // Since the key includes the clicked date, component remounts when clicking different occurrences,
  // so this will capture the correct original date for each mount
  const originalClickedDate = useMemo(() => {
    if (defaultDate) return defaultDate;
    if (clickedRecurringDate) {
      // Handle both Date objects and ISO strings
      const clickedDate =
        typeof clickedRecurringDate === "string" ? new Date(clickedRecurringDate) : clickedRecurringDate;
      return formatLocalDate(clickedDate);
    }
    return null;
  }, [defaultDate, clickedRecurringDate]);

  const performSave = useCallback(
    async (saveData, scope = null) => {
      // If scope is provided, this is a recurring task edit that needs series splitting
      if (scope && task) {
        // Use the original clicked date as the edit boundary, not the potentially-modified date
        const editDate = originalClickedDate ? new Date(originalClickedDate) : date ? new Date(date) : new Date();

        // Prepare newValues object for the helper functions
        const newValues = {
          title: saveData.title,
          sectionId: saveData.sectionId,
          time: saveData.time,
          duration: saveData.duration,
          recurrenceType: recurrenceType,
          selectedDays: selectedDays,
          monthlyMode: monthlyMode,
          selectedDayOfMonth: selectedDayOfMonth,
          monthlyOrdinal: monthlyOrdinal,
          monthlyDayOfWeek: monthlyDayOfWeek,
          monthlyInterval: monthlyInterval,
          yearlyMode: yearlyMode,
          yearlyMonth: yearlyMonth,
          yearlyDayOfMonth: yearlyDayOfMonth,
          yearlyOrdinal: yearlyOrdinal,
          yearlyDayOfWeek: yearlyDayOfWeek,
          yearlyInterval: yearlyInterval,
        };

        if (scope === "all") {
          // Edit all occurrences - normal save that updates the entire series
          await onSave(saveData);
        } else if (scope === "this") {
          const { originalTaskUpdate, newTask } = prepareThisOccurrenceEdit(task, newValues, editDate);

          // Update original task (add exception) - only update recurrence, keep all other fields unchanged
          await onSave({
            id: task.id,
            title: task.title,
            sectionId: task.sectionId,
            time: task.time,
            duration: task.duration,
            recurrence: originalTaskUpdate.recurrence,
            tagIds: Array.isArray(task.tags) ? task.tags.map(t => t.id) : [],
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            completionType: task.completionType,
            content: task.content,
            expanded: task.expanded || false,
            order: task.order ?? 999,
            status: task.status || "todo",
            priority: task.priority || null,
          });

          // Create new one-time task with the edited values (remove id to force creation)
          const { sourceTaskId, ...newTaskWithoutId } = newTask;
          await onSave({
            ...newTaskWithoutId,
            sourceTaskId,
            tagIds: selectedTagIds,
            subtasks: [],
            order: 999,
            status: "todo",
            priority: saveData.priority || null,
          });
        } else if (scope === "future") {
          const { originalTaskUpdate, newTask } = prepareFutureOccurrencesEdit(task, newValues, editDate);

          // Update original task (set endDate) - only update recurrence, keep all other fields unchanged
          await onSave({
            id: task.id,
            title: task.title,
            sectionId: task.sectionId,
            time: task.time,
            duration: task.duration,
            recurrence: originalTaskUpdate.recurrence,
            tagIds: Array.isArray(task.tags) ? task.tags.map(t => t.id) : [],
            subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
            completionType: task.completionType,
            content: task.content,
            expanded: task.expanded || false,
            order: task.order ?? 999,
            status: task.status || "todo",
            priority: task.priority || null,
          });

          // Create new recurring task with the edited values (remove id to force creation)
          const { sourceTaskId, ...newTaskWithoutId } = newTask;
          await onSave({
            ...newTaskWithoutId,
            sourceTaskId,
            tagIds: selectedTagIds,
            subtasks: [],
            order: 999,
            status: "todo",
            priority: saveData.priority || null,
          });
        }
      } else {
        // Normal save logic
        await onSave(saveData);
      }
      onClose();
    },
    [
      task,
      date,
      originalClickedDate,
      selectedTagIds,
      recurrenceType,
      selectedDays,
      monthlyMode,
      selectedDayOfMonth,
      monthlyOrdinal,
      monthlyDayOfWeek,
      monthlyInterval,
      yearlyMode,
      yearlyMonth,
      yearlyDayOfMonth,
      yearlyOrdinal,
      yearlyDayOfWeek,
      yearlyInterval,
      onSave,
      onClose,
    ]
  );

  const handleScopeSelect = useCallback(
    async scope => {
      if (!pendingChanges) return;
      await performSave(pendingChanges, scope);
      setPendingChanges(null);
      setShowScopeDialog(false);
    },
    [pendingChanges, performSave]
  );

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    // Validate monthly goals have a parent
    if (completionType === "goal" && goalMonths && goalMonths.length > 0 && !parentId) {
      console.error("Monthly goals must be linked to a yearly goal");
      return;
    }

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

    const saveData = {
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
      priority: priority || null,
      // Parent ID for sub-goals
      parentId: parentId || null,
      // Goal-specific fields
      ...(completionType === "goal" && {
        goalYear,
        goalMonths: goalMonths.length > 0 ? goalMonths : null,
        goalData,
      }),
      // Reflection-specific fields
      ...(completionType === "reflection" && {
        reflectionData: {
          ...reflectionData,
          questions: reflectionData.questions
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((q, idx) => ({ ...q, order: idx })), // Ensure order is sequential
        },
      }),
      // Selection-specific fields
      ...(completionType === "selection" && {
        selectionData: {
          ...selectionData,
          options: (selectionData.options || []).filter(opt => opt.trim() !== ""), // Remove empty options
        },
      }),
    };

    // If editing an existing recurring task, check if we need scope decision
    if (
      task &&
      requiresSeriesScopeDecision(task, {
        date,
        time,
        recurrenceType,
        selectedDays,
        monthlyMode,
        selectedDayOfMonth,
        monthlyOrdinal,
        monthlyDayOfWeek,
        monthlyInterval,
        yearlyMode,
        yearlyMonth,
        yearlyDayOfMonth,
        yearlyOrdinal,
        yearlyDayOfWeek,
        yearlyInterval,
      })
    ) {
      setPendingChanges(saveData);
      setShowScopeDialog(true);
      return;
    }

    // Otherwise, proceed with normal save
    performSave(saveData);
  }, [
    title,
    recurrenceType,
    date,
    endDate,
    selectedDays,
    monthlyMode,
    selectedDayOfMonth,
    monthlyOrdinal,
    monthlyDayOfWeek,
    monthlyInterval,
    yearlyMode,
    yearlyMonth,
    yearlyDayOfMonth,
    yearlyOrdinal,
    yearlyDayOfWeek,
    yearlyInterval,
    subtasks,
    task,
    sectionId,
    time,
    duration,
    selectedTagIds,
    completionType,
    content,
    status,
    priority,
    goalYear,
    goalMonths,
    goalData,
    parentId,
    reflectionData,
    selectionData,
    performSave,
  ]);

  const handleFormSubmit = useCallback(
    e => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  // Memoized date/time handlers
  const handleDateChange = useCallback(newDate => {
    const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
    setDate(dateStr);
  }, []);

  const handleTimeChange = useCallback(newTime => {
    const timeStr = newTime ? newTime.format("HH:mm") : "";
    setTime(timeStr);
  }, []);

  const handleEndDateChange = useCallback(newDate => {
    const dateStr = newDate ? newDate.format("YYYY-MM-DD") : "";
    setEndDate(dateStr);
  }, []);

  // Memoized WeekdaySelector handler
  const handleSelectedDaysChange = useCallback(newDays => {
    setSelectedDays(newDays);
  }, []);

  // Memoized recurrence type handler
  const handleRecurrenceTypeChange = useCallback(
    e => {
      const newType = e.target.value;
      setRecurrenceType(newType);
      // Reset related fields based on type
      if (newType === "weekly" && selectedDays.length === 0) {
        setSelectedDays([new Date().getDay()]);
      }
    },
    [selectedDays.length]
  );

  // Memoized subtask time picker handler
  const handleSubtaskTimeChange = useCallback(newTime => {
    const timeStr = newTime ? newTime.format("HH:mm") : "";
    setSubtaskTime(timeStr);
  }, []);

  // Handle drag and drop for subtasks
  const handleDragEnd = useCallback(result => {
    const { destination, source } = result;

    if (!destination) return;
    if (destination.index === source.index) return;

    setSubtasks(prev => {
      const reordered = Array.from(prev);
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      return reordered.map((st, idx) => ({ ...st, order: idx }));
    });
  }, []);

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
        maxWidth={isMobile ? undefined : "md"}
        fullWidth
        PaperProps={{
          sx: {
            height: { xs: "100vh", md: "90vh" },
            maxHeight: { xs: "100vh", md: "90vh" },
            m: { xs: 0, md: "auto" },
            width: { xs: "100%", md: "600px" },
            borderRadius: { xs: 0, md: 1 },
          },
        }}
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
                      {/* Tags - clickable to open selector */}
                      <TagSelector
                        selectedTagIds={selectedTagIds}
                        onSelectionChange={setSelectedTagIds}
                        showManageButton
                        renderTrigger={handleMenuOpen =>
                          selectedTagIds.length > 0 ? (
                            <>
                              {Array.isArray(tags) &&
                                tags
                                  .filter(t => selectedTagIds.includes(t.id))
                                  .map(tag => (
                                    <Box
                                      key={tag.id}
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleMenuOpen(e);
                                      }}
                                      sx={{ cursor: "pointer" }}
                                    >
                                      <TagChip tag={tag} size="sm" />
                                    </Box>
                                  ))}
                            </>
                          ) : null
                        }
                      />
                    </Stack>
                  </Box>
                </Box>
              </GLGrid>

              {/* Section */}
              <GLGrid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select value={sectionId || ""} onChange={e => setSectionId(e.target.value || null)} label="Section">
                    <MenuItem value="">
                      <em>No Section</em>
                    </MenuItem>
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
                  onChange={handleDateChange}
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
                  onChange={handleTimeChange}
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
                    onChange={handleEndDateChange}
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

              {/* Goal-specific fields */}
              {completionType === "goal" && (
                <>
                  <GLGrid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Goal Year</InputLabel>
                      <Select value={goalYear} onChange={e => setGoalYear(e.target.value)} label="Goal Year">
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() + i;
                          return (
                            <MenuItem key={year} value={year}>
                              {year}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </GLGrid>

                  <GLGrid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Goal Months (Optional)</InputLabel>
                      <Select
                        multiple
                        value={goalMonths}
                        onChange={e => {
                          const newMonths = e.target.value;
                          setGoalMonths(newMonths);
                          // If changing from monthly to yearly (clearing months), clear parent
                          if (newMonths.length === 0) {
                            setParentId(null);
                          }
                        }}
                        label="Goal Months (Optional)"
                        renderValue={selected =>
                          selected
                            .map(m =>
                              dayjs()
                                .month(m - 1)
                                .format("MMM")
                            )
                            .join(", ")
                        }
                      >
                        {[...Array(12)].map((_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            {dayjs().month(i).format("MMMM")}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Leave empty for yearly goals
                    </Typography>
                  </GLGrid>

                  {/* Parent Goal Selector - Required for monthly goals */}
                  {goalMonths && goalMonths.length > 0 && (
                    <GLGrid item xs={12}>
                      <FormControl fullWidth size="small" required error={!parentId}>
                        <InputLabel>Parent Yearly Goal *</InputLabel>
                        <Select
                          value={parentId || ""}
                          onChange={e => setParentId(e.target.value)}
                          label="Parent Yearly Goal *"
                        >
                          {allTasks
                            .filter(
                              t =>
                                t.completionType === "goal" &&
                                t.goalYear === goalYear &&
                                (!t.goalMonths || t.goalMonths.length === 0) &&
                                !t.parentId &&
                                t.id !== task?.id
                            )
                            .map(yearlyGoal => (
                              <MenuItem key={yearlyGoal.id} value={yearlyGoal.id}>
                                {yearlyGoal.title}
                              </MenuItem>
                            ))}
                        </Select>
                        {!parentId && (
                          <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                            Monthly goals must be linked to a yearly goal
                          </Typography>
                        )}
                      </FormControl>
                    </GLGrid>
                  )}

                  <GLGrid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      {goalMonths && goalMonths.length > 0
                        ? "This monthly goal will appear as a sub-goal under the selected yearly goal."
                        : "Yearly goals can have monthly sub-goals. Create a yearly goal first, then add monthly goals to it."}
                    </Typography>
                  </GLGrid>
                </>
              )}

              {/* Reflection-specific fields */}
              {completionType === "reflection" && (
                <>
                  <GLGrid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Reflection Template</InputLabel>
                      <Select
                        value={selectedTemplate}
                        onChange={e => handleTemplateSelect(e.target.value)}
                        label="Reflection Template"
                      >
                        <MenuItem value="custom">Custom Questions</MenuItem>
                        <MenuItem value="weekly">Weekly Reflection</MenuItem>
                        <MenuItem value="monthly">Monthly Reflection</MenuItem>
                        <MenuItem value="yearly">Yearly Reflection</MenuItem>
                      </Select>
                    </FormControl>
                  </GLGrid>

                  <GLGrid item xs={12}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          Questions ({reflectionData.questions.length})
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={handleAddQuestion}
                          variant="outlined"
                          sx={{ ml: "auto" }}
                        >
                          Add Question
                        </Button>
                      </Stack>

                      {reflectionData.questions.length === 0 ? (
                        <Paper
                          sx={{
                            p: 2,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            bgcolor: "background.default",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary" align="center">
                            No questions yet. Select a template or add custom questions.
                          </Typography>
                        </Paper>
                      ) : (
                        <DragDropContext onDragEnd={handleQuestionDragEnd}>
                          <Droppable droppableId="reflection-questions">
                            {provided => (
                              <Stack
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                spacing={1}
                                sx={{ maxHeight: 400, overflow: "auto" }}
                              >
                                {reflectionData.questions
                                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                                  .map((question, index) => (
                                    <Draggable key={question.id} draggableId={question.id} index={index}>
                                      {provided => (
                                        <Paper
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          sx={{
                                            p: 1.5,
                                            border: 1,
                                            borderColor: "divider",
                                            borderRadius: 1,
                                            bgcolor: "background.paper",
                                          }}
                                        >
                                          <Stack spacing={1}>
                                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                              <Box
                                                {...provided.dragHandleProps}
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  cursor: "grab",
                                                  color: "text.secondary",
                                                  "&:active": { cursor: "grabbing" },
                                                }}
                                              >
                                                <DragIndicator fontSize="small" />
                                              </Box>
                                              <TextField
                                                fullWidth
                                                size="small"
                                                value={question.question}
                                                onChange={e =>
                                                  handleUpdateQuestion(question.id, { question: e.target.value })
                                                }
                                                placeholder="Enter question text..."
                                                variant="outlined"
                                                multiline
                                                minRows={1}
                                              />
                                              <IconButton
                                                size="small"
                                                onClick={() => handleRemoveQuestion(question.id)}
                                                sx={{ color: "error.main" }}
                                              >
                                                <Delete fontSize="small" />
                                              </IconButton>
                                            </Stack>

                                            {/* Linked Goal Type Selector */}
                                            <FormControl size="small" fullWidth>
                                              <InputLabel>Link to Goals (Optional)</InputLabel>
                                              <Select
                                                value={question.linkedGoalType || ""}
                                                onChange={e =>
                                                  handleUpdateQuestion(question.id, {
                                                    linkedGoalType: e.target.value || null,
                                                    // Reset goal creation when unlinking
                                                    allowGoalCreation: e.target.value
                                                      ? question.allowGoalCreation
                                                      : false,
                                                    goalCreationType: e.target.value ? question.goalCreationType : null,
                                                  })
                                                }
                                                label="Link to Goals (Optional)"
                                              >
                                                <MenuItem value="">None</MenuItem>
                                                <MenuItem value="yearly">Yearly Goals</MenuItem>
                                                <MenuItem value="monthly">Monthly Goals</MenuItem>
                                              </Select>
                                            </FormControl>

                                            {/* Goal creation toggle - available for all questions */}
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                              <FormControlLabel
                                                control={
                                                  <Checkbox
                                                    checked={question.allowGoalCreation || false}
                                                    onChange={e =>
                                                      handleUpdateQuestion(question.id, {
                                                        allowGoalCreation: e.target.checked,
                                                        goalCreationType: e.target.checked
                                                          ? question.goalCreationType ||
                                                            (question.linkedGoalType === "yearly"
                                                              ? "next_year"
                                                              : question.linkedGoalType === "monthly"
                                                                ? "next_month"
                                                                : "next_month")
                                                          : null,
                                                      })
                                                    }
                                                    size="small"
                                                  />
                                                }
                                                label={<Typography variant="caption">Create goals</Typography>}
                                              />

                                              {question.allowGoalCreation && (
                                                <FormControl size="small" sx={{ minWidth: 130 }}>
                                                  <Select
                                                    value={question.goalCreationType || "next_month"}
                                                    onChange={e =>
                                                      handleUpdateQuestion(question.id, {
                                                        goalCreationType: e.target.value,
                                                      })
                                                    }
                                                    size="small"
                                                  >
                                                    <MenuItem value="next_month">Next Month</MenuItem>
                                                    <MenuItem value="next_year">Next Year</MenuItem>
                                                  </Select>
                                                </FormControl>
                                              )}
                                            </Stack>
                                          </Stack>
                                        </Paper>
                                      )}
                                    </Draggable>
                                  ))}
                                {provided.placeholder}
                              </Stack>
                            )}
                          </Droppable>
                        </DragDropContext>
                      )}
                    </Box>
                  </GLGrid>
                </>
              )}

              {/* Selection-specific fields */}
              {completionType === "selection" && (
                <GLGrid item xs={12}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        Dropdown Options ({(selectionData.options || []).length})
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={handleAddSelectionOption}
                        variant="outlined"
                        sx={{ ml: "auto" }}
                      >
                        Add Option
                      </Button>
                    </Stack>

                    {(selectionData.options || []).length === 0 ? (
                      <Paper
                        sx={{
                          p: 2,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" align="center">
                          No options yet. Add options that will appear in the dropdown.
                        </Typography>
                      </Paper>
                    ) : (
                      <DragDropContext onDragEnd={handleSelectionOptionDragEnd}>
                        <Droppable droppableId="selection-options">
                          {provided => (
                            <Stack
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              spacing={1}
                              sx={{ maxHeight: 400, overflow: "auto" }}
                            >
                              {(selectionData.options || []).map((option, index) => (
                                <Draggable key={`option-${index}`} draggableId={`option-${index}`} index={index}>
                                  {provided => (
                                    <Paper
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      sx={{
                                        p: 1.5,
                                        border: 1,
                                        borderColor: "divider",
                                        borderRadius: 1,
                                        bgcolor: "background.paper",
                                      }}
                                    >
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Box
                                          {...provided.dragHandleProps}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "grab",
                                            color: "text.secondary",
                                            "&:active": { cursor: "grabbing" },
                                          }}
                                        >
                                          <DragIndicator fontSize="small" />
                                        </Box>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          value={option}
                                          onChange={e => handleUpdateSelectionOption(index, e.target.value)}
                                          placeholder="Enter option text..."
                                          variant="outlined"
                                          onKeyDown={e => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              handleAddSelectionOption();
                                            }
                                          }}
                                        />
                                        <IconButton
                                          size="small"
                                          onClick={() => handleRemoveSelectionOption(index)}
                                          sx={{ color: "error.main" }}
                                        >
                                          <Delete fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    </Paper>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Stack>
                          )}
                        </Droppable>
                      </DragDropContext>
                    )}
                  </Box>
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

              {/* Priority field */}
              <GLGrid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={priority || ""} onChange={e => setPriority(e.target.value || null)} label="Priority">
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {PRIORITY_LEVELS.filter(level => level.value !== null).map(level => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </GLGrid>

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
                  <Select value={recurrenceType} onChange={handleRecurrenceTypeChange} label="Recurrence">
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
                  <WeekdaySelector selectedDays={selectedDays} onChange={handleSelectedDaysChange} size="sm" />
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
                          <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="task-dialog-subtasks" type="SUBTASK">
                              {provided => (
                                <List ref={provided.innerRef} {...provided.droppableProps} dense sx={{ mb: 2 }}>
                                  {subtasks.map((st, index) => (
                                    <Draggable key={st.id} draggableId={`subtask-${st.id}`} index={index}>
                                      {(provided, snapshot) => (
                                        <ListItem
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          divider={index < subtasks.length - 1}
                                          sx={{
                                            py: 1,
                                            px: 0,
                                            opacity: snapshot.isDragging ? 0.5 : 1,
                                          }}
                                        >
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
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </List>
                              )}
                            </Droppable>
                          </DragDropContext>
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
                                        allTasksOverride={allTasks}
                                        viewDate={dialogViewDate}
                                        shared={taskItemShared}
                                        meta={taskItemShared?.taskMetaById?.get(t.id)}
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
                  onChange={handleSubtaskTimeChange}
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

      {/* Recurring Edit Scope Dialog */}
      <RecurringEditScopeDialog
        open={showScopeDialog}
        onClose={() => {
          setShowScopeDialog(false);
          setPendingChanges(null);
        }}
        onSelect={handleScopeSelect}
        taskTitle={task?.title || ""}
        editDate={date || new Date()}
      />

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
  const taskOps = useTaskOperations();
  const allTasks = taskOps.tasks || [];
  const [createTagMutation] = useCreateTagMutation();
  const [deleteTagMutation] = useDeleteTagMutation();

  const isOpen = dialogState.taskDialogOpen;
  const task = dialogState.editingTask;

  const handleClose = () => {
    dialogState.closeTaskDialog();
    dialogState.setEditingTask(null);
    dialogState.setDefaultSectionId(null);
    dialogState.setDefaultTime(null);
    dialogState.setDefaultDate(null);
    dialogState.setClickedRecurringDate(null);
  };

  const handleCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };

  const handleDeleteTag = async id => {
    return await deleteTagMutation(id).unwrap();
  };

  if (!isOpen) return null;

  // Use key to reset form state when task changes or dialog opens with new task
  // For recurring tasks, include the clicked date so clicking different occurrences remounts
  const clickedDateKey = dialogState.defaultDate || dialogState.clickedRecurringDate || "";
  const key = task?.id ? `${task.id}-${clickedDateKey}` : `new-${isOpen}-${clickedDateKey}`;

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
      clickedRecurringDate={dialogState.clickedRecurringDate}
      defaultCompletionType={dialogState.defaultCompletionType}
      defaultGoalYear={dialogState.defaultGoalYear}
      tags={tags}
      onCreateTag={handleCreateTag}
      onDeleteTag={handleDeleteTag}
      allTasks={allTasks}
    />
  );
};

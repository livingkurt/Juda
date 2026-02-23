"use client";

import { useState, useMemo, useDeferredValue, memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  MenuItem,
  Popover,
  Menu,
  Tooltip,
  Divider,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  Check,
  Close,
  FitnessCenter,
  TableChart,
  BarChart,
  SwapVert,
  SwapHoriz,
  Edit,
  ContentCopy,
  Delete,
  RadioButtonUnchecked,
  MoreVert,
  Search,
  SkipNext,
  ExpandMore,
  ChevronRight,
} from "@mui/icons-material";
import { shouldShowOnDate } from "@/lib/utils";
import { DateNavigation } from "../DateNavigation";
import { useRecurringTasks } from "@/hooks/useRecurringTasks";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useUpdateCompletionMutation,
  useGetCompletionsByDateRangeQuery,
} from "@/lib/store/api/completionsApi";
import {
  useCreateOffScheduleCompletionMutation,
  useDeleteOffScheduleCompletionMutation,
  useRolloverTaskMutation,
} from "@/lib/store/api/tasksApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useDialogState } from "@/hooks/useDialogState";
import { useViewState } from "@/hooks/useViewState";
import CellEditorPopover from "../CellEditorPopover";
import { setHistoryRange, setHistoryPage, setHistorySearchTerm } from "@/lib/store/slices/uiSlice";

// Filter only recurring tasks (keep subtasks nested, don't flatten)
// Show subtasks even if they don't have recurrence, as long as parent has recurrence
const getRecurringTasks = tasks => {
  const filterRecurring = (taskList, parentHasRecurrence = false) => {
    return taskList
      .filter(t => {
        // Include task if it has recurrence OR if parent has recurrence (for subtasks)
        const hasRecurrence = t.recurrence?.type && t.recurrence.type !== "none";
        return (hasRecurrence || parentHasRecurrence) && t.completionType !== "note";
      })
      .map(task => {
        const taskHasRecurrence = task.recurrence?.type && task.recurrence.type !== "none";
        // Always include subtasks if parent has recurrence, even if subtasks don't
        if (task.subtasks?.length > 0) {
          return {
            ...task,
            subtasks: filterRecurring(task.subtasks, taskHasRecurrence),
          };
        }
        return task;
      });
  };
  return filterRecurring(tasks);
};

// Flatten tasks including expanded subtasks
const flattenTasksWithSubtasks = (tasks, expandedTaskIds) => {
  const result = [];
  const traverse = (taskList, depth = 0) => {
    taskList.forEach(task => {
      result.push({ ...task, depth });
      // Include subtasks if parent is expanded
      if (task.subtasks?.length > 0 && expandedTaskIds.has(task.id)) {
        traverse(task.subtasks, depth + 1);
      }
    });
  };
  traverse(tasks);
  return result;
};

// Flatten all tasks and subtasks regardless of expanded state
const flattenAllTasks = tasks => {
  const result = [];
  const traverse = (taskList, depth = 0) => {
    taskList.forEach(task => {
      result.push({ ...task, depth });
      if (task.subtasks?.length > 0) {
        traverse(task.subtasks, depth + 1);
      }
    });
  };
  traverse(tasks);
  return result;
};

// Group tasks by section
const groupTasksBySection = (tasks, sections) => {
  const orderedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  const grouped = [];

  orderedSections.forEach(section => {
    const sectionTasks = tasks.filter(t => t.sectionId === section.id).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sectionTasks.length > 0) {
      grouped.push({ section, tasks: sectionTasks });
    }
  });

  // Tasks without section
  const uncategorized = tasks.filter(t => !t.sectionId);
  if (uncategorized.length > 0) {
    grouped.push({
      section: { id: "no-section", name: "Uncategorized", order: 999 },
      tasks: uncategorized,
    });
  }

  return grouped;
};

// Generate dates for range
const generateDates = (range, page = 0, pageSize = 30) => {
  const today = dayjs().startOf("day");
  let startDate;
  let endDate;

  switch (range) {
    case "week":
      startDate = today.startOf("week").add(page * 7, "day");
      endDate = startDate.add(6, "day");
      break;
    case "month":
      startDate = today.startOf("month").add(page, "month");
      endDate = startDate.endOf("month");
      break;
    case "year":
      startDate = today.startOf("year").add(page, "year");
      endDate = startDate.endOf("year");
      break;
    default: // custom or paginated
      startDate = today.add(page * pageSize, "day");
      endDate = startDate.add(pageSize - 1, "day");
  }

  const dates = [];
  let current = startDate;

  // Collect dates from startDate to endDate, but cap at today (filter out future dates)
  const effectiveEndDate = endDate.isAfter(today) ? today : endDate;

  while (current.isBefore(effectiveEndDate) || current.isSame(effectiveEndDate, "day")) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }

  // Filter out any future dates (safety check) and reverse to show newest dates first (today at top)
  const filteredDates = dates.filter(date => {
    const dateObj = dayjs(date);
    return dateObj.isBefore(today) || dateObj.isSame(today, "day");
  });

  return filteredDates.reverse();
};

// Date Header Component
const DateHeader = memo(function DateHeader({ date, isToday }) {
  const dateObj = dayjs(date);
  return (
    <TableCell
      sx={{
        position: "sticky",
        left: 0,
        zIndex: 1,
        bgcolor: isToday ? "primary.dark" : "background.paper",
        color: isToday ? "primary.contrastText" : "text.primary",
        fontWeight: isToday ? 600 : 400,
        borderRight: 1,
        borderColor: "divider",
        minWidth: 120,
      }}
    >
      <Typography variant="body2" fontWeight={isToday ? 600 : 400}>
        {dateObj.format("ddd, MMM D")}
      </Typography>
    </TableCell>
  );
});

// Memoized wrapper for CompletionCell that creates stable handlers
const MemoizedCompletionCell = memo(function MemoizedCompletionCell({
  task,
  date,
  completion,
  isScheduled,
  onCellUpdate,
  onCellDelete,
  showRightBorder,
  onOpenTextModal,
}) {
  // Create stable handlers bound to this task/date combination
  const handleUpdate = useCallback(
    data => {
      onCellUpdate(task, date, data);
    },
    [onCellUpdate, task, date]
  );

  const handleDelete = useCallback(() => {
    onCellDelete(task, date);
  }, [onCellDelete, task, date]);

  return (
    <CompletionCell
      task={task}
      date={date}
      completion={completion}
      isScheduled={isScheduled}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      showRightBorder={showRightBorder}
      onOpenTextModal={onOpenTextModal}
    />
  );
});

const OUTCOME_DEFINITIONS = [
  { key: "completed", label: "Completed", color: "success.main" },
  { key: "notCompleted", label: "Not completed", color: "error.main" },
  { key: "rolledOver", label: "Rolled over", color: "warning.main" },
  { key: "unchecked", label: "Unchecked", color: "grey.500" },
];

const getSleepDurationMinutes = (sleepData = {}) => {
  if (Number.isFinite(sleepData.durationHours) || Number.isFinite(sleepData.durationMinutesPart)) {
    const hours = Number.isFinite(sleepData.durationHours) ? sleepData.durationHours : 0;
    const minutesPart = Number.isFinite(sleepData.durationMinutesPart) ? sleepData.durationMinutesPart : 0;
    return Math.max(0, Math.floor(hours) * 60 + Math.floor(minutesPart));
  }

  if (Number.isFinite(sleepData.durationMinutes)) {
    return Math.max(0, Math.floor(sleepData.durationMinutes));
  }

  return null;
};

const formatSleepDuration = minutes => {
  if (!Number.isFinite(minutes)) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getSleepDurationParts = (sleepData = {}) => {
  if (Number.isFinite(sleepData.durationHours) || Number.isFinite(sleepData.durationMinutesPart)) {
    return {
      hours: Number.isFinite(sleepData.durationHours) ? Math.max(0, Math.floor(sleepData.durationHours)) : 0,
      minutesPart: Number.isFinite(sleepData.durationMinutesPart) ? Math.max(0, Math.floor(sleepData.durationMinutesPart)) : 0,
    };
  }

  const totalMinutes = getSleepDurationMinutes(sleepData);
  if (!Number.isFinite(totalMinutes)) {
    return { hours: 0, minutesPart: 0 };
  }

  return {
    hours: Math.floor(totalMinutes / 60),
    minutesPart: totalMinutes % 60,
  };
};

const formatSleepTimeInput = isoString => {
  if (!isoString) return "";
  const value = dayjs(isoString);
  if (!value.isValid()) return "";
  return value.format("HH:mm");
};

const buildSleepIso = (completionDate, timeValue, isStart) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const base = dayjs(completionDate).startOf("day");
  let dateTime = base.hour(hours).minute(minutes).second(0).millisecond(0);
  if (isStart && hours >= 18) {
    dateTime = dateTime.subtract(1, "day");
  }

  return dateTime.toISOString();
};

const SleepCellEditDialog = memo(function SleepCellEditDialog({ modal, onClose, onSave }) {
  const isOpen = Boolean(modal?.open && modal.task && modal.date);
  const initialSleepData = isOpen ? modal.completion?.selectedOptions || {} : {};
  const initialDuration = getSleepDurationParts(initialSleepData);
  const [sleepStart, setSleepStart] = useState(formatSleepTimeInput(initialSleepData.sleepStart));
  const [sleepEnd, setSleepEnd] = useState(formatSleepTimeInput(initialSleepData.sleepEnd));
  const [durationHours, setDurationHours] = useState(String(initialDuration.hours));
  const [durationMinutesPart, setDurationMinutesPart] = useState(String(initialDuration.minutesPart));
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const parsedHours = Number(durationHours);
    const parsedMinutes = Number(durationMinutesPart);
    const normalizedHours = Number.isFinite(parsedHours) && parsedHours >= 0 ? Math.floor(parsedHours) : 0;
    let normalizedMinutes = Number.isFinite(parsedMinutes) && parsedMinutes >= 0 ? Math.floor(parsedMinutes) : 0;
    const extraHours = Math.floor(normalizedMinutes / 60);
    normalizedMinutes %= 60;

    const nextSleepData = {
      sleepStart: buildSleepIso(modal.date, sleepStart, true),
      sleepEnd: buildSleepIso(modal.date, sleepEnd, false),
      durationHours: normalizedHours + extraHours,
      durationMinutesPart: normalizedMinutes,
      source: initialSleepData.source || "manual",
    };

    setIsSaving(true);
    try {
      await onSave(nextSleepData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={modal.open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {modal.task.title}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {dayjs(modal.date).format("MMM D, YYYY")}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 2,
            pt: 1,
          }}
        >
          <TextField
            label="Sleep Start"
            type="time"
            value={sleepStart}
            onChange={e => setSleepStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Sleep End"
            type="time"
            value={sleepEnd}
            onChange={e => setSleepEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Duration (h)"
            type="number"
            value={durationHours}
            onChange={e => setDurationHours(e.target.value)}
            inputProps={{ min: 0, step: 1 }}
            fullWidth
          />
          <TextField
            label="Duration (m)"
            type="number"
            value={durationMinutesPart}
            onChange={e => setDurationMinutesPart(e.target.value)}
            inputProps={{ min: 0, max: 59, step: 1 }}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
});

const buildYearToDateDates = () => {
  const today = dayjs().startOf("day");
  const startOfYear = today.startOf("year");
  const result = [];
  let current = startOfYear;
  while (current.isBefore(today) || current.isSame(today, "day")) {
    result.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }
  return result;
};

const computeYearToDateStats = (task, getCompletionForDate, getOutcomeOnDate) => {
  const dates = buildYearToDateDates();
  const stats = {
    scheduled: 0,
    completed: 0,
    notCompleted: 0,
    rolledOver: 0,
    unchecked: 0,
  };

  dates.forEach(date => {
    const scheduled = shouldShowOnDate(task, date, getOutcomeOnDate);
    if (!scheduled) return;

    stats.scheduled += 1;
    const completion = getCompletionForDate(task.id, date);
    if (!completion) {
      stats.unchecked += 1;
      return;
    }

    if (completion.outcome === "completed") stats.completed += 1;
    else if (completion.outcome === "not_completed") stats.notCompleted += 1;
    else if (completion.outcome === "rolled_over") stats.rolledOver += 1;
    else stats.unchecked += 1;
  });

  const completionRate = stats.scheduled > 0 ? Math.round((stats.completed / stats.scheduled) * 100) : 0;
  const outcomeBreakdown = OUTCOME_DEFINITIONS.map(item => {
    const count = stats[item.key];
    const percentage = stats.scheduled > 0 ? Math.round((count / stats.scheduled) * 100) : 0;
    return {
      ...item,
      count,
      percentage,
    };
  });

  return {
    ...stats,
    completionRate,
    outcomeBreakdown,
  };
};

// Completion Cell Component
const CompletionCell = memo(function CompletionCell({
  task,
  date,
  completion,
  isScheduled,
  onUpdate,
  onDelete,
  showRightBorder = false,
  onOpenTextModal,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const outcome = completion?.outcome;
  const isTextType = task.completionType === "text" || task.completionType === "text_input";
  const isWorkoutType = task.completionType === "workout";
  const isSleepType = task.completionType === "sleep";
  const sleepDurationMinutes = getSleepDurationMinutes(completion?.selectedOptions || {});

  // Cell background color
  const getCellBg = () => {
    if (isSleepType) {
      if (Number.isFinite(sleepDurationMinutes)) {
        if (sleepDurationMinutes > 8 * 60) return theme.palette.success.dark + "40";
        if (sleepDurationMinutes >= 6 * 60) return theme.palette.warning.dark + "40";
        if (sleepDurationMinutes < 5 * 60) return theme.palette.error.dark + "40";
        return theme.palette.action.hover;
      }
      if (isScheduled) return theme.palette.action.hover;
      return "transparent";
    }

    if (!isScheduled && !completion) return "transparent";
    if (outcome === "completed") return theme.palette.success.dark + "40";
    if (outcome === "not_completed") return theme.palette.error.dark + "40";
    if (outcome === "rolled_over") return "#f59e0b40";
    if (isScheduled) return theme.palette.action.hover;
    return "transparent";
  };

  // Cell content
  const getCellContent = () => {
    if (isSleepType) {
      if (Number.isFinite(sleepDurationMinutes)) {
        return (
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {formatSleepDuration(sleepDurationMinutes)}
          </Typography>
        );
      }
      if (isScheduled) {
        return <RadioButtonUnchecked fontSize="small" sx={{ opacity: 0.3 }} />;
      }
      return null;
    }

    if (task.completionType === "text_input" && completion?.actualValue) {
      const text = completion.actualValue;
      const truncated = text.length > 20 ? text.substring(0, 20) + "..." : text;
      return (
        <Tooltip title={text.length > 20 ? text : ""}>
          <Typography variant="caption" noWrap sx={{ maxWidth: 100, display: "block" }}>
            {truncated}
          </Typography>
        </Tooltip>
      );
    }
    if (task.completionType === "text" && completion?.note) {
      const text = completion.note;
      const truncated = text.length > 20 ? text.substring(0, 20) + "..." : text;
      return (
        <Tooltip title={text.length > 20 ? text : ""}>
          <Typography variant="caption" noWrap sx={{ maxWidth: 100, display: "block" }}>
            {truncated}
          </Typography>
        </Tooltip>
      );
    }

    if (outcome === "completed") {
      return <Check fontSize="small" sx={{ color: theme.palette.success.main }} />;
    }
    if (outcome === "not_completed") {
      return <Close fontSize="small" sx={{ color: theme.palette.error.main }} />;
    }
    if (outcome === "rolled_over") {
      return <SkipNext fontSize="small" sx={{ color: "#f59e0b" }} />;
    }
    if (isScheduled) {
      return <RadioButtonUnchecked fontSize="small" sx={{ opacity: 0.3 }} />;
    }
    return null;
  };

  const handleTextClick = useCallback(() => {
    if (onOpenTextModal) {
      onOpenTextModal(task, date, completion, isScheduled);
    }
  }, [onOpenTextModal, task, date, completion, isScheduled]);

  const handleWorkoutClick = useCallback(() => {
    const canOpen = isScheduled || completion;
    if (canOpen && onOpenTextModal) {
      onOpenTextModal(task, date, completion, isScheduled);
    }
  }, [isScheduled, completion, onOpenTextModal, task, date]);

  const handleSleepClick = useCallback(() => {
    const canOpen = isScheduled || completion;
    if (canOpen && onOpenTextModal) {
      onOpenTextModal(task, date, completion, isScheduled);
    }
  }, [isScheduled, completion, onOpenTextModal, task, date]);

  if (isSleepType) {
    const canOpen = isScheduled || completion;
    return (
      <TableCell
        align="center"
        sx={{
          p: 0.5,
          bgcolor: getCellBg(),
          cursor: canOpen ? "pointer" : "default",
          "&:hover": canOpen ? { bgcolor: "action.selected" } : {},
          borderRight: showRightBorder ? 1 : 0,
          borderColor: "divider",
          minWidth: 80,
        }}
        onClick={handleSleepClick}
      >
        {getCellContent()}
      </TableCell>
    );
  }

  // Handle workout type
  if (isWorkoutType) {
    const canOpen = isScheduled || completion;
    return (
      <TableCell
        align="center"
        sx={{
          p: 0.5,
          bgcolor: getCellBg(),
          cursor: canOpen ? "pointer" : "default",
          "&:hover": canOpen ? { bgcolor: "action.selected" } : {},
          borderRight: showRightBorder ? 1 : 0,
          borderColor: "divider",
        }}
        onClick={handleWorkoutClick}
      >
        {outcome === "completed" ? (
          <Check fontSize="small" sx={{ color: theme.palette.success.main }} />
        ) : isScheduled || completion ? (
          <FitnessCenter fontSize="small" sx={{ opacity: 0.5 }} />
        ) : null}
      </TableCell>
    );
  }

  // Handle text input type - open modal on click
  if (isTextType) {
    if (isScheduled || completion) {
      return (
        <TableCell
          align="center"
          sx={{
            p: 0.5,
            bgcolor: getCellBg(),
            cursor: "pointer",
            "&:hover": { bgcolor: "action.selected" },
            borderRight: showRightBorder ? 1 : 0,
            borderColor: "divider",
            maxWidth: 120,
            overflow: "hidden",
          }}
          onClick={handleTextClick}
        >
          {getCellContent()}
        </TableCell>
      );
    }

    // Not scheduled - show popover button
    return (
      <>
        <TableCell
          align="center"
          onClick={e => setAnchorEl(e.currentTarget)}
          sx={{
            p: 0.5,
            minWidth: 40,
            bgcolor: getCellBg(),
            cursor: "pointer",
            "&:hover": { bgcolor: "action.selected" },
            borderRight: showRightBorder ? 1 : 0,
            borderColor: "divider",
          }}
        >
          {getCellContent()}
        </TableCell>

        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          transformOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <CellEditorPopover
            task={task}
            date={date}
            completion={completion}
            isScheduled={isScheduled}
            onSave={data => {
              onUpdate(data);
              setAnchorEl(null);
            }}
            onDelete={() => {
              onDelete();
              setAnchorEl(null);
            }}
            onClose={() => setAnchorEl(null)}
          />
        </Popover>
      </>
    );
  }

  // Default cell with popover
  return (
    <>
      <TableCell
        align="center"
        onClick={e => setAnchorEl(e.currentTarget)}
        sx={{
          p: 0.5,
          minWidth: 40,
          bgcolor: getCellBg(),
          cursor: "pointer",
          "&:hover": { bgcolor: "action.selected" },
          borderRight: showRightBorder ? 1 : 0,
          borderColor: "divider",
        }}
      >
        {getCellContent()}
      </TableCell>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <CellEditorPopover
          task={task}
          date={date}
          completion={completion}
          isScheduled={isScheduled}
          onSave={data => {
            onUpdate(data);
            setAnchorEl(null);
          }}
          onDelete={() => {
            onDelete();
            setAnchorEl(null);
          }}
          onClose={() => setAnchorEl(null)}
        />
      </Popover>
    </>
  );
});

export function HistoryTab({ isLoading: tabLoading }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useDispatch();
  // Get recurring tasks only (much faster - pre-filtered by API)
  const { data: tasks = [] } = useRecurringTasks();
  const { data: sections = [] } = useGetSectionsQuery();
  const dialogState = useDialogState();
  const viewState = useViewState();

  // Mutations
  const [createCompletion] = useCreateCompletionMutation();
  const [deleteCompletion] = useDeleteCompletionMutation();
  const [updateCompletion] = useUpdateCompletionMutation();
  const [createOffScheduleCompletion] = useCreateOffScheduleCompletionMutation();
  const [deleteOffScheduleCompletion] = useDeleteOffScheduleCompletionMutation();
  const [rolloverTask] = useRolloverTaskMutation();

  // Task operations
  const taskOps = useTaskOperations();

  // State
  const range = useSelector(state => state.ui.historyRange);
  const page = useSelector(state => state.ui.historyPage);
  const searchQuery = useSelector(state => state.ui.historySearchTerm);
  const deferredSearch = useDeferredValue(searchQuery);
  const [textModal, setTextModal] = useState({
    open: false,
    task: null,
    date: null,
    completion: null,
    isScheduled: false,
  });
  const [taskMenuAnchor, setTaskMenuAnchor] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());
  const deferredExpandedTaskIds = useDeferredValue(expandedTaskIds);
  const [taskAnalyticsModal, setTaskAnalyticsModal] = useState({
    open: false,
    selectedTaskId: null,
  });
  const [historyView, setHistoryView] = useState("table");
  const [graphSort, setGraphSort] = useState("time");
  const [graphOrientation, setGraphOrientation] = useState(null);
  const [sleepModal, setSleepModal] = useState({
    open: false,
    task: null,
    date: null,
    completion: null,
    isScheduled: false,
  });

  // Generate dates
  const dates = useMemo(() => generateDates(range, page), [range, page]);

  const dateRangeStart = useMemo(() => {
    if (dates.length === 0) return null;
    return dayjs(dates[dates.length - 1])
      .startOf("day")
      .toISOString();
  }, [dates]);

  const dateRangeEnd = useMemo(() => {
    if (dates.length === 0) return null;
    return dayjs(dates[0]).endOf("day").toISOString();
  }, [dates]);

  const { data: rangeCompletions = [] } = useGetCompletionsByDateRangeQuery(
    { startDate: dateRangeStart, endDate: dateRangeEnd },
    { skip: !dateRangeStart || !dateRangeEnd }
  );

  const analyticsStartDate = useMemo(() => dayjs().startOf("day").subtract(364, "day").toISOString(), []);
  const analyticsEndDate = useMemo(() => dayjs().endOf("day").toISOString(), []);

  const { data: analyticsCompletions = [] } = useGetCompletionsByDateRangeQuery({
    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
  });

  const completionsByTaskAndDate = useMemo(() => {
    const map = new Map();
    rangeCompletions.forEach(completion => {
      const dateStr = dayjs(completion.date).format("YYYY-MM-DD");
      const key = `${completion.taskId}|${dateStr}`;
      map.set(key, completion);
    });
    return map;
  }, [rangeCompletions]);

  const analyticsCompletionsByTaskAndDate = useMemo(() => {
    const map = new Map();
    analyticsCompletions.forEach(completion => {
      const dateStr = dayjs(completion.date).format("YYYY-MM-DD");
      const key = `${completion.taskId}|${dateStr}`;
      map.set(key, completion);
    });
    return map;
  }, [analyticsCompletions]);

  const getCompletionForDate = useCallback(
    (taskId, date) => {
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const key = `${taskId}|${dateStr}`;
      return completionsByTaskAndDate.get(key) || null;
    },
    [completionsByTaskAndDate]
  );

  const getOutcomeOnDate = useCallback(
    (taskId, date) => {
      const completion = getCompletionForDate(taskId, date);
      return completion?.outcome || null;
    },
    [getCompletionForDate]
  );

  const getAnalyticsCompletionForDate = useCallback(
    (taskId, date) => {
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const key = `${taskId}|${dateStr}`;
      return analyticsCompletionsByTaskAndDate.get(key) || null;
    },
    [analyticsCompletionsByTaskAndDate]
  );

  const getAnalyticsOutcomeOnDate = useCallback(
    (taskId, date) => {
      const completion = getAnalyticsCompletionForDate(taskId, date);
      return completion?.outcome || null;
    },
    [getAnalyticsCompletionForDate]
  );

  // Get the first date of the range for DateNavigation (or today if no dates)
  const selectedDate = useMemo(() => {
    if (dates.length === 0) return new Date();
    const firstDate = dayjs(dates[0]);
    return firstDate.toDate();
  }, [dates]);

  // Filter and group tasks
  const groupedTasks = useMemo(() => {
    let recurring = getRecurringTasks(tasks);

    // Search filter - preserve parent-child relationships
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      const filterTasks = taskList => {
        return taskList
          .map(task => {
            const taskMatches =
              task.title?.toLowerCase().includes(q) || task.tags?.some(tag => tag.name.toLowerCase().includes(q));
            const hasMatchingSubtasks = task.subtasks?.length > 0 && filterTasks(task.subtasks).length > 0;

            if (taskMatches || hasMatchingSubtasks) {
              return {
                ...task,
                subtasks: task.subtasks?.length > 0 ? filterTasks(task.subtasks) : [],
              };
            }
            return null;
          })
          .filter(Boolean);
      };
      recurring = filterTasks(recurring);
    }

    return groupTasksBySection(recurring, sections);
  }, [tasks, sections, deferredSearch]);

  // Flatten all tasks including expanded subtasks for column headers
  const allTasks = useMemo(() => {
    return groupedTasks.flatMap(g => flattenTasksWithSubtasks(g.tasks, deferredExpandedTaskIds));
  }, [groupedTasks, deferredExpandedTaskIds]);

  const isLastInSectionByTaskId = useMemo(() => {
    const map = new Map();
    groupedTasks.forEach(group => {
      const sectionTasks = flattenTasksWithSubtasks(group.tasks, deferredExpandedTaskIds);
      sectionTasks.forEach((task, index) => {
        map.set(task.id, index === sectionTasks.length - 1);
      });
    });
    return map;
  }, [groupedTasks, deferredExpandedTaskIds]);

  const scheduledByTaskDate = useMemo(() => {
    const map = new Map();
    dates.forEach(dateStr => {
      allTasks.forEach(task => {
        const key = `${task.id}|${dateStr}`;
        map.set(key, shouldShowOnDate(task, dateStr, getOutcomeOnDate));
      });
    });
    return map;
  }, [dates, allTasks, getOutcomeOnDate]);

  // Total task count (including expanded subtasks)
  const totalTasks = useMemo(() => {
    return allTasks.length;
  }, [allTasks]);

  const recurringTaskOptions = useMemo(() => {
    const seen = new Set();
    return groupedTasks
      .flatMap(group => flattenAllTasks(group.tasks))
      .filter(task => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
        return true;
      });
  }, [groupedTasks]);

  const selectedAnalyticsTask = useMemo(
    () =>
      recurringTaskOptions.find(task => task.id === taskAnalyticsModal.selectedTaskId) ||
      recurringTaskOptions[0] ||
      null,
    [taskAnalyticsModal.selectedTaskId, recurringTaskOptions]
  );

  const analyticsYearToDate = useMemo(() => {
    if (!selectedAnalyticsTask) return null;
    return computeYearToDateStats(selectedAnalyticsTask, getAnalyticsCompletionForDate, getAnalyticsOutcomeOnDate);
  }, [selectedAnalyticsTask, getAnalyticsCompletionForDate, getAnalyticsOutcomeOnDate]);

  const analyticsByTaskId = useMemo(() => {
    const map = new Map();
    recurringTaskOptions.forEach(task => {
      map.set(task.id, computeYearToDateStats(task, getAnalyticsCompletionForDate, getAnalyticsOutcomeOnDate));
    });
    return map;
  }, [recurringTaskOptions, getAnalyticsCompletionForDate, getAnalyticsOutcomeOnDate]);

  const sortedGraphTasks = useMemo(() => {
    if (graphSort === "time") {
      // Keep native recurringTaskOptions order, which matches History ordering.
      return recurringTaskOptions;
    }

    const tasksForGraph = [...recurringTaskOptions];

    const getCompletionRate = task => {
      const taskAnalytics = analyticsByTaskId.get(task.id);
      if (!taskAnalytics || taskAnalytics.scheduled === 0) return null;
      return taskAnalytics.completionRate;
    };

    if (graphSort === "most-consistent") {
      tasksForGraph.sort((a, b) => {
        const aRate = getCompletionRate(a);
        const bRate = getCompletionRate(b);
        if (aRate === null && bRate === null) return a.title.localeCompare(b.title);
        if (aRate === null) return 1;
        if (bRate === null) return -1;
        if (bRate !== aRate) return bRate - aRate;
        return a.title.localeCompare(b.title);
      });
      return tasksForGraph;
    }

    if (graphSort === "least-consistent") {
      tasksForGraph.sort((a, b) => {
        const aRate = getCompletionRate(a);
        const bRate = getCompletionRate(b);
        if (aRate === null && bRate === null) return a.title.localeCompare(b.title);
        if (aRate === null) return 1;
        if (bRate === null) return -1;
        if (aRate !== bRate) return aRate - bRate;
        return a.title.localeCompare(b.title);
      });
      return tasksForGraph;
    }

    tasksForGraph.sort((a, b) => a.title.localeCompare(b.title));
    return tasksForGraph;
  }, [recurringTaskOptions, analyticsByTaskId, graphSort]);

  const activeGraphOrientation = graphOrientation || (isMobile ? "horizontal" : "vertical");

  const openTaskAnalytics = useCallback(taskId => {
    setTaskAnalyticsModal({
      open: true,
      selectedTaskId: taskId,
    });
  }, []);

  const closeTaskAnalytics = useCallback(() => {
    setTaskAnalyticsModal(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  // Toggle task expansion
  const toggleTaskExpansion = useCallback(taskId => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // View options for DateNavigation
  const viewOptions = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ];

  // Handle date navigation - memoized
  const handlePrevious = useCallback(() => {
    dispatch(setHistoryPage(page - 1));
  }, [dispatch, page]);

  const handleNext = useCallback(() => {
    dispatch(setHistoryPage(page + 1));
  }, [dispatch, page]);

  const handleToday = useCallback(() => {
    dispatch(setHistoryPage(0));
  }, [dispatch]);

  const handleViewChange = useCallback(
    value => {
      dispatch(setHistoryRange(value));
      dispatch(setHistoryPage(0));
    },
    [dispatch]
  );

  // Handle date change (not really used for range views, but required by DateNavigation)
  const handleDateChange = useCallback(() => {
    // For range views, date changes don't make sense, so we reset to page 0
    dispatch(setHistoryPage(0));
  }, [dispatch]);

  // Check if today is visible - memoized
  const isToday = useCallback(date => dayjs(date).isSame(dayjs(), "day"), []);

  // Handle cell update - memoized
  const handleCellUpdate = useCallback(
    async (task, date, data) => {
      const isScheduled = shouldShowOnDate(task, date, getOutcomeOnDate);

      // Special handling for Roll Over on scheduled days
      if (data.outcome === "rolled_over" && isScheduled) {
        await rolloverTask({ taskId: task.id, date }).unwrap();
        return;
      }

      if (!isScheduled) {
        // Off-schedule: Use the off-schedule API that creates task + completion
        await createOffScheduleCompletion({
          taskId: task.id,
          date,
          outcome: data.outcome,
          note: data.note,
          actualValue: data.actualValue,
        }).unwrap();
      } else {
        // Scheduled: Just create/update completion as before
        const existing = getCompletionForDate?.(task.id, date);
        if (existing) {
          await updateCompletion({ taskId: task.id, date, ...data }).unwrap();
        } else {
          await createCompletion({ taskId: task.id, date, ...data }).unwrap();
        }
      }
    },
    [
      getCompletionForDate,
      getOutcomeOnDate,
      createCompletion,
      updateCompletion,
      createOffScheduleCompletion,
      rolloverTask,
    ]
  );

  // Handle cell delete - memoized
  const handleCellDelete = useCallback(
    async (task, date) => {
      const isScheduled = shouldShowOnDate(task, date, getOutcomeOnDate);

      if (!isScheduled) {
        // Off-schedule: Delete both completion and the off-schedule task
        await deleteOffScheduleCompletion({
          taskId: task.id,
          date,
        }).unwrap();
      } else {
        // Scheduled: Just delete the completion
        await deleteCompletion({ taskId: task.id, date }).unwrap();
      }
    },
    [deleteCompletion, deleteOffScheduleCompletion, getOutcomeOnDate]
  );

  // Handle text modal open - memoized
  const handleOpenTextModal = useCallback((task, date, completion, isScheduled) => {
    setTextModal({ open: true, task, date, completion, isScheduled });
  }, []);

  // Handle text modal close - memoized
  const handleCloseTextModal = useCallback(() => {
    setTextModal({ open: false, task: null, date: null, completion: null, isScheduled: false });
  }, []);

  const handleCloseSleepModal = useCallback(() => {
    setSleepModal({ open: false, task: null, date: null, completion: null, isScheduled: false });
  }, []);

  const handleOpenWorkoutFromCell = useCallback(
    (task, date) => {
      const targetDate = dayjs(date).toDate();
      targetDate.setHours(0, 0, 0, 0);
      viewState.setTodayViewDate(targetDate);
      dialogState.handleBeginWorkout(task);
      handleCloseTextModal();
    },
    [dialogState, viewState, handleCloseTextModal]
  );

  const handleOpenSleepFromCell = useCallback(
    (task, date, completion, isScheduled) => {
      setSleepModal({
        open: true,
        task,
        date,
        completion,
        isScheduled,
      });
      handleCloseTextModal();
    },
    [handleCloseTextModal]
  );

  // Handle text modal save - memoized
  const handleTextModalSave = useCallback(
    async data => {
      if (textModal.task && textModal.date) {
        await handleCellUpdate(textModal.task, textModal.date, data);
        handleCloseTextModal();
      }
    },
    [textModal.task, textModal.date, handleCellUpdate, handleCloseTextModal]
  );

  // Handle text modal delete - memoized
  const handleTextModalDelete = useCallback(async () => {
    if (textModal.task && textModal.date) {
      await handleCellDelete(textModal.task, textModal.date);
      handleCloseTextModal();
    }
  }, [textModal.task, textModal.date, handleCellDelete, handleCloseTextModal]);

  const handleSleepModalSave = useCallback(
    async sleepData => {
      if (!sleepModal.task || !sleepModal.date) return;
      await handleCellUpdate(sleepModal.task, sleepModal.date, {
        outcome: "completed",
        selectedOptions: sleepData,
      });
    },
    [sleepModal.task, sleepModal.date, handleCellUpdate]
  );

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Stack
        direction="column"
        spacing={2}
        alignItems="stretch"
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
        flexWrap="wrap"
        useFlexGap
      >
        {/* Date Navigation */}
        <Box sx={{ width: "100%" }}>
          <DateNavigation
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            showDatePicker={true}
            showDateDisplay={true}
            showViewSelector={true}
            viewCollection={viewOptions}
            selectedView={range}
            onViewChange={handleViewChange}
            viewSelectorWidth="100px"
          />
        </Box>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => dispatch(setHistorySearchTerm(e.target.value))}
          sx={{ width: "100%" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Task count */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {totalTasks} recurring task{totalTasks !== 1 ? "s" : ""}
          </Typography>
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={historyView}
            onChange={(_, value) => {
              if (value) setHistoryView(value);
            }}
          >
            <ToggleButton value="table" sx={{ textTransform: "none", minWidth: 100, px: 1.5 }}>
              <TableChart fontSize="small" sx={{ mr: 0.5 }} />
              Table
            </ToggleButton>
            <ToggleButton value="graph" sx={{ textTransform: "none", minWidth: 100, px: 1.5 }}>
              <BarChart fontSize="small" sx={{ mr: 0.5 }} />
              Graph
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {historyView === "table" ? (
        <TableContainer sx={{ flex: 1, overflow: "auto" }}>
          <Table stickyHeader size="small">
            {/* Header Row - Date column + Section headers spanning task columns */}
            <TableHead>
              <TableRow>
                {/* Date column header */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 3,
                    bgcolor: "background.paper",
                    minWidth: 120,
                    borderRight: 1,
                    borderColor: "divider",
                  }}
                >
                  Date
                </TableCell>
                {/* Section headers spanning task columns */}
                {groupedTasks.map(({ section, tasks: sectionTasks }) => {
                  // Count all tasks including expanded subtasks
                  const taskCount = flattenTasksWithSubtasks(sectionTasks, deferredExpandedTaskIds).length;
                  return (
                    <TableCell
                      key={section.id}
                      colSpan={taskCount}
                      align="center"
                      sx={{
                        bgcolor: "action.hover",
                        fontWeight: 600,
                        borderRight: 1,
                        borderColor: "divider",
                      }}
                    >
                      {section.name} ({taskCount})
                    </TableCell>
                  );
                })}
              </TableRow>
              {/* Task name headers row */}
              <TableRow>
                {/* Empty cell for date column */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    borderRight: 1,
                    borderColor: "divider",
                  }}
                />
                {/* Task name headers */}
                {allTasks.map(task => {
                  const isLastInSection = isLastInSectionByTaskId.get(task.id) || false;

                  const hasSubtasks = task.subtasks?.length > 0;
                  const subtaskCount = task.subtasks?.length || 0;
                  const isExpanded = expandedTaskIds.has(task.id);
                  const isSubtask = task.depth > 0;

                  return (
                    <TableCell
                      key={task.id}
                      align="center"
                      onClick={() => openTaskAnalytics(task.id)}
                      sx={{
                        minWidth: 100,
                        maxWidth: 150,
                        p: 1,
                        borderRight: isLastInSection ? 1 : 0,
                        borderColor: "divider",
                        position: "relative",
                        pl: isSubtask ? 3 : 1,
                        bgcolor: isSubtask ? "action.hover" : "transparent",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-start">
                        {hasSubtasks ? (
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              toggleTaskExpansion(task.id);
                            }}
                            sx={{
                              p: 0.5,
                              minWidth: 24,
                              width: 24,
                              height: 24,
                              "&:hover": { bgcolor: "action.hover" },
                              color: "text.secondary",
                            }}
                            title={
                              isExpanded
                                ? `Collapse ${subtaskCount} subtask${subtaskCount !== 1 ? "s" : ""}`
                                : `Expand ${subtaskCount} subtask${subtaskCount !== 1 ? "s" : ""}`
                            }
                          >
                            {isExpanded ? (
                              <ExpandMore fontSize="small" sx={{ fontSize: "1rem" }} />
                            ) : (
                              <ChevronRight fontSize="small" sx={{ fontSize: "1rem" }} />
                            )}
                          </IconButton>
                        ) : (
                          <Box sx={{ width: 24 }} /> // Spacer for alignment
                        )}
                        <Tooltip title={task.title}>
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{
                              flex: 1,
                              cursor: "pointer",
                              fontWeight: isSubtask ? 400 : 500,
                            }}
                          >
                            {task.title}
                            {hasSubtasks && !isExpanded && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  ml: 0.5,
                                  color: "text.secondary",
                                  fontSize: "0.7rem",
                                }}
                              >
                                ({subtaskCount})
                              </Typography>
                            )}
                          </Typography>
                        </Tooltip>
                        {task.completionType === "workout" && (
                          <Tooltip title="Workout task">
                            <FitnessCenter fontSize="small" sx={{ opacity: 0.6, fontSize: "0.875rem" }} />
                          </Tooltip>
                        )}
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setTaskMenuAnchor(e.currentTarget);
                          }}
                          sx={{ p: 0.25 }}
                        >
                          <MoreVert fontSize="small" sx={{ fontSize: "0.875rem" }} />
                        </IconButton>
                      </Stack>
                      {(() => {
                        const taskAnalytics = analyticsByTaskId.get(task.id);
                        if (!taskAnalytics || taskAnalytics.scheduled === 0) {
                          return (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mt: 0.75, display: "block", textAlign: "left" }}
                            >
                              No schedule YTD
                            </Typography>
                          );
                        }

                        return (
                          <Tooltip
                            title={taskAnalytics.outcomeBreakdown
                              .map(
                                item => `${item.label}: ${item.count}/${taskAnalytics.scheduled} (${item.percentage}%)`
                              )
                              .join(" • ")}
                          >
                            <Box sx={{ mt: 0.75 }}>
                              <Box
                                sx={{
                                  height: 8,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  display: "flex",
                                  bgcolor: "action.hover",
                                }}
                              >
                                {taskAnalytics.outcomeBreakdown.map(item => (
                                  <Box
                                    key={`${task.id}-${item.key}`}
                                    sx={{
                                      width: `${item.percentage}%`,
                                      bgcolor: item.color,
                                      minWidth: item.count > 0 ? 2 : 0,
                                    }}
                                  />
                                ))}
                              </Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 0.25, display: "block", textAlign: "left" }}
                              >
                                {taskAnalytics.completed}/{taskAnalytics.scheduled} ({taskAnalytics.completionRate}%)
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            {/* Body - Date rows */}
            <TableBody>
              {dates.map(date => {
                const isTodayDate = isToday(date);

                return (
                  <TableRow key={date} hover={isTodayDate}>
                    {/* Date cell - sticky */}
                    <DateHeader date={date} isToday={isTodayDate} />

                    {/* Task completion cells */}
                    {allTasks.map(task => {
                      const completion = getCompletionForDate?.(task.id, date);
                      const isScheduled = scheduledByTaskDate.get(`${task.id}|${date}`) || false;
                      const isLastInSection = isLastInSectionByTaskId.get(task.id) || false;

                      return (
                        <MemoizedCompletionCell
                          key={`${task.id}-${date}`}
                          task={task}
                          date={date}
                          completion={completion}
                          isScheduled={isScheduled}
                          onCellUpdate={handleCellUpdate}
                          onCellDelete={handleCellDelete}
                          showRightBorder={isLastInSection}
                          onOpenTextModal={handleOpenTextModal}
                        />
                      );
                    })}
                  </TableRow>
                );
              })}

              {/* Empty State */}
              {groupedTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={allTasks.length + 1} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {deferredSearch ? "No matching tasks found" : "No recurring tasks"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {recurringTaskOptions.length === 0 ? (
            <Box sx={{ minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography color="text.secondary">
                {deferredSearch ? "No matching tasks found" : "No recurring tasks"}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                  Year-to-date completion percentages by recurring task
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <ToggleButtonGroup
                    size="small"
                    color="primary"
                    exclusive
                    value={activeGraphOrientation}
                    onChange={(_, value) => {
                      if (value) setGraphOrientation(value);
                    }}
                  >
                    <ToggleButton value="vertical" sx={{ textTransform: "none", minWidth: 120, px: 1.5 }}>
                      <SwapVert fontSize="small" sx={{ mr: 0.5 }} />
                      Vertical
                    </ToggleButton>
                    <ToggleButton value="horizontal" sx={{ textTransform: "none", minWidth: 120, px: 1.5 }}>
                      <SwapHoriz fontSize="small" sx={{ mr: 0.5 }} />
                      Horizontal
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    select
                    size="small"
                    label="Sort graph"
                    value={graphSort}
                    onChange={e => setGraphSort(e.target.value)}
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="time">Time (History order)</MenuItem>
                    <MenuItem value="name">Name (A-Z)</MenuItem>
                    <MenuItem value="most-consistent">Most consistent (highest complete %)</MenuItem>
                    <MenuItem value="least-consistent">Least consistent (lowest complete %)</MenuItem>
                  </TextField>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {OUTCOME_DEFINITIONS.map(item => (
                  <Stack key={`history-graph-legend-${item.key}`} direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color }} />
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              {activeGraphOrientation === "vertical" ? (
                <Box sx={{ overflowX: "auto", pb: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-end"
                    sx={{
                      minHeight: 380,
                      width: "fit-content",
                      minWidth: Math.max(sortedGraphTasks.length * 92, 640),
                    }}
                  >
                    {sortedGraphTasks.map(task => {
                      const taskAnalytics = analyticsByTaskId.get(task.id);
                      const noSchedule = !taskAnalytics || taskAnalytics.scheduled === 0;

                      return (
                        <Stack key={`graph-${task.id}`} spacing={1} alignItems="center" sx={{ width: 84, flexShrink: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {noSchedule ? "--" : `${taskAnalytics.completionRate}%`}
                          </Typography>
                          <Tooltip title={noSchedule ? `${task.title}: No schedule YTD` : ""} disableHoverListener={!noSchedule}>
                            <Box
                              onClick={() => openTaskAnalytics(task.id)}
                              sx={{
                                width: 44,
                                height: 260,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 1,
                                bgcolor: "action.hover",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column-reverse",
                                cursor: "pointer",
                                "&:hover": { borderColor: "primary.main", bgcolor: "action.selected" },
                              }}
                            >
                              {!noSchedule &&
                                taskAnalytics.outcomeBreakdown.map(item => (
                                  <Tooltip
                                    key={`${task.id}-graph-${item.key}`}
                                    title={`${item.label}: ${item.count}/${taskAnalytics.scheduled} (${item.percentage}%)`}
                                  >
                                    <Box
                                      sx={{
                                        width: "100%",
                                        height: `${Math.max(item.percentage, item.count > 0 ? 2 : 0)}%`,
                                        bgcolor: item.color,
                                      }}
                                    />
                                  </Tooltip>
                                ))}
                            </Box>
                          </Tooltip>
                          <Tooltip title={task.title}>
                            <Typography
                              variant="caption"
                              sx={{
                                width: "100%",
                                textAlign: "center",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                lineHeight: 1.2,
                                minHeight: 30,
                              }}
                            >
                              {task.title}
                            </Typography>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">
                            {noSchedule ? "No schedule" : `${taskAnalytics.completed}/${taskAnalytics.scheduled}`}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ overflowX: "auto", pb: 1 }}>
                  <Stack spacing={1.25} sx={{ minWidth: 340 }}>
                    {sortedGraphTasks.map(task => {
                      const taskAnalytics = analyticsByTaskId.get(task.id);
                      const noSchedule = !taskAnalytics || taskAnalytics.scheduled === 0;

                      return (
                        <Stack key={`graph-horizontal-${task.id}`} direction="row" spacing={1} alignItems="center">
                          <Tooltip title={task.title}>
                            <Typography
                              variant="caption"
                              sx={{
                                width: 110,
                                flexShrink: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {task.title}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={noSchedule ? `${task.title}: No schedule YTD` : ""} disableHoverListener={!noSchedule}>
                            <Box
                              onClick={() => openTaskAnalytics(task.id)}
                              sx={{
                                flex: 1,
                                minWidth: 180,
                                height: 20,
                                border: 1,
                                borderColor: "divider",
                                borderRadius: 999,
                                bgcolor: "action.hover",
                                overflow: "hidden",
                                display: "flex",
                                cursor: "pointer",
                                "&:hover": { borderColor: "primary.main", bgcolor: "action.selected" },
                              }}
                            >
                              {!noSchedule &&
                                taskAnalytics.outcomeBreakdown.map(item => (
                                  <Tooltip
                                    key={`${task.id}-horizontal-${item.key}`}
                                    title={`${item.label}: ${item.count}/${taskAnalytics.scheduled} (${item.percentage}%)`}
                                  >
                                    <Box
                                      sx={{
                                        width: `${item.percentage}%`,
                                        height: "100%",
                                        bgcolor: item.color,
                                        minWidth: item.count > 0 ? 2 : 0,
                                      }}
                                    />
                                  </Tooltip>
                                ))}
                            </Box>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary" sx={{ width: 74, textAlign: "right" }}>
                            {noSchedule ? "--" : `${taskAnalytics.completionRate}%`}
                          </Typography>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* Task Actions Menu */}
      <Menu anchorEl={taskMenuAnchor} open={Boolean(taskMenuAnchor)} onClose={() => setTaskMenuAnchor(null)}>
        {selectedTask &&
          [
            <MenuItem
              key="edit"
              onClick={() => {
                taskOps.handleEditTask(selectedTask);
                setTaskMenuAnchor(null);
              }}
            >
              <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>,
            selectedTask.completionType === "workout" && (
              <MenuItem
                key="edit-workout"
                onClick={() => {
                  taskOps.handleEditWorkout(selectedTask);
                  setTaskMenuAnchor(null);
                }}
              >
                <FitnessCenter fontSize="small" sx={{ mr: 1 }} /> Edit Workout
              </MenuItem>
            ),
            <MenuItem
              key="duplicate"
              onClick={() => {
                taskOps.handleDuplicateTask(selectedTask);
                setTaskMenuAnchor(null);
              }}
            >
              <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Duplicate
            </MenuItem>,
            <Divider key="divider" />,
            <MenuItem
              key="delete"
              onClick={() => {
                taskOps.handleDeleteTask(selectedTask.id);
                setTaskMenuAnchor(null);
              }}
              sx={{ color: "error.main" }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>,
          ].filter(Boolean)}
      </Menu>

      {/* Cell Editor Modal */}
      <Dialog
        open={textModal.open}
        onClose={handleCloseTextModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle>
          {textModal.task?.title}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {textModal.date ? dayjs(textModal.date).format("MMM D, YYYY") : ""}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: "auto" }}>
          {textModal.task && (
            <Box sx={{ "& > div": { pt: 0 } }}>
              <CellEditorPopover
                task={textModal.task}
                date={textModal.date}
                completion={textModal.completion}
                isScheduled={textModal.isScheduled}
                onSave={handleTextModalSave}
                onDelete={handleTextModalDelete}
                onClose={handleCloseTextModal}
                onOpenWorkout={
                  textModal.task?.completionType === "workout" && textModal.date
                    ? () => handleOpenWorkoutFromCell(textModal.task, textModal.date)
                    : null
                }
                onOpenSleep={
                  textModal.task?.completionType === "sleep" && textModal.date
                    ? () =>
                        handleOpenSleepFromCell(
                          textModal.task,
                          textModal.date,
                          textModal.completion,
                          textModal.isScheduled
                        )
                    : null
                }
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={taskAnalyticsModal.open} onClose={closeTaskAnalytics} fullWidth maxWidth="md">
        <DialogTitle>
          Recurring Task Consistency
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Year-to-date outcomes (Jan 1 through today)
          </Typography>
        </DialogTitle>
        <DialogContent>
          {recurringTaskOptions.length === 0 ? (
            <Typography color="text.secondary">No recurring tasks available.</Typography>
          ) : (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <TextField
                select
                label="Recurring Task"
                value={selectedAnalyticsTask?.id || ""}
                onChange={e =>
                  setTaskAnalyticsModal(prev => ({
                    ...prev,
                    selectedTaskId: e.target.value,
                  }))
                }
                fullWidth
              >
                {recurringTaskOptions.map(task => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.title}
                  </MenuItem>
                ))}
              </TextField>

              {analyticsYearToDate && (
                <>
                  <Box sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Year-to-date completion
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analyticsYearToDate.completionRate}%
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Scheduled days: {analyticsYearToDate.scheduled}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ minHeight: 220 }}>
                    {analyticsYearToDate.outcomeBreakdown.map(item => (
                      <Stack key={item.key} spacing={1} alignItems="center" sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {item.percentage}%
                        </Typography>
                        <Box
                          sx={{
                            width: "100%",
                            maxWidth: 96,
                            height: 140,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "flex-end",
                            overflow: "hidden",
                            bgcolor: "action.hover",
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              height: `${Math.max(item.percentage, item.count > 0 ? 4 : 0)}%`,
                              transition: "height 200ms ease",
                              bgcolor: item.color,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.count}/{analyticsYearToDate.scheduled}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Stack spacing={1}>
                    {analyticsYearToDate.outcomeBreakdown.map(item => (
                      <Stack
                        key={`${item.key}-legend`}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1 }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: item.color }} />
                          <Typography variant="body2">{item.label}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {item.count} ({item.percentage}%)
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <SleepCellEditDialog
        key={
          sleepModal.task?.id
            ? `${sleepModal.task.id}-${sleepModal.date}-${sleepModal.open ? "open" : "closed"}`
            : "sleep-cell-modal"
        }
        modal={sleepModal}
        onClose={handleCloseSleepModal}
        onSave={handleSleepModalSave}
      />
    </Box>
  );
}

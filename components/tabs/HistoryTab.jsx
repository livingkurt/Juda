"use client";

import { useState, useMemo, useDeferredValue, memo, useCallback } from "react";
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  Check,
  Close,
  FitnessCenter,
  Edit,
  ContentCopy,
  Delete,
  RadioButtonUnchecked,
  MoreVert,
  Search,
  SkipNext,
} from "@mui/icons-material";
import { shouldShowOnDate } from "@/lib/utils";
import WorkoutModal from "../WorkoutModal";
import { DateNavigation } from "../DateNavigation";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useUpdateCompletionMutation,
} from "@/lib/store/api/completionsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { AutosaveBadge } from "../AutosaveBadge";
import CellEditorPopover from "../CellEditorPopover";

// Flatten tasks including subtasks
const flattenTasks = tasks => {
  const result = [];
  const traverse = taskList => {
    taskList.forEach(task => {
      result.push(task);
      if (task.subtasks?.length > 0) {
        traverse(task.subtasks);
      }
    });
  };
  traverse(tasks);
  return result;
};

// Filter only recurring tasks
const getRecurringTasks = tasks => {
  const flatTasks = flattenTasks(tasks);
  return flatTasks.filter(t => t.recurrence?.type && t.recurrence.type !== "none" && t.completionType !== "note");
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
  onOpenWorkout,
  showRightBorder,
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

  const handleOpenWorkout = useCallback(() => {
    onOpenWorkout(task, date);
  }, [onOpenWorkout, task, date]);

  return (
    <CompletionCell
      task={task}
      date={date}
      completion={completion}
      isScheduled={isScheduled}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onOpenWorkout={handleOpenWorkout}
      showRightBorder={showRightBorder}
    />
  );
});

// Completion Cell Component
const CompletionCell = memo(function CompletionCell({
  task,
  date,
  completion,
  isScheduled,
  onUpdate,
  onDelete,
  onOpenWorkout,
  showRightBorder = false,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [textValue, setTextValue] = useState(completion?.note || completion?.actualValue || "");
  const [isEditing, setIsEditing] = useState(false);

  const outcome = completion?.outcome;
  const isTextType = task.completionType === "text" || task.completionType === "text_input";
  const isWorkoutType = task.completionType === "workout";

  // Cell background color
  const getCellBg = () => {
    if (!isScheduled && !completion) return "transparent";
    if (outcome === "completed") return theme.palette.success.dark + "40";
    if (outcome === "not_completed") return theme.palette.error.dark + "40";
    if (outcome === "rolled_over") return "#f59e0b40";
    if (isScheduled) return theme.palette.action.hover;
    return "transparent";
  };

  // Cell content
  const getCellContent = () => {
    if (task.completionType === "text_input" && completion?.actualValue) {
      return (
        <Typography variant="caption" noWrap sx={{ maxWidth: 60 }}>
          {completion.actualValue}
        </Typography>
      );
    }
    if (task.completionType === "text" && completion?.note) {
      return (
        <Typography variant="caption" noWrap sx={{ maxWidth: 60 }}>
          {completion.note}
        </Typography>
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

  // Save function wrapper
  const saveText = value => {
    if (value.trim()) {
      const data =
        task.completionType === "text_input"
          ? { outcome: "completed", actualValue: value }
          : { outcome: "completed", note: value };
      onUpdate(data);
    } else if (completion) {
      onDelete();
    }
  };

  const { debouncedSave, immediateSave, isSaving, justSaved } = useDebouncedSave(saveText, 500);

  const handleTextChange = e => {
    const newValue = e.target.value;
    setTextValue(newValue);
    debouncedSave(newValue);
  };

  const handleTextSave = useCallback(() => {
    // Save immediately on blur/enter
    immediateSave(textValue);
    setIsEditing(false);
  }, [immediateSave, textValue]);

  const handleWorkoutClick = useCallback(() => {
    const canOpen = isScheduled || completion;
    if (canOpen) {
      onOpenWorkout?.(task, date);
    }
  }, [isScheduled, completion, onOpenWorkout, task, date]);

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

  // Handle text input type - inline editing
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
          }}
          onClick={() => setIsEditing(true)}
        >
          {isEditing ? (
            <Box sx={{ position: "relative", width: "100%" }}>
              <AutosaveBadge isSaving={isSaving} justSaved={justSaved} position="top-right" size="sm" />
              <TextField
                size="small"
                value={textValue}
                onChange={handleTextChange}
                onBlur={handleTextSave}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    handleTextSave();
                  }
                }}
                autoFocus
                sx={{ width: "100%", "& .MuiInputBase-root": { fontSize: "0.75rem" } }}
              />
            </Box>
          ) : (
            getCellContent()
          )}
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
  // Get data from Redux
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { getCompletionForDate } = useCompletionHelpers();

  // Mutations
  const [createCompletion] = useCreateCompletionMutation();
  const [deleteCompletion] = useDeleteCompletionMutation();
  const [updateCompletion] = useUpdateCompletionMutation();

  // Task operations
  const taskOps = useTaskOperations();

  // State
  const [range, setRange] = useState("month");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [workoutModal, setWorkoutModal] = useState({ open: false, task: null, date: null });
  const [taskMenuAnchor, setTaskMenuAnchor] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Generate dates
  const dates = useMemo(() => generateDates(range, page), [range, page]);

  // Get the first date of the range for DateNavigation (or today if no dates)
  const selectedDate = useMemo(() => {
    if (dates.length === 0) return new Date();
    const firstDate = dayjs(dates[0]);
    return firstDate.toDate();
  }, [dates]);

  // Filter and group tasks
  const groupedTasks = useMemo(() => {
    let recurring = getRecurringTasks(tasks);

    // Search filter
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      recurring = recurring.filter(
        t => t.title?.toLowerCase().includes(q) || t.tags?.some(tag => tag.name.toLowerCase().includes(q))
      );
    }

    return groupTasksBySection(recurring, sections);
  }, [tasks, sections, deferredSearch]);

  // Flatten all tasks for column headers
  const allTasks = useMemo(() => {
    return groupedTasks.flatMap(g => g.tasks);
  }, [groupedTasks]);

  // Total task count
  const totalTasks = useMemo(() => {
    return groupedTasks.reduce((sum, g) => sum + g.tasks.length, 0);
  }, [groupedTasks]);

  // View options for DateNavigation
  const viewOptions = [
    { label: "Week", value: "week" },
    { label: "Month", value: "month" },
    { label: "Year", value: "year" },
  ];

  // Handle date navigation - memoized
  const handlePrevious = useCallback(() => {
    setPage(p => p - 1);
  }, []);

  const handleNext = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  const handleToday = useCallback(() => {
    setPage(0);
  }, []);

  const handleViewChange = useCallback(value => {
    setRange(value);
    setPage(0);
  }, []);

  // Handle date change (not really used for range views, but required by DateNavigation)
  const handleDateChange = useCallback(() => {
    // For range views, date changes don't make sense, so we reset to page 0
    setPage(0);
  }, []);

  // Check if today is visible - memoized
  const isToday = useCallback(date => dayjs(date).isSame(dayjs(), "day"), []);

  // Handle cell update - memoized
  const handleCellUpdate = useCallback(
    async (task, date, data) => {
      const existing = getCompletionForDate?.(task.id, date);
      if (existing) {
        await updateCompletion({ taskId: task.id, date, ...data }).unwrap();
      } else {
        await createCompletion({ taskId: task.id, date, ...data }).unwrap();
      }
    },
    [getCompletionForDate, createCompletion, updateCompletion]
  );

  // Handle cell delete - memoized
  const handleCellDelete = useCallback(
    async (task, date) => {
      await deleteCompletion({ taskId: task.id, date }).unwrap();
    },
    [deleteCompletion]
  );

  // Handle workout modal open - memoized
  const handleOpenWorkout = useCallback((task, date) => {
    setWorkoutModal({ open: true, task, date });
  }, []);

  // Handle workout modal close - memoized
  const handleCloseWorkout = useCallback(() => {
    setWorkoutModal({ open: false, task: null, date: null });
  }, []);

  // Handle workout completion - memoized
  const handleWorkoutComplete = useCallback(
    (taskId, date) => {
      const currentTask = workoutModal.task;
      if (currentTask) {
        handleCellUpdate(currentTask, date, { outcome: "completed" });
      }
      setWorkoutModal({ open: false, task: null, date: null });
    },
    [workoutModal.task, handleCellUpdate]
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
          onChange={e => setSearchQuery(e.target.value)}
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
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
          {totalTasks} recurring task{totalTasks !== 1 ? "s" : ""}
        </Typography>
      </Stack>

      {/* Table */}
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
              {groupedTasks.map(({ section, tasks: sectionTasks }) => (
                <TableCell
                  key={section.id}
                  colSpan={sectionTasks.length}
                  align="center"
                  sx={{
                    bgcolor: "action.hover",
                    fontWeight: 600,
                    borderRight: 1,
                    borderColor: "divider",
                  }}
                >
                  {section.name} ({sectionTasks.length})
                </TableCell>
              ))}
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
                // Check if this is the last task in its section
                const isLastInSection = (() => {
                  for (const group of groupedTasks) {
                    const taskIndexInSection = group.tasks.findIndex(t => t.id === task.id);
                    if (taskIndexInSection !== -1) {
                      return taskIndexInSection === group.tasks.length - 1;
                    }
                  }
                  return false;
                })();

                return (
                  <TableCell
                    key={task.id}
                    align="center"
                    sx={{
                      minWidth: 100,
                      maxWidth: 150,
                      p: 1,
                      borderRight: isLastInSection ? 1 : 0,
                      borderColor: "divider",
                      position: "relative",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
                      <Tooltip title={task.title}>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{
                            flex: 1,
                            cursor: "pointer",
                            "&:hover": { color: "primary.main" },
                          }}
                          onClick={() => taskOps.handleEditTask(task)}
                        >
                          {task.title}
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
                          setSelectedTask(task);
                          setTaskMenuAnchor(e.currentTarget);
                        }}
                        sx={{ p: 0.25 }}
                      >
                        <MoreVert fontSize="small" sx={{ fontSize: "0.875rem" }} />
                      </IconButton>
                    </Stack>
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
                    const isScheduled = shouldShowOnDate(task, date);
                    // Check if this is the last task in its section
                    const isLastInSection = (() => {
                      for (const group of groupedTasks) {
                        const taskIndexInSection = group.tasks.findIndex(t => t.id === task.id);
                        if (taskIndexInSection !== -1) {
                          return taskIndexInSection === group.tasks.length - 1;
                        }
                      }
                      return false;
                    })();

                    return (
                      <MemoizedCompletionCell
                        key={`${task.id}-${date}`}
                        task={task}
                        date={date}
                        completion={completion}
                        isScheduled={isScheduled}
                        onCellUpdate={handleCellUpdate}
                        onCellDelete={handleCellDelete}
                        onOpenWorkout={handleOpenWorkout}
                        showRightBorder={isLastInSection}
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

      {/* Task Actions Menu */}
      <Menu anchorEl={taskMenuAnchor} open={Boolean(taskMenuAnchor)} onClose={() => setTaskMenuAnchor(null)}>
        {selectedTask && (
          <>
            <MenuItem
              onClick={() => {
                taskOps.handleEditTask(selectedTask);
                setTaskMenuAnchor(null);
              }}
            >
              <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>
            {selectedTask.completionType === "workout" && (
              <MenuItem
                onClick={() => {
                  taskOps.handleEditWorkout(selectedTask);
                  setTaskMenuAnchor(null);
                }}
              >
                <FitnessCenter fontSize="small" sx={{ mr: 1 }} /> Edit Workout
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                taskOps.handleDuplicateTask(selectedTask);
                setTaskMenuAnchor(null);
              }}
            >
              <ContentCopy fontSize="small" sx={{ mr: 1 }} /> Duplicate
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                taskOps.handleDeleteTask(selectedTask.id);
                setTaskMenuAnchor(null);
              }}
              sx={{ color: "error.main" }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Workout Modal */}
      {workoutModal.task && (
        <WorkoutModal
          task={workoutModal.task}
          isOpen={workoutModal.open}
          onClose={handleCloseWorkout}
          onCompleteTask={handleWorkoutComplete}
          currentDate={workoutModal.date ? new Date(workoutModal.date) : new Date()}
        />
      )}
    </Box>
  );
}

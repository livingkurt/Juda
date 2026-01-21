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
  Dialog,
  DialogTitle,
  DialogContent,
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
  ExpandMore,
  ChevronRight,
} from "@mui/icons-material";
import { shouldShowOnDate } from "@/lib/utils";
import { DateNavigation } from "../DateNavigation";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetSectionsQuery } from "@/lib/store/api/sectionsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import {
  useCreateCompletionMutation,
  useDeleteCompletionMutation,
  useUpdateCompletionMutation,
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
  // Get data from Redux
  const { data: tasks = [] } = useGetTasksQuery();
  const { data: sections = [] } = useGetSectionsQuery();
  const { getCompletionForDate } = useCompletionHelpers();
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
  const [range, setRange] = useState("month");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
    return groupedTasks.flatMap(g => flattenTasksWithSubtasks(g.tasks, expandedTaskIds));
  }, [groupedTasks, expandedTaskIds]);

  // Total task count (including expanded subtasks)
  const totalTasks = useMemo(() => {
    return allTasks.length;
  }, [allTasks]);

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
      const isScheduled = shouldShowOnDate(task, date);

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
    [getCompletionForDate, createCompletion, updateCompletion, createOffScheduleCompletion, rolloverTask]
  );

  // Handle cell delete - memoized
  const handleCellDelete = useCallback(
    async (task, date) => {
      const isScheduled = shouldShowOnDate(task, date);

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
    [deleteCompletion, deleteOffScheduleCompletion]
  );

  // Handle text modal open - memoized
  const handleOpenTextModal = useCallback((task, date, completion, isScheduled) => {
    setTextModal({ open: true, task, date, completion, isScheduled });
  }, []);

  // Handle text modal close - memoized
  const handleCloseTextModal = useCallback(() => {
    setTextModal({ open: false, task: null, date: null, completion: null, isScheduled: false });
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
              {groupedTasks.map(({ section, tasks: sectionTasks }) => {
                // Count all tasks including expanded subtasks
                const taskCount = flattenTasksWithSubtasks(sectionTasks, expandedTaskIds).length;
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
                // Check if this is the last task in its section
                const isLastInSection = (() => {
                  // Find which section this task belongs to
                  for (const group of groupedTasks) {
                    const sectionTasks = flattenTasksWithSubtasks(group.tasks, expandedTaskIds);
                    const indexInSection = sectionTasks.findIndex(t => t.id === task.id);
                    if (indexInSection !== -1) {
                      return indexInSection === sectionTasks.length - 1;
                    }
                  }
                  return false;
                })();

                const hasSubtasks = task.subtasks?.length > 0;
                const subtaskCount = task.subtasks?.length || 0;
                const isExpanded = expandedTaskIds.has(task.id);
                const isSubtask = task.depth > 0;

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
                      pl: isSubtask ? 3 : 1,
                      bgcolor: isSubtask ? "action.hover" : "transparent",
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
                            "&:hover": { color: "primary.main" },
                            fontWeight: isSubtask ? 400 : 500,
                          }}
                          onClick={() => taskOps.handleEditTask(task)}
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
                      // Find which section this task belongs to
                      for (const group of groupedTasks) {
                        const sectionTasks = flattenTasksWithSubtasks(group.tasks, expandedTaskIds);
                        const indexInSection = sectionTasks.findIndex(t => t.id === task.id);
                        if (indexInSection !== -1) {
                          return indexInSection === sectionTasks.length - 1;
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
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

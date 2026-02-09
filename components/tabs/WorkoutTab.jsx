"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  Box,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Grid,
  TextField,
  CircularProgress,
} from "@mui/material";
import { FitnessCenter, Edit } from "@mui/icons-material";
import { useWorkoutTasks } from "@/hooks/useWorkoutTasks";
import { useGetWorkoutHistoryQuery } from "@/lib/store/api/workoutProgramsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useViewState } from "@/hooks/useViewState";
import {
  setSelectedWorkoutTaskId,
  setWorkoutViewMode,
  setWorkoutDateRange,
  setEditingWorkoutTask,
} from "@/lib/store/slices/uiSlice";
import { WorkoutProgressCalendar } from "@/components/WorkoutProgressCalendar";
import { WorkoutExerciseProgress } from "@/components/WorkoutExerciseProgress";

const getWeekFromStart = (startDate, checkDate, totalWeeks) => {
  if (!startDate) return 1;
  const start = dayjs(startDate);
  const current = dayjs(checkDate);
  const daysDiff = current.startOf("day").diff(start.startOf("day"), "day");
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  if (!totalWeeks) return Math.max(1, weekNumber);
  return Math.min(Math.max(1, weekNumber), totalWeeks);
};

const buildSummaryStats = (completions, task, totalWeeks) => {
  const today = dayjs();
  const currentWeek = getWeekFromStart(task?.recurrence?.startDate, today, totalWeeks);

  const sessionDays = completions.filter(day => day.totalSets > 0);
  const totalSessions = sessionDays.length;
  const averageCompletion = sessionDays.length
    ? Math.round(
        (sessionDays.reduce((sum, day) => {
          if (!day.totalSets) return sum;
          return sum + day.completedSets / day.totalSets;
        }, 0) /
          sessionDays.length) *
          100
      )
    : 0;

  const sortedDates = [...sessionDays].sort((a, b) => (a.date < b.date ? 1 : -1));
  let streak = 0;
  let cursor = today.startOf("day");
  for (const day of sortedDates) {
    const dayDate = dayjs(day.date);
    if (dayDate.isAfter(cursor, "day")) continue;
    if (dayDate.isSame(cursor, "day")) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
      continue;
    }
    const diff = cursor.diff(dayDate, "day");
    if (diff === 1) {
      streak += 1;
      cursor = cursor.subtract(1, "day");
      continue;
    }
    break;
  }

  return { currentWeek, totalSessions, averageCompletion, streak };
};

const getProgramStartDate = (task, startDate, completions) => {
  if (startDate) return startDate;
  if (task?.recurrence?.startDate) return task.recurrence.startDate;
  if (completions?.length) return completions[0].date;
  return null;
};

const buildCycleOptions = (program, programStartDate) => {
  if (!program?.cycles?.length) return [];
  let weekCursor = 1;
  return program.cycles.map(cycle => {
    const weeks = cycle.numberOfWeeks || 1;
    const startWeek = weekCursor;
    const endWeek = weekCursor + weeks - 1;
    const startDate = programStartDate ? dayjs(programStartDate).add((startWeek - 1) * 7, "day") : null;
    const endDate = programStartDate ? dayjs(programStartDate).add(endWeek * 7 - 1, "day") : null;
    weekCursor += weeks;
    return {
      id: cycle.id,
      name: cycle.name || `Cycle ${cycle.order + 1}`,
      order: cycle.order,
      numberOfWeeks: weeks,
      startWeek,
      endWeek,
      startDate,
      endDate,
    };
  });
};

const buildExerciseIndex = cycle => {
  const index = new Map();
  if (!cycle?.sections?.length) return index;
  cycle.sections.forEach(section => {
    section.days?.forEach(day => {
      day.exercises?.forEach(exercise => {
        index.set(exercise.id, {
          ...exercise,
          sectionName: section.name,
          dayName: day.name,
        });
      });
    });
  });
  return index;
};

const getTargetForWeek = (exercise, cycleWeek) => {
  if (!exercise) return { targetValue: "", targetUnit: "" };
  const progression = exercise.weeklyProgression?.find(item => item.week === cycleWeek);
  const targetValue = progression?.targetValue ?? exercise.targetValue ?? "";
  return { targetValue, targetUnit: exercise.unit || "" };
};

const formatValueWithUnit = (value, unit) => {
  if (value === null || value === undefined || value === "") return "";
  return unit ? `${value} ${unit}` : `${value}`;
};

const formatActualValue = set => {
  const parts = [];
  if (set.actualValue !== null && set.actualValue !== undefined) {
    parts.push(formatValueWithUnit(set.actualValue, set.unit));
  }
  if (set.time) parts.push(`time ${set.time}`);
  if (set.distance !== null && set.distance !== undefined) {
    parts.push(`distance ${formatValueWithUnit(set.distance, set.unit)}`);
  }
  if (set.pace) parts.push(`pace ${set.pace}`);
  return parts.join(" | ");
};

const toCsvValue = value => {
  if (value === null || value === undefined) return "";
  const stringValue = `${value}`;
  if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCycleCsv = ({ program, cycleOption, completions, programStartDate, totalWeeks }) => {
  const rows = [];
  const cycle = program?.cycles?.find(item => item.id === cycleOption.id);
  const exerciseIndex = buildExerciseIndex(cycle);

  const rangeStart = cycleOption.startDate ? cycleOption.startDate.startOf("day") : null;
  const rangeEnd = cycleOption.endDate ? cycleOption.endDate.endOf("day") : null;

  const cycleCompletions = completions.filter(day => {
    if (!rangeStart || !rangeEnd) return true;
    const current = dayjs(day.date);
    return (
      (current.isAfter(rangeStart) || current.isSame(rangeStart, "day")) &&
      (current.isBefore(rangeEnd) || current.isSame(rangeEnd, "day"))
    );
  });

  rows.push(["Cycle", cycleOption.name]);
  rows.push(["Cycle Weeks", `${cycleOption.startWeek}-${cycleOption.endWeek}`]);
  rows.push([
    "Cycle Dates",
    cycleOption.startDate && cycleOption.endDate
      ? `${cycleOption.startDate.format("YYYY-MM-DD")} to ${cycleOption.endDate.format("YYYY-MM-DD")}`
      : "Unknown",
  ]);
  rows.push(["Total Sessions", `${cycleCompletions.length}`]);
  rows.push([]);

  rows.push([
    "Cycle",
    "Cycle Week",
    "Date",
    "Session Outcome",
    "Section",
    "Day",
    "Exercise",
    "Set #",
    "Target",
    "Actual",
    "Set Outcome",
    "Session Note",
  ]);

  if (!cycleCompletions.length) {
    rows.push([cycleOption.name, "", "", "No completion data for this cycle", "", "", "", "", "", "", "", ""]);
  }

  cycleCompletions.forEach(day => {
    const overallWeek = programStartDate ? getWeekFromStart(programStartDate, day.date, totalWeeks) : null;
    const cycleWeek = overallWeek ? overallWeek - cycleOption.startWeek + 1 : "";
    if (day.exercises?.length) {
      day.exercises.forEach(exercise => {
        const details = exerciseIndex.get(exercise.exerciseId);
        const target = getTargetForWeek(details, cycleWeek);
        const targetLabel = formatValueWithUnit(target.targetValue, target.targetUnit);
        if (exercise.sets?.length) {
          exercise.sets.forEach(set => {
            rows.push([
              cycleOption.name,
              cycleWeek,
              day.date,
              day.outcome || "",
              details?.sectionName || "",
              details?.dayName || "",
              details?.name || exercise.exerciseName || "Unknown exercise",
              set.setNumber,
              targetLabel,
              formatActualValue(set),
              set.outcome || "",
              day.note || "",
            ]);
          });
        } else {
          rows.push([
            cycleOption.name,
            cycleWeek,
            day.date,
            day.outcome || "",
            details?.sectionName || "",
            details?.dayName || "",
            details?.name || exercise.exerciseName || "Unknown exercise",
            "",
            targetLabel,
            "",
            "",
            day.note || "",
          ]);
        }
      });
    } else {
      rows.push([cycleOption.name, cycleWeek, day.date, day.outcome || "", "", "", "", "", "", "", "", day.note || ""]);
    }
  });

  return rows.map(row => row.map(toCsvValue).join(",")).join("\n");
};

// Removed WorkoutOption - using inline MenuItems instead

export function WorkoutTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();
  const dialogState = useDialogState();
  const viewState = useViewState();
  // Use dedicated workout endpoint (much faster - pre-filtered by API)
  const { data: workoutTasks = [] } = useWorkoutTasks();

  const selectedWorkoutTaskId = useSelector(state => state.ui.selectedWorkoutTaskId);
  const workoutViewMode = useSelector(state => state.ui.workoutViewMode);
  const workoutDateRange = useSelector(state => state.ui.workoutDateRange);
  const selectedTask = workoutTasks.find(task => task.id === selectedWorkoutTaskId) || workoutTasks[0] || null;
  const hasInitializedRef = useRef(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState("");

  // Only set default selection once when workoutTasks first loads
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (workoutTasks.length > 0) {
      if (!selectedWorkoutTaskId) {
        dispatch(setSelectedWorkoutTaskId(workoutTasks[0].id));
      }
      hasInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selectedWorkoutTaskId, workoutTasks.length]);

  const startDate = workoutDateRange?.start || null;
  const endDate = workoutDateRange?.end || null;

  const { data: workoutHistory, isLoading: historyLoading } = useGetWorkoutHistoryQuery(
    { taskId: selectedWorkoutTaskId, startDate, endDate },
    { skip: !selectedWorkoutTaskId }
  );

  const completions = workoutHistory?.completions || [];
  const program = workoutHistory?.program || null;
  const totalWeeks = program?.cycles
    ? program.cycles.reduce((sum, cycle) => sum + (cycle.numberOfWeeks || 1), 0)
    : program?.numberOfWeeks || 1;
  const stats = buildSummaryStats(completions, selectedTask, totalWeeks);
  const programStartDate = getProgramStartDate(selectedTask, startDate, completions);
  const cycleOptions = buildCycleOptions(program, programStartDate);

  const handleStartWorkout = () => {
    if (!selectedTask) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    viewState.setTodayViewDate(today);
    dialogState.handleBeginWorkout(selectedTask);
  };

  const handleEditWorkout = () => {
    if (!selectedTask) return;
    dispatch(setEditingWorkoutTask(selectedTask));
  };

  const handleOpenExport = () => {
    setExportDialogOpen(true);
    const hasSelection = cycleOptions.some(cycle => cycle.id === selectedCycleId);
    if ((!selectedCycleId || !hasSelection) && cycleOptions.length) {
      setSelectedCycleId(cycleOptions[0].id);
    }
  };

  const handleExport = () => {
    const cycleOption = cycleOptions.find(cycle => cycle.id === selectedCycleId);
    if (!cycleOption) return;
    const csvContent = buildCycleCsv({
      program,
      cycleOption,
      completions,
      programStartDate,
      totalWeeks,
    });
    const fileNameBase = `${selectedTask?.title || "workout"}-${cycleOption.name}-cycle`.replace(/[^a-z0-9_-]+/gi, "_");
    const filename = `${fileNameBase}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  };

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!workoutTasks.length) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <Stack spacing={2} alignItems="center">
          <FitnessCenter sx={{ fontSize: 48, color: "text.secondary" }} />
          <Typography variant="h6">No workout tasks found</Typography>
          <Typography variant="body2" color="text.secondary">
            Create a workout task to see progress here.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Stack direction="column" spacing={2} alignItems="stretch" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="workout-select-label">Workout</InputLabel>
            <Select
              labelId="workout-select-label"
              label="Workout"
              value={selectedWorkoutTaskId || ""}
              onChange={e => {
                dispatch(setSelectedWorkoutTaskId(e.target.value));
              }}
            >
              {workoutTasks.map(task => (
                <MenuItem key={task.id} value={task.id}>
                  {task.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="outlined" startIcon={<Edit />} onClick={handleEditWorkout}>
              Edit Workout
            </Button>
            <Button variant="outlined" onClick={handleOpenExport}>
              Export Cycle
            </Button>
            <Button variant="contained" startIcon={<FitnessCenter />} onClick={handleStartWorkout}>
              Start Today&apos;s Workout
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate || ""}
            onChange={event =>
              dispatch(
                setWorkoutDateRange({
                  start: event.target.value || null,
                  end: endDate || null,
                })
              )
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate || ""}
            onChange={event =>
              dispatch(
                setWorkoutDateRange({
                  start: startDate || null,
                  end: event.target.value || null,
                })
              )
            }
            InputLabelProps={{ shrink: true }}
          />
          <ToggleButtonGroup
            value={workoutViewMode}
            exclusive
            onChange={(event, value) => {
              if (value) dispatch(setWorkoutViewMode(value));
            }}
            size="small"
          >
            <ToggleButton value="calendar">Calendar</ToggleButton>
            <ToggleButton value="exercises">Exercises</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Summary */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Current Week
                </Typography>
                <Typography variant="h6">Week {stats.currentWeek}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Total Sessions
                </Typography>
                <Typography variant="h6">{stats.totalSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Avg Completion
                </Typography>
                <Typography variant="h6">{stats.averageCompletion}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Current Streak
                </Typography>
                <Typography variant="h6">{stats.streak} days</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {historyLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : workoutViewMode === "calendar" ? (
          <WorkoutProgressCalendar
            completions={completions}
            task={selectedTask}
            program={program}
            startDate={startDate}
            endDate={endDate}
            onDateSelect={date => {
              viewState.setTodayViewDate(date);
              dialogState.handleBeginWorkout(selectedTask);
            }}
          />
        ) : (
          <WorkoutExerciseProgress
            program={program}
            completions={completions}
            task={selectedTask}
            startDate={startDate}
          />
        )}
      </Box>

      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Cycle</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Choose which cycle you want to export.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="cycle-select-label">Cycle</InputLabel>
            <Select
              labelId="cycle-select-label"
              label="Cycle"
              value={selectedCycleId}
              onChange={event => setSelectedCycleId(event.target.value)}
              disabled={!cycleOptions.length}
            >
              {cycleOptions.map(cycle => (
                <MenuItem key={cycle.id} value={cycle.id}>
                  {cycle.name} · Weeks {cycle.startWeek}-{cycle.endWeek}
                  {cycle.startDate && cycle.endDate
                    ? ` (${cycle.startDate.format("MMM D")} - ${cycle.endDate.format("MMM D")})`
                    : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!cycleOptions.length && (
            <Typography variant="body2" color="text.secondary">
              No cycles available to export for this workout.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleExport} disabled={!selectedCycleId || !cycleOptions.length}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

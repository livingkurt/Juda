"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  Box,
  Stack,
  Typography,
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
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
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

// Removed WorkoutOption - using inline MenuItems instead

export function WorkoutTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();
  const dialogState = useDialogState();
  const viewState = useViewState();
  const { data: tasks = [] } = useGetTasksQuery();

  const selectedWorkoutTaskId = useSelector(state => state.ui.selectedWorkoutTaskId);
  const workoutViewMode = useSelector(state => state.ui.workoutViewMode);
  const workoutDateRange = useSelector(state => state.ui.workoutDateRange);

  const workoutTasks = tasks.filter(task => task.completionType === "workout");
  const selectedTask = workoutTasks.find(task => task.id === selectedWorkoutTaskId) || workoutTasks[0] || null;
  const hasInitializedRef = useRef(false);

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
  const totalWeeks = program?.numberOfWeeks || 1;
  const stats = buildSummaryStats(completions, selectedTask, totalWeeks);

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
    </Box>
  );
}

"use client";

import { useEffect, useMemo, memo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { Hotel, Edit } from "@mui/icons-material";
import { DateNavigation } from "@/components/DateNavigation";
import { setSleepView, setSleepSelectedDate } from "@/lib/store/slices/uiSlice";
import { useGetCompletionsByDateRangeQuery, useCreateCompletionMutation } from "@/lib/store/api/completionsApi";
import { useGetRecurringTasksQuery } from "@/lib/store/api/tasksApi";

// Helper to format sleep time
const formatSleepTime = isoString => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Helper to format duration
const formatDuration = minutes => {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getDurationMinutes = (sleepData = {}) => {
  if (Number.isFinite(sleepData.durationHours) || Number.isFinite(sleepData.durationMinutesPart)) {
    const hours = Number.isFinite(sleepData.durationHours) ? sleepData.durationHours : 0;
    const minutesPart = Number.isFinite(sleepData.durationMinutesPart) ? sleepData.durationMinutesPart : 0;
    return Math.max(0, Math.floor(hours) * 60 + Math.floor(minutesPart));
  }

  if (Number.isFinite(sleepData.durationMinutes)) {
    return Math.max(0, Math.floor(sleepData.durationMinutes));
  }

  return 0;
};

const getDurationParts = (sleepData = {}) => {
  if (Number.isFinite(sleepData.durationHours) || Number.isFinite(sleepData.durationMinutesPart)) {
    const hours = Number.isFinite(sleepData.durationHours) ? Math.max(0, Math.floor(sleepData.durationHours)) : 0;
    const minutesPart = Number.isFinite(sleepData.durationMinutesPart)
      ? Math.max(0, Math.floor(sleepData.durationMinutesPart))
      : 0;
    return { hours, minutesPart };
  }

  const totalMinutes = getDurationMinutes(sleepData);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutesPart: totalMinutes % 60,
  };
};

const formatTimeInput = isoString => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const buildSleepIso = (completionDate, timeValue, isStart) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const base = dayjs(completionDate).startOf("day");
  let dateTime = base.hour(hours).minute(minutes).second(0).millisecond(0);

  // Sleep start after 6pm usually belongs to the previous day.
  if (isStart && hours >= 18) {
    dateTime = dateTime.subtract(1, "day");
  }

  return dateTime.toISOString();
};

const SleepEditDialog = memo(function SleepEditDialog({ open, onClose, initialDate, initialData, onSave }) {
  const duration = getDurationParts(initialData || {});
  const [sleepStart, setSleepStart] = useState(formatTimeInput(initialData?.sleepStart));
  const [sleepEnd, setSleepEnd] = useState(formatTimeInput(initialData?.sleepEnd));
  const [durationHours, setDurationHours] = useState(String(duration.hours || 0));
  const [durationMinutesPart, setDurationMinutesPart] = useState(String(duration.minutesPart || 0));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const nextDuration = getDurationParts(initialData || {});
    setSleepStart(formatTimeInput(initialData?.sleepStart));
    setSleepEnd(formatTimeInput(initialData?.sleepEnd));
    setDurationHours(String(nextDuration.hours || 0));
    setDurationMinutesPart(String(nextDuration.minutesPart || 0));
  }, [open, initialData, initialDate]);

  const handleSave = async () => {
    const parsedHours = Number(durationHours);
    const parsedMinutes = Number(durationMinutesPart);
    const normalizedHours = Number.isFinite(parsedHours) && parsedHours >= 0 ? Math.floor(parsedHours) : 0;
    let normalizedMinutes = Number.isFinite(parsedMinutes) && parsedMinutes >= 0 ? Math.floor(parsedMinutes) : 0;
    const extraHours = Math.floor(normalizedMinutes / 60);
    normalizedMinutes %= 60;

    setSaving(true);
    try {
      await onSave({
        date: dayjs(initialDate).format("YYYY-MM-DD"),
        sleepData: {
          sleepStart: buildSleepIso(initialDate, sleepStart, true),
          sleepEnd: buildSleepIso(initialDate, sleepEnd, false),
          durationHours: normalizedHours + extraHours,
          durationMinutesPart: normalizedMinutes,
          source: initialData?.source || "manual",
        },
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Sleep</DialogTitle>
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
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// Helper to get sleep quality based on duration
const getSleepQuality = (minutes, targetMinutes = 8 * 60) => {
  if (!minutes) return null;
  const ratio = minutes / targetMinutes;
  if (ratio >= 0.9) return { label: "Good", color: "success" };
  if (ratio >= 0.7) return { label: "Fair", color: "warning" };
  return { label: "Poor", color: "error" };
};

// Day view component
const SleepDayView = memo(function SleepDayView({ selectedDate, sleepCompletions, onEdit }) {
  const dateStr = selectedDate.format("YYYY-MM-DD");
  const completion = sleepCompletions.find(c => dayjs(c.date).format("YYYY-MM-DD") === dateStr);

  const sleepData = completion?.selectedOptions || {};
  const durationMinutes = getDurationMinutes(sleepData);
  const quality = getSleepQuality(durationMinutes);

  if (!completion) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Hotel sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No sleep data for {selectedDate.format("MMMM D, YYYY")}
          </Typography>
          <Button sx={{ mt: 2 }} variant="outlined" startIcon={<Edit fontSize="small" />} onClick={() => onEdit(null)}>
            Add Sleep Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Hotel sx={{ color: "primary.main" }} />
                <Typography variant="h6">Sleep Summary - {selectedDate.format("MMMM D, YYYY")}</Typography>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Edit fontSize="small" />}
                onClick={() => onEdit(completion)}
              >
                Edit
              </Button>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sleep Start
                  </Typography>
                  <Typography variant="h5">{formatSleepTime(sleepData.sleepStart)}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Wake Up
                  </Typography>
                  <Typography variant="h5">{formatSleepTime(sleepData.sleepEnd)}</Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h5">{formatDuration(durationMinutes)}</Typography>
                    {quality && (
                      <Typography
                        variant="body2"
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: `${quality.color}.light`,
                          color: `${quality.color}.contrastText`,
                          fontWeight: 500,
                        }}
                      >
                        {quality.label}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Grid>
            </Grid>

            {sleepData.source && (
              <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                <Typography variant="caption" color="text.secondary">
                  Source: {sleepData.source === "apple_health" ? "Apple Health" : sleepData.source}
                </Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
});

// Week/Month/Year view component
const SleepListView = memo(function SleepListView({ selectedDate, sleepCompletions, viewType, onEdit }) {
  const getDateRange = () => {
    switch (viewType) {
      case "week":
        return {
          start: selectedDate.startOf("week"),
          end: selectedDate.endOf("week"),
        };
      case "month":
        return {
          start: selectedDate.startOf("month"),
          end: selectedDate.endOf("month"),
        };
      case "year":
        return {
          start: selectedDate.startOf("year"),
          end: selectedDate.endOf("year"),
        };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const { start, end } = getDateRange();
  const filteredCompletions = sleepCompletions.filter(completion => {
    const date = dayjs(completion.date);
    return date.isBetween(start, end, null, "[]");
  });

  const sortedCompletions = [...filteredCompletions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedCompletions.length === 0) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Hotel sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No sleep data for this {viewType}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate stats
  const totalSleep = sortedCompletions.reduce(
    (sum, completion) => sum + getDurationMinutes(completion.selectedOptions || {}),
    0
  );
  const avgSleep = Math.round(totalSleep / sortedCompletions.length);

  return (
    <Box sx={{ mt: 2 }}>
      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Sessions
              </Typography>
              <Typography variant="h6">{sortedCompletions.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Avg Duration
              </Typography>
              <Typography variant="h6">{formatDuration(avgSleep)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Total Sleep
              </Typography>
              <Typography variant="h6">{formatDuration(totalSleep)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sleep list */}
      <Card>
        <List>
          {sortedCompletions.map((completion, index) => {
            const date = dayjs(completion.date);
            const sleepData = completion.selectedOptions || {};
            const durationMinutes = getDurationMinutes(sleepData);
            const quality = getSleepQuality(durationMinutes);

            return (
              <div key={completion.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="subtitle1" sx={{ minWidth: 120 }}>
                          {date.format("MMM D, YYYY")}
                        </Typography>
                        <Stack direction="row" spacing={3} sx={{ flex: 1 }}>
                          <Typography variant="body2">
                            {formatSleepTime(sleepData.sleepStart)} → {formatSleepTime(sleepData.sleepEnd)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatDuration(durationMinutes)}
                          </Typography>
                          {quality && (
                            <Typography
                              variant="caption"
                              sx={{
                                px: 1,
                                py: 0.25,
                                borderRadius: 1,
                                bgcolor: `${quality.color}.light`,
                                color: `${quality.color}.contrastText`,
                                fontWeight: 500,
                              }}
                            >
                              {quality.label}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    }
                    secondary={
                      sleepData.source === "apple_health"
                        ? "Apple Health"
                        : sleepData.source === "manual"
                          ? "Manual entry"
                          : sleepData.source
                    }
                  />
                  <IconButton edge="end" size="small" onClick={() => onEdit(completion)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </ListItem>
              </div>
            );
          })}
        </List>
      </Card>
    </Box>
  );
});

export const SleepTab = memo(function SleepTab({ isLoading: tabLoading }) {
  const dispatch = useDispatch();
  const [createCompletion] = useCreateCompletionMutation();
  const [editingCompletion, setEditingCompletion] = useState(null);

  // Get state from Redux
  const sleepView = useSelector(state => state.ui.sleepView || "day");
  const sleepSelectedDateISO = useSelector(state => state.ui.sleepSelectedDate);

  // Convert ISO string to dayjs object
  const selectedDate = useMemo(() => {
    if (sleepSelectedDateISO) {
      return dayjs(sleepSelectedDateISO);
    }
    return dayjs();
  }, [sleepSelectedDateISO]);

  // Get sleep tasks
  const { data: allTasks = [] } = useGetRecurringTasksQuery();
  const sleepTasks = allTasks.filter(task => task.completionType === "sleep");
  const sleepTask = sleepTasks[0] || null;

  // Get completions for sleep tasks
  const { data: completionsData = [], isLoading: completionsLoading } = useGetCompletionsByDateRangeQuery(
    {
      startDate: selectedDate.subtract(1, "year").format("YYYY-MM-DD"),
      endDate: selectedDate.add(1, "month").format("YYYY-MM-DD"),
    },
    { skip: sleepTasks.length === 0 }
  );

  // Filter completions to only sleep tasks
  const sleepCompletions = useMemo(() => {
    const sleepTaskIds = new Set(sleepTasks.map(t => t.id));
    const data = Array.isArray(completionsData) ? completionsData : completionsData?.completions || [];
    return data.filter(c => sleepTaskIds.has(c.taskId));
  }, [completionsData, sleepTasks]);

  const selectedDateCompletion = useMemo(() => {
    const key = selectedDate.format("YYYY-MM-DD");
    return sleepCompletions.find(c => dayjs(c.date).format("YYYY-MM-DD") === key) || null;
  }, [sleepCompletions, selectedDate]);

  // Initialize Redux state from URL on mount if not set
  useEffect(() => {
    if (!sleepSelectedDateISO) {
      dispatch(setSleepSelectedDate(dayjs().toISOString()));
    }
  }, [dispatch, sleepSelectedDateISO]);

  // Navigate dates
  const handleDateChange = date => {
    dispatch(setSleepSelectedDate(dayjs(date).toISOString()));
  };

  const handlePrev = () => {
    let newDate;
    if (sleepView === "day") {
      newDate = selectedDate.subtract(1, "day");
    } else if (sleepView === "week") {
      newDate = selectedDate.subtract(1, "week");
    } else if (sleepView === "month") {
      newDate = selectedDate.subtract(1, "month");
    } else if (sleepView === "year") {
      newDate = selectedDate.subtract(1, "year");
    }
    dispatch(setSleepSelectedDate(newDate.toISOString()));
  };

  const handleNext = () => {
    let newDate;
    if (sleepView === "day") {
      newDate = selectedDate.add(1, "day");
    } else if (sleepView === "week") {
      newDate = selectedDate.add(1, "week");
    } else if (sleepView === "month") {
      newDate = selectedDate.add(1, "month");
    } else if (sleepView === "year") {
      newDate = selectedDate.add(1, "year");
    }
    dispatch(setSleepSelectedDate(newDate.toISOString()));
  };

  const handleToday = () => {
    dispatch(setSleepSelectedDate(dayjs().toISOString()));
  };

  const handleOpenEditor = completion => {
    if (completion) {
      setEditingCompletion({
        date: dayjs(completion.date).format("YYYY-MM-DD"),
        sleepData: completion.selectedOptions || {},
      });
      return;
    }

    setEditingCompletion({
      date: selectedDate.format("YYYY-MM-DD"),
      sleepData: {},
    });
  };

  const handleSaveSleepEdit = async ({ date, sleepData }) => {
    if (!sleepTask?.id) return;

    await createCompletion({
      taskId: sleepTask.id,
      date,
      outcome: "completed",
      selectedOptions: sleepData,
      completedAt: new Date().toISOString(),
    }).unwrap();
  };

  if (tabLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!sleepTask) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
        <Stack spacing={2} alignItems="center">
          <Hotel sx={{ fontSize: 48, color: "text.secondary" }} />
          <Typography variant="h6">No sleep task found</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Create a task with completion type &quot;Sleep&quot; to track your sleep here.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Hotel sx={{ color: "primary.main" }} />
          <Typography variant="h5" component="h1">
            Sleep Tracking
          </Typography>
          {sleepTask && (
            <Typography variant="body2" color="text.secondary">
              ({sleepTask.title})
            </Typography>
          )}
        </Stack>

        <ToggleButtonGroup
          value={sleepView}
          exclusive
          onChange={(event, value) => {
            if (value) dispatch(setSleepView(value));
          }}
          size="small"
        >
          <ToggleButton value="day">Day</ToggleButton>
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Date Navigation */}
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <DateNavigation
          selectedDate={selectedDate.toDate()}
          onDateChange={handleDateChange}
          onPrevious={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {completionsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : sleepView === "day" ? (
          <SleepDayView selectedDate={selectedDate} sleepCompletions={sleepCompletions} onEdit={handleOpenEditor} />
        ) : (
          <SleepListView
            selectedDate={selectedDate}
            sleepCompletions={sleepCompletions}
            viewType={sleepView}
            onEdit={handleOpenEditor}
          />
        )}
      </Box>
      <SleepEditDialog
        open={Boolean(editingCompletion)}
        onClose={() => setEditingCompletion(null)}
        initialDate={editingCompletion?.date || selectedDate.format("YYYY-MM-DD")}
        initialData={editingCompletion?.sleepData || selectedDateCompletion?.selectedOptions || {}}
        onSave={handleSaveSleepEdit}
      />
    </Box>
  );
});

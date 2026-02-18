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
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { Hotel, TrendingUp } from "@mui/icons-material";
import { DateNavigation } from "@/components/DateNavigation";
import { setSleepView, setSleepSelectedDate } from "@/lib/store/slices/uiSlice";
import { useGetCompletionsByDateRangeQuery } from "@/lib/store/api/completionsApi";
import { useGetRecurringTasksQuery } from "@/lib/store/api/tasksApi";

// Helper to format sleep time
const formatSleepTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper to format duration
const formatDuration = (minutes) => {
  if (!minutes) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Helper to get sleep quality based on duration
const getSleepQuality = (minutes, targetMinutes = 8 * 60) => {
  if (!minutes) return null;
  const ratio = minutes / targetMinutes;
  if (ratio >= 0.9) return { label: "Good", color: "success" };
  if (ratio >= 0.7) return { label: "Fair", color: "warning" };
  return { label: "Poor", color: "error" };
};

// Day view component
const SleepDayView = memo(({ selectedDate, sleepCompletions, sleepTask }) => {
  const dateStr = selectedDate.format("YYYY-MM-DD");
  const completion = sleepCompletions.find(c => 
    dayjs(c.date).format("YYYY-MM-DD") === dateStr
  );
  
  const sleepData = completion?.selectedOptions || {};
  const quality = getSleepQuality(sleepData.durationMinutes);

  if (!completion) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Hotel sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No sleep data for {selectedDate.format("MMMM D, YYYY")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Hotel sx={{ color: "primary.main" }} />
              <Typography variant="h6">
                Sleep Summary - {selectedDate.format("MMMM D, YYYY")}
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Sleep Start
                  </Typography>
                  <Typography variant="h5">
                    {formatSleepTime(sleepData.sleepStart)}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Wake Up
                  </Typography>
                  <Typography variant="h5">
                    {formatSleepTime(sleepData.sleepEnd)}
                  </Typography>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h5">
                      {formatDuration(sleepData.durationMinutes)}
                    </Typography>
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
const SleepListView = memo(({ selectedDate, sleepCompletions, viewType }) => {
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

  const sortedCompletions = [...filteredCompletions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

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
  const totalSleep = sortedCompletions.reduce((sum, completion) => 
    sum + (completion.selectedOptions?.durationMinutes || 0), 0
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
            const quality = getSleepQuality(sleepData.durationMinutes);

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
                            {formatDuration(sleepData.durationMinutes)}
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
                      sleepData.source === "apple_health" ? "Apple Health" : 
                      sleepData.source === "manual" ? "Manual entry" : sleepData.source
                    }
                  />
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
  const sleepTaskIds = new Set(sleepTasks.map(t => t.id));
  const sleepCompletions = useMemo(() => {
    const data = Array.isArray(completionsData) ? completionsData : completionsData?.completions || [];
    return data.filter(c => sleepTaskIds.has(c.taskId));
  }, [completionsData, sleepTaskIds]);

  // Initialize Redux state from URL on mount if not set
  useEffect(() => {
    if (!sleepSelectedDateISO) {
      dispatch(setSleepSelectedDate(dayjs().toISOString()));
    }
  }, [dispatch, sleepSelectedDateISO]);

  // Navigate dates
  const handleDateChange = (date) => {
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
            Create a task with completion type "Sleep" to track your sleep here.
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
          currentDate={selectedDate.toDate()}
          view={sleepView}
          onDateChange={handleDateChange}
          onPrev={handlePrev}
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
          <SleepDayView
            selectedDate={selectedDate}
            sleepCompletions={sleepCompletions}
            sleepTask={sleepTask}
          />
        ) : (
          <SleepListView
            selectedDate={selectedDate}
            sleepCompletions={sleepCompletions}
            viewType={sleepView}
          />
        )}
      </Box>
    </Box>
  );
});
"use client";

import dayjs from "dayjs";
import { Box, Stack, Typography, Tooltip, ButtonBase, useTheme } from "@mui/material";
import { shouldShowOnDate } from "@/lib/utils";

const getCellStyle = (outcome, isScheduled, isFuture, theme) => {
  // 1. If not scheduled → always transparent (regardless of future/past or outcome)
  if (!isScheduled) {
    return { bgcolor: "transparent", color: "text.secondary" };
  }

  // 2. Check completion outcome (only for scheduled days)
  if (outcome === "completed") {
    return { bgcolor: theme.palette.success.dark + "40", color: "success.contrastText" };
  }
  if (outcome === "not_completed") {
    return { bgcolor: theme.palette.error.dark + "40", color: "error.contrastText" };
  }
  if (outcome === "rolled_over") {
    return { bgcolor: "#f59e0b40", color: "warning.contrastText" };
  }

  // 3. Scheduled but no completion:
  //    - Future dates → greyed out
  //    - Past dates → light hover (not done yet)
  if (isFuture) {
    return { bgcolor: "action.hover", color: "text.secondary", opacity: 0.5 };
  }
  return { bgcolor: "action.hover", color: "text.secondary" };
};

const getWorkoutWeek = (date, programStartDate, totalWeeks) => {
  if (!programStartDate) return null;
  const start = dayjs(programStartDate).startOf("day");
  const current = dayjs(date).startOf("day");
  const daysDiff = current.diff(start, "day");
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  if (weekNumber < 1) return null;
  if (totalWeeks && weekNumber > totalWeeks) return null;
  return weekNumber;
};

export function WorkoutProgressCalendar({ completions, task, program, startDate, endDate, onDateSelect }) {
  const theme = useTheme();
  const completionMap = new Map(completions.map(day => [day.date, day]));
  const today = dayjs().startOf("day");

  // Get program start date from task recurrence
  const programStartDate = task?.recurrence?.startDate || null;
  const totalWeeks = program?.cycles
    ? program.cycles.reduce((sum, cycle) => sum + (cycle.numberOfWeeks === 0 ? 0 : cycle.numberOfWeeks || 1), 0)
    : program?.numberOfWeeks || null;

  // Get all unique dates from completions and scheduled dates
  const allDates = new Set();

  // Add completion dates
  completions.forEach(day => {
    allDates.add(day.date);
  });

  // Add scheduled dates within the range
  if (task && programStartDate) {
    const rangeStart = startDate ? dayjs(startDate) : dayjs(programStartDate);
    const rangeEnd = endDate ? dayjs(endDate) : dayjs().add(totalWeeks ? totalWeeks * 7 : 28, "day");

    let cursor = rangeStart.startOf("day");
    while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, "day")) {
      if (shouldShowOnDate(task, cursor.toDate())) {
        allDates.add(cursor.format("YYYY-MM-DD"));
      }
      cursor = cursor.add(1, "day");
    }
  }

  // Group dates by workout week
  const weeksMap = new Map();
  Array.from(allDates).forEach(dateStr => {
    const weekNumber = getWorkoutWeek(dateStr, programStartDate, totalWeeks);
    if (weekNumber === null) return;

    if (!weeksMap.has(weekNumber)) {
      weeksMap.set(weekNumber, []);
    }
    weeksMap.get(weekNumber).push(dayjs(dateStr));
  });

  // Calculate current week
  const currentWeek = getWorkoutWeek(today, programStartDate, totalWeeks);

  // Generate all weeks from 1 to current week (not future weeks)
  if (totalWeeks && programStartDate && currentWeek) {
    for (let weekNum = 1; weekNum <= currentWeek; weekNum++) {
      if (!weeksMap.has(weekNum)) {
        weeksMap.set(weekNum, []);
      }
    }
  }

  // Sort weeks in descending order (latest week at top) and days within each week
  // Filter to only show current week and below (no future weeks)
  const weeks = Array.from(weeksMap.entries())
    .filter(([weekNumber]) => !currentWeek || weekNumber <= currentWeek)
    .sort((a, b) => b[0] - a[0]) // Reverse sort: highest week number first
    .map(([weekNumber, dates]) => ({
      weekNumber,
      dates: dates.sort((a, b) => a.diff(b, "day")),
    }));

  // Fill in missing days in each week (Mon-Sun)
  const getWeekStart = date => {
    const day = date.day();
    const diff = day === 0 ? -6 : 1 - day;
    return date.add(diff, "day");
  };

  const filledWeeks = weeks.map(({ weekNumber, dates }) => {
    // Calculate week start date based on program start date and week number
    let weekStart;
    if (dates.length > 0) {
      // Use first date in the week if available
      weekStart = getWeekStart(dates[0]);
    } else if (programStartDate && totalWeeks) {
      // Calculate week start from program start date
      const start = dayjs(programStartDate).startOf("day");
      const weekOffset = (weekNumber - 1) * 7;
      const weekStartDate = start.add(weekOffset, "day");
      weekStart = getWeekStart(weekStartDate);
    } else {
      // Fallback: return empty days if we can't calculate
      return { weekNumber, days: [] };
    }

    const days = [];
    for (let i = 0; i < 7; i += 1) {
      const day = weekStart.add(i, "day");
      days.push(day);
    }

    return { weekNumber, days };
  });

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "120px repeat(7, minmax(0, 1fr))", gap: 1 }}>
        <Box /> {/* Empty cell for week label column */}
        {weekdayLabels.map(label => (
          <Typography key={label} variant="caption" color="text.secondary" align="center">
            {label}
          </Typography>
        ))}
      </Box>
      {filledWeeks.map(({ weekNumber, days }) => (
        <Box key={weekNumber} sx={{ display: "grid", gridTemplateColumns: "120px repeat(7, minmax(0, 1fr))", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              Week {weekNumber}
            </Typography>
          </Box>
          {days.map(day => {
            const dateKey = day.format("YYYY-MM-DD");
            const dayDate = day.startOf("day");
            const isFuture = dayDate.isAfter(today, "day");
            const completion = completionMap.get(dateKey);
            const outcome = completion?.outcome || null;
            const isScheduled = task ? shouldShowOnDate(task, day.toDate()) : false;
            const percent = completion?.totalSets
              ? Math.round((completion.completedSets / completion.totalSets) * 100)
              : null;
            const cellStyle = getCellStyle(outcome, isScheduled, isFuture, theme);

            // Match History tab tooltip logic
            let tooltipLabel;
            if (isFuture) {
              tooltipLabel = `${dateKey} · Upcoming`;
            } else if (outcome === "completed") {
              tooltipLabel = `${dateKey} · Completed`;
            } else if (outcome === "not_completed") {
              tooltipLabel = `${dateKey} · Not completed`;
            } else if (outcome === "rolled_over") {
              tooltipLabel = `${dateKey} · Rolled over`;
            } else if (isScheduled) {
              tooltipLabel = `${dateKey} · Scheduled (not completed)`;
            } else {
              tooltipLabel = `${dateKey} · Not scheduled`;
            }

            return (
              <Tooltip key={dateKey} title={tooltipLabel}>
                <ButtonBase
                  onClick={() => {
                    if (!task) return;
                    const dateValue = day.toDate();
                    dateValue.setHours(0, 0, 0, 0);
                    onDateSelect?.(dateValue);
                  }}
                  sx={{
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    py: 1,
                    px: 0.5,
                    textAlign: "center",
                    minHeight: 56,
                    ...cellStyle,
                  }}
                >
                  <Box>
                    <Typography variant="caption" display="block">
                      {day.format("D")}
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {outcome === "completed"
                        ? "✓"
                        : outcome === "not_completed"
                          ? "✗"
                          : outcome === "rolled_over"
                            ? "→"
                            : percent !== null
                              ? `${percent}%`
                              : "--"}
                    </Typography>
                  </Box>
                </ButtonBase>
              </Tooltip>
            );
          })}
        </Box>
      ))}
      {filledWeeks.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary">No workout data to display</Typography>
        </Box>
      )}
    </Stack>
  );
}

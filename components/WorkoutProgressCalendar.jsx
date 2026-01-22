"use client";

import dayjs from "dayjs";
import { Box, Stack, Typography, Tooltip, ButtonBase, useTheme } from "@mui/material";
import { shouldShowOnDate } from "@/lib/utils";

const getCellStyle = (outcome, isScheduled, isFuture, theme) => {
  // Future dates should be greyed out (scheduled but not yet due)
  if (isFuture) {
    return { bgcolor: "action.hover", color: "text.secondary", opacity: 0.5 };
  }

  // Match History tab logic EXACTLY:
  // 1. If not scheduled and no completion → transparent
  if (!isScheduled && !outcome) {
    return { bgcolor: "transparent", color: "text.secondary" };
  }

  // 2. Check completion outcome
  if (outcome === "completed") {
    return { bgcolor: theme.palette.success.dark + "40", color: "success.contrastText" };
  }
  if (outcome === "not_completed") {
    return { bgcolor: theme.palette.error.dark + "40", color: "error.contrastText" };
  }
  if (outcome === "rolled_over") {
    return { bgcolor: "#f59e0b40", color: "warning.contrastText" };
  }

  // 3. If scheduled but no completion → light hover (not done yet)
  if (isScheduled) {
    return { bgcolor: "action.hover", color: "text.secondary" };
  }

  // 4. Default → transparent
  return { bgcolor: "transparent", color: "text.secondary" };
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
  const totalWeeks = program?.numberOfWeeks || null;

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

  // Sort weeks and days within each week
  const weeks = Array.from(weeksMap.entries())
    .sort((a, b) => a[0] - b[0])
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
    if (dates.length === 0) return { weekNumber, days: [] };

    const firstDate = dates[0];
    const weekStart = getWeekStart(firstDate);

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

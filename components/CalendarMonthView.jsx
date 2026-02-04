"use client";

import { useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Box } from "@mui/material";
import { shouldShowOnDate } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { TaskCardCompact } from "./shared/TaskCardCompact";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useViewState } from "@/hooks/useViewState";
import { setCalendarView } from "@/lib/store/slices/uiSlice";

export const CalendarMonthView = ({ date, tasks = [] }) => {
  const dispatch = useDispatch();
  const viewState = useViewState();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const zoom = preferences.calendarZoom?.month || 1.0;
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar || {};
  const showCompleted = showCompletedTasksCalendar.month !== false;

  // Use hooks directly (they use Redux internally)
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Tasks provided by parent

  const year = date.getFullYear();
  const month = date.getMonth();

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const result = [];
    const current = new Date(startDate);
    while (current <= lastDay || result.length < 6) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
      if (result.length >= 6) break;
    }
    return result;
  }, [year, month]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pre-compute tasks for each day to avoid filtering on every render
  const tasksByDate = useMemo(() => {
    const map = new Map();
    const allDays = weeks.flat();
    allDays.forEach(day => {
      const dateKey = day.toDateString();
      let dayTasks = tasks.filter(t => shouldShowOnDate(t, day, getOutcomeOnDate));
      // Filter out completed/not completed tasks if showCompleted is false
      if (!showCompleted) {
        dayTasks = dayTasks.filter(task => {
          const isCompleted = isCompletedOnDate(task.id, day);
          const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
          const hasOutcome = outcome !== null && outcome !== undefined;
          return !isCompleted && !hasOutcome;
        });
      }
      // Limit to 3 tasks per day for display
      map.set(dateKey, dayTasks.slice(0, 3));
    });
    return map;
  }, [weeks, tasks, showCompleted, isCompletedOnDate, getOutcomeOnDate]);

  const handleDayClick = useCallback(
    d => {
      viewState.setSelectedDate(d);
      dispatch(setCalendarView("day"));
    },
    [viewState, dispatch]
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "auto",
      }}
    >
      {/* Day of week headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {DAYS_OF_WEEK.map(day => (
          <Box
            key={day.value}
            sx={{
              textAlign: "center",
              py: 2,
              fontSize: { xs: "0.75rem", md: "0.875rem" },
              fontWeight: 500,
              color: "text.secondary",
              borderRight: 1,
              borderColor: "divider",
              "&:last-child": {
                borderRight: 0,
              },
            }}
          >
            {day.label}
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
          flex: 1,
          minHeight: 0,
        }}
      >
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            const isCurrentMonth = day.getMonth() === month;
            const isToday = day.toDateString() === today.toDateString();
            const dayTasks = tasksByDate.get(day.toDateString()) || [];

            return (
              <Box
                key={`${wi}-${di}`}
                sx={{
                  borderRight: di < 6 ? 1 : 0,
                  borderBottom: wi < weeks.length - 1 ? 1 : 0,
                  borderColor: "divider",
                  p: 1,
                  minHeight: `${80 * zoom}px`,
                  cursor: "pointer",
                  bgcolor: isToday ? "action.selected" : !isCurrentMonth ? "action.disabledBackground" : "transparent",
                  opacity: isCurrentMonth ? 1 : 0.4,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  // Highlight today with a border
                  ...(isToday && {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: "-2px",
                    zIndex: 1,
                  }),
                  "&:hover": {
                    bgcolor: isToday ? "action.selected" : "action.hover",
                  },
                }}
                onClick={e => {
                  // Only navigate to day if clicking on the cell background, not a task
                  if (e.target === e.currentTarget || e.target.tagName === "SPAN") {
                    handleDayClick(day);
                  }
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontSize: {
                      xs: zoom >= 1.5 ? "0.875rem" : zoom >= 1.0 ? "0.75rem" : "0.625rem",
                      md: zoom >= 1.5 ? "1rem" : zoom >= 1.0 ? "0.875rem" : "0.75rem",
                    },
                    mb: 0.5,
                    display: "inline-block",
                    bgcolor: isToday ? "primary.main" : "transparent",
                    color: isToday ? "primary.contrastText" : !isCurrentMonth ? "text.secondary" : "text.primary",
                    borderRadius: "50%",
                    width: 24 * zoom,
                    height: 24 * zoom,
                    lineHeight: `${24 * zoom}px`,
                    textAlign: "center",
                    fontWeight: isToday ? 600 : 400,
                    boxShadow: isToday ? 1 : "none",
                  }}
                >
                  {day.getDate()}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, overflow: "hidden" }}>
                  {dayTasks.map(task => {
                    const isCompleted = isCompletedOnDate(task.id, day);
                    const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;

                    return (
                      <TaskCardCompact
                        key={task.id}
                        task={task}
                        date={day}
                        zoom={zoom}
                        isCompleted={isCompleted}
                        outcome={outcome}
                      />
                    );
                  })}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default CalendarMonthView;

"use client";

import { useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Box, Flex, SimpleGrid } from "@mantine/core";
import { shouldShowOnDate } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { TaskCardCompact } from "./shared/TaskCardCompact";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useViewState } from "@/hooks/useViewState";
import { setCalendarView } from "@/lib/store/slices/uiSlice";

export const CalendarMonthView = ({ date }) => {
  const dispatch = useDispatch();
  const viewState = useViewState();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const zoom = preferences.calendarZoom?.month || 1.0;
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar || {};
  const showCompleted = showCompletedTasksCalendar.month !== false;

  // Use hooks directly (they use Redux internally)
  const completionHandlers = useCompletionHandlers();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Get all tasks
  const tasks = taskFilters.tasks;

  const { mode, calendar } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const dayHeaderColor = mode.text.muted;
  const nonCurrentMonthBg = mode.bg.subtle;

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

  const handleDayClick = useCallback(
    d => {
      viewState.setSelectedDate(d);
      dispatch(setCalendarView("day"));
    },
    [viewState, dispatch]
  );

  return (
    <Flex direction="column" style={{ height: "100%", width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <SimpleGrid
        cols={7}
        style={{
          borderBottomWidth: "1px",
          borderBottomColor: borderColor,
          borderBottomStyle: "solid",
          background: bgColor,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {DAYS_OF_WEEK.map(day => (
          <Box
            key={day.value}
            style={{
              textAlign: "center",
              paddingTop: 8,
              paddingBottom: 8,
              fontSize: "var(--mantine-font-size-sm)",
              fontWeight: 500,
              color: dayHeaderColor,
            }}
          >
            {day.label}
          </Box>
        ))}
      </SimpleGrid>
      <Box style={{ flex: 1 }}>
        {weeks.map((week, wi) => (
          <SimpleGrid
            key={wi}
            cols={7}
            style={{
              borderBottomWidth: "1px",
              borderBottomColor: borderColor,
              borderBottomStyle: "solid",
            }}
          >
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = day.toDateString() === today.toDateString();
              let dayTasks = tasks.filter(t => shouldShowOnDate(t, day));
              // Filter out completed/not completed tasks if showCompleted is false
              if (!showCompleted) {
                dayTasks = dayTasks.filter(task => {
                  const isCompleted = isCompletedOnDate(task.id, day);
                  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
                  const hasOutcome = outcome !== null && outcome !== undefined;
                  return !isCompleted && !hasOutcome;
                });
              }
              dayTasks = dayTasks.slice(0, 3);
              return (
                <Box
                  key={di}
                  style={{
                    borderTopWidth: isToday ? "1.5px" : "1px",
                    borderBottomWidth: isToday ? "1.5px" : "1px",
                    borderLeftWidth: isToday ? "1.5px" : "1px",
                    borderRightWidth: isToday ? "1.5px" : "1px",
                    borderColor: isToday ? calendar.today : borderColor,
                    borderStyle: "solid",
                    padding: 4,
                    minHeight: `${80 * zoom}px`,
                    cursor: "pointer",
                    background: isToday ? calendar.todayBg : !isCurrentMonth ? nonCurrentMonthBg : "transparent",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = isToday ? calendar.todayBg : hoverBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = isToday
                      ? calendar.todayBg
                      : !isCurrentMonth
                        ? nonCurrentMonthBg
                        : "transparent";
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
                    style={{
                      fontSize:
                        zoom >= 1.5
                          ? "var(--mantine-font-size-md)"
                          : zoom >= 1.0
                            ? "var(--mantine-font-size-sm)"
                            : "var(--mantine-font-size-xs)",
                      marginBottom: 4,
                      display: "inline-block",
                      background: isToday ? calendar.today : "transparent",
                      color: isToday ? mode.text.inverse : !isCurrentMonth ? mutedText : textColor,
                      borderRadius: "50%",
                      width: `${24 * zoom}px`,
                      height: `${24 * zoom}px`,
                      lineHeight: `${24 * zoom}px`,
                      textAlign: "center",
                      fontWeight: isToday ? 600 : 400,
                      boxShadow: isToday ? "var(--mantine-shadow-sm)" : "none",
                    }}
                  >
                    {day.getDate()}
                  </Box>
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
              );
            })}
          </SimpleGrid>
        ))}
      </Box>
    </Flex>
  );
};

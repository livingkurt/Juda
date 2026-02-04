"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { useDispatch } from "react-redux";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate, calculateTaskPositions } from "@/lib/utils";
import { HOUR_HEIGHT_WEEK } from "@/lib/calendarConstants";
import { DayHeaderColumn } from "./DayHeaderColumn";
import { TimedColumn } from "./TimedColumn";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useViewState } from "@/hooks/useViewState";
import { setCalendarView } from "@/lib/store/slices/uiSlice";

const BASE_HOUR_HEIGHT = HOUR_HEIGHT_WEEK;

// Memoized task filtering function to avoid repeated shouldShowOnDate calls
const filterTasksForDay = (tasks, day, showCompleted, isCompletedOnDate, getOutcomeOnDate) => {
  const result = { timed: [], untimed: [] };

  for (const task of tasks) {
    // Check if task should show on this date
    if (!task.time && !shouldShowOnDate(task, day)) continue;
    if (task.time && !shouldShowOnDate(task, day)) continue;

    // Check completion status if needed
    if (!showCompleted) {
      const isCompleted = isCompletedOnDate(task.id, day);
      const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
      const hasOutcome = outcome !== null && outcome !== undefined;
      if (isCompleted || hasOutcome) continue;
    }

    // Sort into timed/untimed
    if (task.time) {
      result.timed.push(task);
    } else {
      result.untimed.push(task);
    }
  }

  return result;
};

export const CalendarWeekView = ({
  date,
  tasks = [],
  createDroppableId: _createDroppableId,
  createDraggableId,
  onDropTimeChange,
}) => {
  const dispatch = useDispatch();
  const viewState = useViewState();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const zoom = preferences.calendarZoom?.week || 1.0;
  const showStatusTasks = preferences.showStatusTasks?.week !== false;
  const showCompletedTasksCalendar = preferences.showCompletedTasksCalendar || {};
  const showCompleted = showCompletedTasksCalendar.week !== false;

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Tasks provided by parent

  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoom;

  // Calculate week days - memoized to prevent recalculation on every render
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [date]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const containerRef = useRef(null);
  const headerRef = useRef(null);

  // Find today's index in the week
  const todayIndex = weekDays.findIndex(day => day.toDateString() === today.toDateString());
  const isTodayInWeek = todayIndex !== -1;

  // Auto-scroll to current time on mount if today is in the week
  useEffect(() => {
    if (!isTodayInWeek || !containerRef.current) return;

    const scrollToCurrentTime = () => {
      if (!containerRef.current) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const scrollPosition = (currentMinutes / 60) * HOUR_HEIGHT - containerRef.current.clientHeight / 2;

      // Scroll smoothly to current time, centered in viewport
      containerRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    };

    // Small delay to ensure container is rendered and has correct dimensions
    const timeoutId = setTimeout(scrollToCurrentTime, 200);
    return () => clearTimeout(timeoutId);
  }, [isTodayInWeek, HOUR_HEIGHT, weekDays]);

  // Pre-compute ALL tasks for each day in a single pass (OPTIMIZED)
  // This reduces shouldShowOnDate calls from 2N*7 to N*7 (50% reduction)
  // and combines timed/untimed filtering into one loop
  const tasksByDay = useMemo(() => {
    const timedMap = new Map();
    const untimedMap = new Map();
    const positionedMap = new Map();

    // Pre-populate maps with empty arrays for each day
    weekDays.forEach(day => {
      const dateKey = day.toDateString();
      timedMap.set(dateKey, []);
      untimedMap.set(dateKey, []);
    });

    // Single pass through all tasks, filtering for all days at once
    weekDays.forEach(day => {
      const dateKey = day.toDateString();
      const filtered = filterTasksForDay(tasks, day, showCompleted, isCompletedOnDate, getOutcomeOnDate);
      timedMap.set(dateKey, filtered.timed);
      untimedMap.set(dateKey, filtered.untimed);

      // Calculate positions immediately for timed tasks
      positionedMap.set(dateKey, calculateTaskPositions(filtered.timed));
    });

    return { timedMap, untimedMap, positionedMap };
  }, [weekDays, tasks, showCompleted, isCompletedOnDate, getOutcomeOnDate]);

  const getUntimedTasksForDay = useCallback(
    day => {
      return tasksByDay.untimedMap.get(day.toDateString()) || [];
    },
    [tasksByDay]
  );

  const getTaskStyle = useCallback(
    (task, positionedTask) => {
      const minutes = timeToMinutes(task.time);
      const duration = task.duration ?? 30;
      const isNoDuration = duration === 0;
      return {
        top: `${(minutes / 60) * HOUR_HEIGHT}px`,
        height: `${isNoDuration ? 24 : Math.max((duration / 60) * HOUR_HEIGHT, 18)}px`,
        left: positionedTask?.left || "0%",
        width: positionedTask?.width || "100%",
      };
    },
    [HOUR_HEIGHT]
  );

  // Stable lookup function for positioned tasks (OPTIMIZED)
  const getPositionedTasksForDay = useCallback(
    day => {
      return tasksByDay.positionedMap.get(day.toDateString()) || [];
    },
    [tasksByDay]
  );

  const handleColumnClick = useCallback(
    (e, day) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = snapToIncrement((y / HOUR_HEIGHT) * 60, 15);
      taskOps.handleCreateTaskFromCalendar(minutesToTime(minutes), day);
    },
    [HOUR_HEIGHT, taskOps]
  );

  const handleDropTimeCalculation = useCallback(
    (e, rect) => {
      const y = e.clientY - rect.top;
      const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60)));
      const snappedMinutes = snapToIncrement(minutes, 15);
      if (onDropTimeChange) {
        onDropTimeChange(minutesToTime(snappedMinutes));
      }
    },
    [HOUR_HEIGHT, onDropTimeChange]
  );

  const handleDayClick = useCallback(
    d => {
      viewState.setSelectedDate(d);
      dispatch(setCalendarView("day"));
    },
    [viewState, dispatch]
  );

  // Sync horizontal scroll between header and main container
  useEffect(() => {
    const container = containerRef.current;
    const header = headerRef.current;
    if (!container || !header) return;

    const handleScroll = () => {
      // Sync header horizontal scroll with container
      header.scrollLeft = container.scrollLeft;
    };

    // Prevent header from being scrolled directly (only sync from container)
    const handleHeaderScroll = e => {
      e.preventDefault();
      header.scrollLeft = container.scrollLeft;
    };

    container.addEventListener("scroll", handleScroll);
    header.addEventListener("scroll", handleHeaderScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      header.removeEventListener("scroll", handleHeaderScroll);
    };
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Week header - syncs horizontal scroll with main container */}
      <Box
        ref={headerRef}
        sx={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          flexShrink: 0,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
          pointerEvents: "none",
        }}
      >
        <Box
          sx={{
            position: { xs: "relative", md: "sticky" },
            top: { xs: "auto", md: 0 },
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            minWidth: "fit-content",
            minHeight: "100px",
            zIndex: { xs: "auto", md: 10 },
            pointerEvents: "auto",
          }}
        >
          {/* Spacer to match hour labels width */}
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 48,
              borderRight: 1,
              borderColor: "divider",
            }}
          />

          {/* Day headers container - matches timed columns structure exactly */}
          <Box
            sx={{
              position: "absolute",
              left: 48,
              right: 0,
              top: 0,
              bottom: 0,
              display: "flex",
              minWidth: "fit-content",
            }}
          >
            {weekDays.map((day, i) => {
              const untimedTasksForDay = getUntimedTasksForDay(day);
              const isToday = day.toDateString() === today.toDateString();

              return (
                <DayHeaderColumn
                  key={i}
                  day={day}
                  dayIndex={i}
                  untimedTasks={untimedTasksForDay}
                  isToday={isToday}
                  onDayClick={handleDayClick}
                  createDraggableId={createDraggableId}
                  dropHighlight="action.hover"
                />
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Time grid */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          minWidth: 0,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        <Box sx={{ position: "relative", height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          {hours.map(hour => (
            <Box
              key={hour}
              sx={{
                position: "absolute",
                width: "100%",
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                pointerEvents: "none",
                zIndex: 1,
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  fontSize: { xs: "0.6rem", md: "0.75rem" },
                  color: "text.secondary",
                  pr: 1,
                  textAlign: "right",
                  pt: 1,
                  borderRight: 1,
                  borderColor: "divider",
                }}
              >
                {hour === 0 ? "" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
              </Box>
            </Box>
          ))}

          {/* Day columns */}
          <Box
            sx={{
              position: "absolute",
              left: 48,
              right: 0,
              top: 0,
              bottom: 0,
              minWidth: "fit-content",
              display: "flex",
            }}
          >
            {weekDays.map((day, i) => {
              const positionedTasks = getPositionedTasksForDay(day);
              const isTodayColumn = i === todayIndex;

              return (
                <TimedColumn
                  key={i}
                  day={day}
                  dayIndex={i}
                  timedTasks={positionedTasks}
                  allTasks={tasks}
                  handleColumnClick={handleColumnClick}
                  handleDropTimeCalculation={handleDropTimeCalculation}
                  createDraggableId={createDraggableId}
                  getTaskStyle={getTaskStyle}
                  dropHighlight="action.hover"
                  showStatusTasks={showStatusTasks}
                  hourHeight={HOUR_HEIGHT}
                  isToday={isTodayColumn}
                />
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarWeekView;

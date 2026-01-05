"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Flex } from "@mantine/core";
import { useDispatch } from "react-redux";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate } from "@/lib/utils";
import { HOUR_HEIGHT_WEEK, DRAG_THRESHOLD } from "@/lib/calendarConstants";
import { DayHeaderColumn } from "./DayHeaderColumn";
import { TimedColumn } from "./TimedColumn";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { useViewState } from "@/hooks/useViewState";
import { setCalendarView } from "@/lib/store/slices/uiSlice";

const BASE_HOUR_HEIGHT = HOUR_HEIGHT_WEEK;

export const CalendarWeekView = ({ date, createDroppableId, createDraggableId, onDropTimeChange }) => {
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
  const completionHandlers = useCompletionHandlers();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Get all tasks
  const tasks = taskFilters.tasks;

  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoom;
  const { mode, calendar, dnd } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const dropHighlight = dnd.dropTarget;
  const hourTextColor = calendar.hourText;
  const hourBorderColor = calendar.gridLine;
  const hoverBg = mode.bg.surfaceHover;

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

  // Internal drag state for time/duration adjustments
  const [internalDrag, setInternalDrag] = useState({
    taskId: null,
    type: null,
    startY: 0,
    startMinutes: 0,
    startDuration: 0,
    currentMinutes: 0,
    currentDuration: 0,
    hasMoved: false,
  });

  const getTasksForDay = useCallback(
    day => {
      let dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, day));
      if (!showCompleted) {
        dayTasks = dayTasks.filter(task => {
          const isCompleted = isCompletedOnDate(task.id, day);
          const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
          const hasOutcome = outcome !== null && outcome !== undefined;
          return !isCompleted && !hasOutcome;
        });
      }
      return dayTasks;
    },
    [tasks, showCompleted, isCompletedOnDate, getOutcomeOnDate]
  );
  const getUntimedTasksForDay = useCallback(
    day => {
      let untimedTasks = tasks.filter(t => !t.time && shouldShowOnDate(t, day));
      if (!showCompleted) {
        untimedTasks = untimedTasks.filter(task => {
          const isCompleted = isCompletedOnDate(task.id, day);
          const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
          const hasOutcome = outcome !== null && outcome !== undefined;
          return !isCompleted && !hasOutcome;
        });
      }
      return untimedTasks;
    },
    [tasks, showCompleted, isCompletedOnDate, getOutcomeOnDate]
  );

  const getTaskStyle = task => {
    const isDragging = internalDrag.taskId === task.id;
    const minutes = isDragging && internalDrag.type === "move" ? internalDrag.currentMinutes : timeToMinutes(task.time);
    const duration =
      isDragging && internalDrag.type === "resize" ? internalDrag.currentDuration : (task.duration ?? 30);
    const isNoDuration = duration === 0;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${isNoDuration ? 24 : Math.max((duration / 60) * HOUR_HEIGHT, 18)}px`,
      // Background color handled by semantic colors
    };
  };

  const handleInternalDragStart = (e, task, type) => {
    e.preventDefault();
    e.stopPropagation();
    const taskDuration = task.duration ?? 30;
    setInternalDrag({
      taskId: task.id,
      type,
      startY: e.clientY,
      startMinutes: timeToMinutes(task.time),
      startDuration: taskDuration,
      currentMinutes: timeToMinutes(task.time),
      currentDuration: taskDuration,
      hasMoved: false,
    });
  };

  const handleInternalDragMove = useCallback(
    clientY => {
      if (!internalDrag.taskId) return;
      const deltaY = clientY - internalDrag.startY;
      const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD;

      if (internalDrag.type === "move") {
        const newMinutes = snapToIncrement(internalDrag.startMinutes + (deltaY / HOUR_HEIGHT) * 60, 15);
        setInternalDrag(prev => ({
          ...prev,
          currentMinutes: Math.max(0, Math.min(24 * 60 - prev.startDuration, newMinutes)),
          hasMoved: hasMoved || prev.hasMoved,
        }));
      } else {
        const newDuration = snapToIncrement(internalDrag.startDuration + (deltaY / HOUR_HEIGHT) * 60, 15);
        // When resizing, minimum is 15 minutes (converts "No duration" tasks to timed)
        setInternalDrag(prev => ({
          ...prev,
          currentDuration: Math.max(15, newDuration),
          hasMoved: hasMoved || prev.hasMoved,
        }));
      }
    },
    [internalDrag, HOUR_HEIGHT]
  );

  const handleInternalDragEnd = useCallback(() => {
    if (!internalDrag.taskId) return;

    const { taskId, type, currentMinutes, currentDuration, hasMoved } = internalDrag;

    setInternalDrag({
      taskId: null,
      type: null,
      startY: 0,
      startMinutes: 0,
      startDuration: 0,
      currentMinutes: 0,
      currentDuration: 0,
      hasMoved: false,
    });

    if (hasMoved) {
      if (type === "move") {
        taskOps.handleTaskTimeChange(taskId, minutesToTime(currentMinutes));
      } else {
        taskOps.handleTaskDurationChange(taskId, currentDuration);
      }
    } else {
      // Find and click task
      let task = null;
      for (const day of weekDays) {
        task = getTasksForDay(day).find(t => t.id === taskId);
        if (task) break;
      }
      if (!task) task = tasks.find(t => t.id === taskId);
      if (task) setTimeout(() => taskOps.handleEditTask(task), 100);
    }
  }, [internalDrag, taskOps, weekDays, tasks, getTasksForDay]);

  useEffect(() => {
    if (!internalDrag.taskId) return;

    const onMouseMove = e => handleInternalDragMove(e.clientY);
    const onMouseUp = () => handleInternalDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [internalDrag.taskId, handleInternalDragMove, handleInternalDragEnd]);

  const handleColumnClick = (e, day) => {
    if (internalDrag.taskId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = snapToIncrement((y / HOUR_HEIGHT) * 60, 15);
    taskOps.handleCreateTaskFromCalendar(minutesToTime(minutes), day);
  };

  const handleDropTimeCalculation = (e, rect) => {
    const y = e.clientY - rect.top;
    const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60)));
    const snappedMinutes = snapToIncrement(minutes, 15);
    if (onDropTimeChange) {
      onDropTimeChange(minutesToTime(snappedMinutes));
    }
  };

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
    <Flex direction="column" style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      {/* Week header - syncs horizontal scroll with main container */}
      <Box
        ref={headerRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          flexShrink: 0,
          pointerEvents: "none",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        sx={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        <Flex
          style={{
            borderBottomWidth: "1px",
            borderBottomColor: borderColor,
            borderBottomStyle: "solid",
            background: bgColor,
            position: "sticky",
            top: 0,
            minWidth: "fit-content",
            zIndex: 10,
            pointerEvents: "auto",
          }}
        >
          {/* Spacer to match hour labels width */}
          <Box
            style={{
              width: 48,
              flexShrink: 0,
              borderRightWidth: "1px",
              borderRightColor: borderColor,
              borderRightStyle: "solid",
            }}
          />

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
                createDroppableId={createDroppableId}
                createDraggableId={createDraggableId}
                borderColor={borderColor}
                dropHighlight={dropHighlight}
                hourTextColor={hourTextColor}
                hoverBg={hoverBg}
              />
            );
          })}
        </Flex>
      </Box>

      {/* Time grid */}
      <Box
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          minWidth: 0,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        sx={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        <Box style={{ position: "relative", height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          {hours.map(hour => (
            <Box
              key={hour}
              style={{
                position: "absolute",
                width: "100%",
                borderTopWidth: "1px",
                borderTopColor: hourBorderColor,
                borderTopStyle: "solid",
                display: "flex",
                pointerEvents: "none",
                zIndex: 1,
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box
                style={{
                  width: 48,
                  fontSize: "var(--mantine-font-size-xs)",
                  color: hourTextColor,
                  paddingRight: 4,
                  textAlign: "right",
                  paddingTop: 4,
                  borderRightWidth: "1px",
                  borderRightColor: borderColor,
                  borderRightStyle: "solid",
                }}
              >
                {hour === 0 ? "" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
              </Box>
            </Box>
          ))}

          {/* Day columns */}
          <Flex style={{ position: "absolute", left: 48, right: 0, top: 0, bottom: 0, minWidth: "fit-content" }}>
            {weekDays.map((day, i) => {
              const dayTasks = getTasksForDay(day);
              const isTodayColumn = i === todayIndex;

              return (
                <TimedColumn
                  key={i}
                  day={day}
                  dayIndex={i}
                  timedTasks={dayTasks}
                  allTasks={tasks}
                  handleColumnClick={handleColumnClick}
                  handleDropTimeCalculation={handleDropTimeCalculation}
                  createDroppableId={createDroppableId}
                  createDraggableId={createDraggableId}
                  getTaskStyle={getTaskStyle}
                  internalDrag={internalDrag}
                  handleInternalDragStart={handleInternalDragStart}
                  borderColor={borderColor}
                  dropHighlight={dropHighlight}
                  showStatusTasks={showStatusTasks}
                  hourHeight={HOUR_HEIGHT}
                  isToday={isTodayColumn}
                />
              );
            })}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

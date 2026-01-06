"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate, calculateTaskPositions } from "@/lib/utils";
import { HOUR_HEIGHT_DAY, DRAG_THRESHOLD } from "@/lib/calendarConstants";
import { CalendarTask } from "./CalendarTask";
import { StatusTaskBlock } from "./StatusTaskBlock";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

const BASE_HOUR_HEIGHT = HOUR_HEIGHT_DAY;

export const CalendarDayView = ({ date, createDroppableId, createDraggableId, onDropTimeChange }) => {
  // Get preferences
  const { preferences } = usePreferencesContext();
  const zoom = preferences.calendarZoom?.day || 1.0;
  const showStatusTasks = preferences.showStatusTasks?.day !== false;

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const { getCompletionForDate } = useCompletionHelpers();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Get all tasks (for status blocks and filtering)
  const tasks = taskFilters.tasks;

  // Filter tasks by date (search/tag filtering is now done in parent)
  const dayTasks = useMemo(() => {
    return tasks.filter(t => t.time && shouldShowOnDate(t, date));
  }, [tasks, date]);

  const untimedTasks = useMemo(() => {
    return tasks.filter(t => !t.time && shouldShowOnDate(t, date));
  }, [tasks, date]);

  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoom;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const draggingTaskIdRef = useRef(null);

  // Check if viewing today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const viewDate = new Date(date);
  viewDate.setHours(0, 0, 0, 0);
  const isToday = viewDate.getTime() === today.getTime();

  // Auto-scroll to current time on mount or when date changes to today
  useEffect(() => {
    if (!isToday || !containerRef.current) return;

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
  }, [isToday, HOUR_HEIGHT, date]);

  // Internal drag state for time/duration adjustments (not cross-container)
  const [internalDrag, setInternalDrag] = useState({
    taskId: null,
    type: null, // "move" or "resize"
    startY: 0,
    startMinutes: 0,
    startDuration: 0,
    currentMinutes: 0,
    currentDuration: 0,
    hasMoved: false,
  });

  // Pre-compute task styles for all tasks (memoized)
  const taskStyles = useMemo(() => {
    const styles = new Map();
    dayTasks.forEach(task => {
      const isDragging = internalDrag.taskId === task.id;
      const minutes =
        isDragging && internalDrag.type === "move" ? internalDrag.currentMinutes : timeToMinutes(task.time);
      const duration =
        isDragging && internalDrag.type === "resize" ? internalDrag.currentDuration : (task.duration ?? 30);
      const isNoDuration = duration === 0;
      styles.set(task.id, {
        top: `${(minutes / 60) * HOUR_HEIGHT}px`,
        height: `${isNoDuration ? 24 : Math.max((duration / 60) * HOUR_HEIGHT, 24)}px`,
      });
    });
    return styles;
  }, [dayTasks, internalDrag, HOUR_HEIGHT]);

  const getTaskStyle = useCallback(
    task => {
      return taskStyles.get(task.id) || { top: "0px", height: "30px" };
    },
    [taskStyles]
  );

  // Start internal drag for time adjustment
  const handleInternalDragStart = useCallback((e, task, type) => {
    e.preventDefault();
    e.stopPropagation();
    const taskDuration = task.duration ?? 30;
    draggingTaskIdRef.current = task.id;
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
  }, []);

  const handleInternalDragMove = useCallback(
    clientY => {
      if (!draggingTaskIdRef.current) return;

      // Throttle updates to 60fps using requestAnimationFrame
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        setInternalDrag(prev => {
          if (!prev.taskId) return prev;

          const deltaY = clientY - prev.startY;
          const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD;

          if (prev.type === "move") {
            const newMinutes = snapToIncrement(prev.startMinutes + (deltaY / HOUR_HEIGHT) * 60, 15);
            return {
              ...prev,
              currentMinutes: Math.max(0, Math.min(24 * 60 - prev.startDuration, newMinutes)),
              hasMoved: hasMoved || prev.hasMoved,
            };
          } else {
            const newDuration = snapToIncrement(prev.startDuration + (deltaY / HOUR_HEIGHT) * 60, 15);
            // When resizing, minimum is 15 minutes (converts "No duration" tasks to timed)
            return {
              ...prev,
              currentDuration: Math.max(15, newDuration),
              hasMoved: hasMoved || prev.hasMoved,
            };
          }
        });
      });
    },
    [HOUR_HEIGHT]
  );

  const handleInternalDragEnd = useCallback(() => {
    if (!draggingTaskIdRef.current) return;

    const { taskId, type, currentMinutes, currentDuration, hasMoved } = internalDrag;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Clear the ref
    const endedTaskId = draggingTaskIdRef.current;
    draggingTaskIdRef.current = null;

    // Reset state first
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
      // Click without drag - open task editor
      const task = dayTasks.find(t => t.id === endedTaskId);
      if (task) {
        setTimeout(() => taskOps.handleEditTask(task), 100);
      }
    }
  }, [internalDrag, taskOps, dayTasks]);

  // Memoize status tasks calculation
  const statusTasks = useMemo(() => {
    if (!showStatusTasks || !getCompletionForDate) return [];

    return tasks
      .filter(task => {
        // Only show non-recurring tasks with status tracking
        if (task.recurrence && task.recurrence.type !== "none") return false;
        if (task.completionType === "note") return false;
        if (task.parentId) return false;

        // Show in-progress tasks
        if (task.status === "in_progress" && task.startedAt) return true;

        // Show completed tasks with timing data
        const completion = getCompletionForDate(task.id, date);
        return completion && completion.startedAt && completion.completedAt;
      })
      .map(task => {
        const isInProgress = task.status === "in_progress";
        let startedAt, completedAt, top, height;

        if (isInProgress) {
          // In-progress task: use task.startedAt to now
          startedAt = task.startedAt;
          completedAt = new Date().toISOString();

          const startTime = new Date(startedAt);
          const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const durationMinutes = nowMinutes - startMinutes;

          top = (startMinutes / 60) * HOUR_HEIGHT;
          height = (durationMinutes / 60) * HOUR_HEIGHT;
        } else {
          // Completed task: use completion timing data
          const completion = getCompletionForDate(task.id, date);
          startedAt = completion.startedAt;
          completedAt = completion.completedAt;

          const startTime = new Date(startedAt);
          const endTime = new Date(completedAt);
          const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
          const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
          const durationMinutes = endMinutes - startMinutes;

          top = (startMinutes / 60) * HOUR_HEIGHT;
          height = (durationMinutes / 60) * HOUR_HEIGHT;
        }

        return { task, isInProgress, startedAt, completedAt, top, height };
      });
  }, [tasks, date, showStatusTasks, getCompletionForDate, HOUR_HEIGHT]);

  useEffect(() => {
    if (!internalDrag.taskId) return;

    const onMouseMove = e => handleInternalDragMove(e.clientY);
    const onMouseUp = () => handleInternalDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      // Clean up any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [internalDrag.taskId, handleInternalDragMove, handleInternalDragEnd]);

  // Click on empty calendar space to create task
  const handleCalendarClick = useCallback(
    e => {
      if (internalDrag.taskId || internalDrag.hasMoved) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top + containerRef.current.scrollTop;
      const minutes = snapToIncrement((y / HOUR_HEIGHT) * 60, 15);
      taskOps.handleCreateTaskFromCalendar(minutesToTime(minutes), date);
    },
    [internalDrag.taskId, internalDrag.hasMoved, HOUR_HEIGHT, taskOps, date]
  );

  // Calculate drop time from mouse position
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

  const timedDroppableId = createDroppableId.calendarDay(date);
  const untimedDroppableId = createDroppableId.calendarDayUntimed(date);

  // Use droppable hooks
  const { setNodeRef: setUntimedRef, isOver: isOverUntimed } = useDroppable({
    id: untimedDroppableId,
    data: { type: "TASK", date, isUntimed: true },
  });

  const { setNodeRef: setTimedRef, isOver: isOverTimed } = useDroppable({
    id: timedDroppableId,
    data: { type: "TASK", date, isUntimed: false },
  });

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
      {/* Day header */}
      <Box
        sx={{
          textAlign: "center",
          py: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: { xs: "1rem", md: "1.25rem" }, fontWeight: 700 }}>
          {date.toLocaleDateString("en-US", { day: "numeric", weekday: "long", month: "long" })}
        </Typography>
      </Box>

      {/* Untimed tasks area */}
      <Box
        ref={setUntimedRef}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: isOverUntimed ? "action.hover" : "background.paper",
          minHeight: untimedTasks.length > 0 || isOverUntimed ? "auto" : 0,
          transition: "background-color 0.2s",
          width: "100%",
          maxWidth: "100%",
          flexShrink: 0,
        }}
      >
        {(untimedTasks.length > 0 || isOverUntimed) && (
          <Stack spacing={0}>
            {/* All Day header - fixed, not scrollable */}
            <Box sx={{ px: { xs: 2, md: 4 }, pt: 1, pb: 0.5, flexShrink: 0 }}>
              <Typography
                variant="caption"
                sx={{ fontSize: { xs: "0.6rem", md: "0.75rem" }, fontWeight: 500, color: "text.secondary" }}
              >
                All Day
              </Typography>
            </Box>
            {/* Scrollable tasks container */}
            <Box sx={{ px: { xs: 2, md: 4 }, pb: 1, maxHeight: "100px", overflowY: "auto", flexShrink: 0 }}>
              <Stack spacing={1}>
                {untimedTasks.map(task => (
                  <CalendarTask
                    key={task.id}
                    task={task}
                    createDraggableId={createDraggableId}
                    date={date}
                    variant="untimed"
                  />
                ))}
                {isOverUntimed && untimedTasks.length === 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: { xs: "0.6rem", md: "0.75rem" },
                      color: "text.secondary",
                      textAlign: "center",
                      py: 2,
                    }}
                  >
                    Drop here for all-day task
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      {/* Timed calendar grid */}
      <Box ref={containerRef} sx={{ flex: 1, overflowY: "auto", width: "100%", maxWidth: "100%", minHeight: 0 }}>
        <Box sx={{ position: "relative", height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Current time line - only show if viewing today */}
          {isToday && <CurrentTimeLine hourHeight={HOUR_HEIGHT} startHour={0} />}

          {/* Hour lines */}
          {hours.map(hour => (
            <Box
              key={hour}
              sx={{
                position: "absolute",
                width: "100%",
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  fontSize: { xs: "0.6rem", md: "0.75rem" },
                  color: "text.secondary",
                  pr: 2,
                  textAlign: "right",
                  pt: 1,
                }}
              >
                {hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}
              </Box>
              <Box sx={{ flex: 1, borderLeft: 1, borderColor: "divider" }} />
            </Box>
          ))}

          {/* Droppable timed area */}
          <Box
            ref={setTimedRef}
            sx={{
              position: "absolute",
              left: 64,
              right: 8,
              top: 0,
              bottom: 0,
              bgcolor: isOverTimed ? "action.hover" : "transparent",
              borderRadius: 1,
              transition: "background-color 0.2s",
            }}
            onClick={handleCalendarClick}
            data-calendar-timed="true"
            data-calendar-view="day"
            data-hour-height={HOUR_HEIGHT}
            onMouseMove={e => {
              if (isOverTimed) {
                handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
              }
            }}
          >
            {/* Render positioned tasks */}
            {calculateTaskPositions(dayTasks).map(task => (
              <CalendarTask
                key={task.id}
                task={task}
                createDraggableId={createDraggableId}
                date={date}
                variant="timed"
                getTaskStyle={getTaskStyle}
                internalDrag={internalDrag}
                handleInternalDragStart={handleInternalDragStart}
              />
            ))}

            {/* Render status task blocks (in-progress and completed with time tracking) */}
            {statusTasks.map(({ task, isInProgress, startedAt, completedAt, top, height }) => (
              <StatusTaskBlock
                key={`status-${task.id}`}
                task={task}
                top={top}
                height={height}
                isInProgress={isInProgress}
                startedAt={startedAt}
                completedAt={completedAt}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarDayView;

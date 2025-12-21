"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Flex, useColorModeValue } from "@chakra-ui/react";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate } from "@/lib/utils";
import { HOUR_HEIGHT_WEEK, DRAG_THRESHOLD } from "@/lib/calendarConstants";
import { DayHeaderColumn } from "./DayHeaderColumn";
import { TimedColumn } from "./TimedColumn";

const HOUR_HEIGHT = HOUR_HEIGHT_WEEK;

export const CalendarWeekView = ({
  date,
  tasks,
  onTaskClick,
  onDayClick,
  onTaskTimeChange,
  onTaskDurationChange,
  onCreateTask,
  onDropTimeChange,
  createDroppableId,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");
  const hourTextColor = useColorModeValue("gray.400", "gray.500");
  const hourBorderColor = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  // Calculate week days
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const containerRef = useRef(null);

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

  const getTasksForDay = useCallback(day => tasks.filter(t => t.time && shouldShowOnDate(t, day)), [tasks]);
  const getUntimedTasksForDay = useCallback(day => tasks.filter(t => !t.time && shouldShowOnDate(t, day)), [tasks]);

  const getTaskStyle = task => {
    const isDragging = internalDrag.taskId === task.id;
    const minutes = isDragging && internalDrag.type === "move" ? internalDrag.currentMinutes : timeToMinutes(task.time);
    const duration = isDragging && internalDrag.type === "resize" ? internalDrag.currentDuration : (task.duration ?? 30);
    const isNoDuration = duration === 0;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${isNoDuration ? 24 : Math.max((duration / 60) * HOUR_HEIGHT, 18)}px`,
      // Don't set backgroundColor here - let Chakra UI bg prop handle it for proper theming
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
    [internalDrag]
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
        onTaskTimeChange(taskId, minutesToTime(currentMinutes));
      } else {
        onTaskDurationChange(taskId, currentDuration);
      }
    } else {
      // Find and click task
      let task = null;
      for (const day of weekDays) {
        task = getTasksForDay(day).find(t => t.id === taskId);
        if (task) break;
      }
      if (!task) task = tasks.find(t => t.id === taskId);
      if (task) setTimeout(() => onTaskClick(task), 100);
    }
  }, [internalDrag, onTaskTimeChange, onTaskDurationChange, weekDays, tasks, onTaskClick, getTasksForDay]);

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
    onCreateTask(minutesToTime(minutes), day);
  };

  const handleDropTimeCalculation = (e, rect) => {
    const y = e.clientY - rect.top;
    const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60)));
    const snappedMinutes = snapToIncrement(minutes, 15);
    if (onDropTimeChange) {
      onDropTimeChange(minutesToTime(snappedMinutes));
    }
  };

  return (
    <Flex direction="column" h="full">
      {/* Week header */}
      <Flex borderBottomWidth="1px" borderColor={borderColor} bg={bgColor} position="sticky" top={0} zIndex={10}>
        <Box w={12} flexShrink={0} />
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
              onTaskClick={onTaskClick}
              onDayClick={onDayClick}
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

      {/* Time grid */}
      <Box ref={containerRef} flex={1} overflowY="auto">
        <Box position="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Hour labels */}
          {hours.map(hour => (
            <Box
              key={hour}
              position="absolute"
              w="full"
              borderTopWidth="1px"
              borderColor={hourBorderColor}
              display="flex"
              pointerEvents="none"
              zIndex={1}
              style={{
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box w={12} fontSize="xs" color={hourTextColor} pr={1} textAlign="right" pt={1}>
                {hour === 0 ? "" : hour < 12 ? `${hour}a` : hour === 12 ? "12p" : `${hour - 12}p`}
              </Box>
            </Box>
          ))}

          {/* Day columns */}
          <Flex position="absolute" left={12} right={0} top={0} bottom={0}>
            {weekDays.map((day, i) => {
              const dayTasks = getTasksForDay(day);

              return (
                <TimedColumn
                  key={i}
                  day={day}
                  dayIndex={i}
                  timedTasks={dayTasks}
                  onTaskClick={onTaskClick}
                  handleColumnClick={handleColumnClick}
                  handleDropTimeCalculation={handleDropTimeCalculation}
                  createDroppableId={createDroppableId}
                  createDraggableId={createDraggableId}
                  getTaskStyle={getTaskStyle}
                  internalDrag={internalDrag}
                  handleInternalDragStart={handleInternalDragStart}
                  borderColor={borderColor}
                  dropHighlight={dropHighlight}
                />
              );
            })}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

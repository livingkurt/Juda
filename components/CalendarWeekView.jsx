"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate, calculateTaskPositions } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

const HOUR_HEIGHT = 48;
const DRAG_THRESHOLD = 5;

// Draggable untimed task for week view
const UntimedWeekTask = ({ task, onTaskClick, createDraggableId, day }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const style = {
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? "none" : "auto",
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p={1}
      borderRadius="sm"
      bg={task.color || "#3b82f6"}
      color="white"
      cursor="grab"
      boxShadow="sm"
      onClick={e => {
        e.stopPropagation();
        onTaskClick(task);
      }}
    >
      <Text fontSize="2xs" fontWeight="medium" noOfLines={2}>
        {task.title}
      </Text>
    </Box>
  );
};

// Draggable timed task for week view
const TimedWeekTask = ({
  task,
  onTaskClick,
  createDraggableId,
  day,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const style = {
    ...getTaskStyle(task),
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging && !internalDrag.taskId ? 0 : 1,
    pointerEvents: isDragging && !internalDrag.taskId ? "none" : "auto",
  };

  return (
    <Box
      ref={setNodeRef}
      position="absolute"
      left={task.left}
      width={task.width}
      ml={1}
      mr={1}
      borderRadius="md"
      color="white"
      fontSize="xs"
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "md" }}
      bg={task.color || "#3b82f6"}
      style={style}
      boxShadow={internalDrag.taskId === task.id ? "xl" : "none"}
      zIndex={internalDrag.taskId === task.id ? 50 : "auto"}
      onClick={e => e.stopPropagation()}
    >
      {/* Task content */}
      <Box
        {...attributes}
        {...listeners}
        position="absolute"
        inset={0}
        px={1}
        py={0.5}
        cursor="grab"
        onClick={e => {
          e.stopPropagation();
          onTaskClick(task);
        }}
      >
        <Text isTruncated fontWeight="medium">
          {task.title}
        </Text>
      </Box>

      {/* Resize handle */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h={2}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.200" }}
        onMouseDown={e => {
          if (!isDragging) {
            handleInternalDragStart(e, task, "resize");
          }
        }}
        onClick={e => e.stopPropagation()}
      />
    </Box>
  );
};

// Day column component for header (untimed tasks only)
const DayHeaderColumn = ({
  day,
  dayIndex,
  untimedTasks,
  isToday,
  onTaskClick,
  onDayClick,
  createDroppableId,
  createDraggableId,
  borderColor,
  dropHighlight,
  hourTextColor,
  hoverBg,
}) => {
  const untimedDroppableId = createDroppableId.calendarWeekUntimed(day);

  const { setNodeRef, isOver } = useDroppable({
    id: untimedDroppableId,
    data: { type: "TASK", date: day, isUntimed: true },
  });

  return (
    <Box
      flex={1}
      flexShrink={0}
      flexGrow={1}
      minW={0}
      borderLeftWidth={dayIndex === 0 ? "0" : "1px"}
      borderColor={borderColor}
    >
      {/* Day header */}
      <Box textAlign="center" py={2} cursor="pointer" _hover={{ bg: hoverBg }} onClick={() => onDayClick(day)}>
        <Text fontSize="xs" color={hourTextColor}>
          {DAYS_OF_WEEK[dayIndex].short}
        </Text>
        <Box
          as="span"
          fontSize="lg"
          fontWeight="semibold"
          display="inline-block"
          bg={isToday ? "blue.500" : "transparent"}
          color={isToday ? "white" : "inherit"}
          borderRadius="full"
          w={8}
          h={8}
          lineHeight="32px"
        >
          {day.getDate()}
        </Box>
      </Box>

      {/* Untimed tasks for this day */}
      <Box
        ref={setNodeRef}
        px={1}
        py={1}
        borderTopWidth="1px"
        borderColor={borderColor}
        bg={isOver ? dropHighlight : "transparent"}
        minH={untimedTasks.length > 0 || isOver ? "40px" : "0"}
        transition="background-color 0.2s"
      >
        <VStack align="stretch" spacing={1}>
          {untimedTasks.map(task => (
            <UntimedWeekTask
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              createDraggableId={createDraggableId}
              day={day}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

// Timed column component for time grid
const TimedColumn = ({
  day,
  dayIndex,
  timedTasks,
  onTaskClick,
  handleColumnClick,
  handleDropTimeCalculation,
  createDroppableId,
  createDraggableId,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
  borderColor,
  dropHighlight,
}) => {
  const timedDroppableId = createDroppableId.calendarWeek(day);
  const { setNodeRef, isOver } = useDroppable({
    id: timedDroppableId,
    data: { type: "TASK", date: day, isUntimed: false },
  });

  return (
    <Box
      ref={setNodeRef}
      flex={1}
      flexShrink={0}
      flexGrow={1}
      minW={0}
      borderLeftWidth={dayIndex === 0 ? "0" : "1px"}
      borderColor={borderColor}
      position="relative"
      h="full"
      w="full"
      zIndex={2}
      onClick={e => {
        if (!isOver) {
          handleColumnClick(e, day);
        }
      }}
      bg={isOver ? dropHighlight : "transparent"}
      transition="background-color 0.2s"
      data-calendar-timed="true"
      data-calendar-view="week"
      data-hour-height={HOUR_HEIGHT}
      onMouseMove={e => {
        if (isOver) {
          handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
        }
      }}
    >
      {/* Render tasks */}
      {calculateTaskPositions(timedTasks).map(task => (
        <TimedWeekTask
          key={task.id}
          task={task}
          onTaskClick={onTaskClick}
          createDraggableId={createDraggableId}
          day={day}
          getTaskStyle={getTaskStyle}
          internalDrag={internalDrag}
          handleInternalDragStart={handleInternalDragStart}
        />
      ))}
    </Box>
  );
};

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
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
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
    const duration = isDragging && internalDrag.type === "resize" ? internalDrag.currentDuration : task.duration || 30;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 18)}px`,
      backgroundColor: task.color || "#3b82f6",
    };
  };

  const handleInternalDragStart = (e, task, type) => {
    e.preventDefault();
    e.stopPropagation();
    setInternalDrag({
      taskId: task.id,
      type,
      startY: e.clientY,
      startMinutes: timeToMinutes(task.time),
      startDuration: task.duration || 30,
      currentMinutes: timeToMinutes(task.time),
      currentDuration: task.duration || 30,
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

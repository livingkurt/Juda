"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { useDroppable, useDraggable, useDndMonitor } from "@dnd-kit/core";
import {
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

const WeekCalendarTask = ({
  task,
  index,
  onTaskClick,
  onTaskDurationChange,
  HOUR_HEIGHT,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "TASK",
        task,
        source: "calendar-week",
        droppableId: `calendar-week:${
          task.recurrence?.startDate || new Date().toISOString()
        }`,
      },
    });

  const [resizeState, setResizeState] = useState({
    isResizing: false,
    startY: 0,
    startDuration: 0,
    currentDuration: 0,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleResizeStart = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      setResizeState({
        isResizing: true,
        startY: e.clientY,
        startDuration: task.duration || 30,
        currentDuration: task.duration || 30,
      });
    },
    [task.duration]
  );

  const handleResizeMove = useCallback(
    clientY => {
      setResizeState(prev => {
        if (!prev.isResizing) return prev;
        const deltaY = clientY - prev.startY;
        const newDuration = snapToIncrement(
          prev.startDuration + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
        const clampedDuration = Math.max(15, newDuration);
        return {
          ...prev,
          currentDuration: clampedDuration,
        };
      });
    },
    [HOUR_HEIGHT]
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeState.isResizing) return;
    const finalDuration =
      resizeState.currentDuration || resizeState.startDuration;
    setResizeState({
      isResizing: false,
      startY: 0,
      startDuration: 0,
      currentDuration: 0,
    });
    onTaskDurationChange(task.id, finalDuration);
  }, [resizeState, task.id, onTaskDurationChange]);

  useEffect(() => {
    if (!resizeState.isResizing) return;
    const onMouseMove = e => handleResizeMove(e.clientY);
    const onMouseUp = () => handleResizeEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizeState.isResizing, handleResizeMove, handleResizeEnd]);

  const taskMinutes = timeToMinutes(task.time);
  const taskDuration = resizeState.isResizing
    ? resizeState.currentDuration
    : task.duration || 30;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-task-id={task.id}
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
      style={{
        top: `${(taskMinutes / 60) * HOUR_HEIGHT}px`,
        height: `${Math.max((taskDuration / 60) * HOUR_HEIGHT, 18)}px`,
        backgroundColor: task.color || "#3b82f6",
        ...style,
      }}
      onClick={e => {
        e.stopPropagation();
        if (!isDragging && !resizeState.isResizing) {
          onTaskClick(task);
        }
      }}
      boxShadow={isDragging ? "xl" : "none"}
      zIndex={isDragging ? 50 : "auto"}
      opacity={isDragging ? 0.8 : 1}
    >
      <Box position="absolute" inset={0} px={1} py={0.5} cursor="grab">
        <Text isTruncated fontWeight="medium">
          {task.title}
        </Text>
      </Box>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h={2}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.100" }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e);
        }}
        onClick={e => e.stopPropagation()}
      />
    </Box>
  );
};

const WeekUntimedTask = ({ task, onTaskClick }) => {
  const draggingBg = useColorModeValue("blue.100", "blue.800");
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "TASK",
        task,
        source: "calendar-week-untimed",
        droppableId: `calendar-week-untimed:${
          task.recurrence?.startDate || new Date().toISOString()
        }`,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      p={1}
      borderRadius="sm"
      bg={isDragging ? draggingBg : task.color || "#3b82f6"}
      color="white"
      cursor="grab"
      boxShadow={isDragging ? "lg" : "sm"}
      style={style}
      onClick={e => {
        e.stopPropagation();
        if (!isDragging) {
          onTaskClick(task);
        }
      }}
    >
      <Text fontSize="2xs" fontWeight="medium" noOfLines={2}>
        {task.title}
      </Text>
    </Box>
  );
};

const DayColumnHeader = ({ day, index, onDayClick }) => {
  const today = new Date();
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.500", "gray.400");

  return (
    <Box flex={1} borderLeftWidth="1px" borderColor={borderColor}>
      <Box
        textAlign="center"
        py={2}
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        onClick={() => onDayClick(day)}
      >
        <Text fontSize="xs" color={textColor}>
          {DAYS_OF_WEEK[index].short}
        </Text>
        <Box
          as="span"
          fontSize="lg"
          fontWeight="semibold"
          display="inline-block"
          bg={
            day.toDateString() === today.toDateString()
              ? "blue.500"
              : "transparent"
          }
          color={
            day.toDateString() === today.toDateString() ? "white" : "inherit"
          }
          borderRadius="full"
          w={8}
          h={8}
          lineHeight="32px"
        >
          {day.getDate()}
        </Box>
      </Box>
    </Box>
  );
};

// Separate component for untimed day column to use hooks properly
const UntimedDayColumn = ({ day, tasks, onTaskClick }) => {
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const overBg = useColorModeValue("blue.50", "blue.900");
  const untimedTasksForDay = tasks.filter(
    t => !t.time && shouldShowOnDate(t, day)
  );

  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-week-untimed:${day.toISOString()}`,
    data: {
      type: "TASK",
      droppableId: `calendar-week-untimed:${day.toISOString()}`,
    },
  });

  return (
    <Box
      ref={setNodeRef}
      flex={1}
      borderLeftWidth="1px"
      borderColor={borderColor}
      px={1}
      py={1}
      borderTopWidth="1px"
      bg={isOver ? overBg : "transparent"}
    >
      <VStack align="stretch" spacing={1}>
        {untimedTasksForDay.map(task => (
          <WeekUntimedTask
            key={task.id}
            task={task}
            onTaskClick={onTaskClick}
          />
        ))}
      </VStack>
    </Box>
  );
};

// Separate component for timed day column to use hooks properly
const TimedDayColumn = ({
  day,
  tasks,
  onTaskClick,
  onTaskDurationChange,
  onColumnClick,
  HOUR_HEIGHT,
}) => {
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const overBg = useColorModeValue("blue.50", "blue.900");
  const dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, day));

  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-week:${day.toISOString()}`,
    data: {
      type: "TASK",
      droppableId: `calendar-week:${day.toISOString()}`,
    },
  });

  return (
    <Box
      ref={setNodeRef}
      data-droppable-id={`calendar-week:${day.toISOString()}`}
      flex={1}
      borderLeftWidth="1px"
      borderColor={borderColor}
      position="relative"
      onClick={e => {
        if (isOver) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onColumnClick(e, day);
      }}
      bg={isOver ? overBg : "transparent"}
      transition="background-color 0.2s"
    >
      {calculateTaskPositions(dayTasks, HOUR_HEIGHT).map((task, taskIndex) => (
        <WeekCalendarTask
          key={task.id}
          task={task}
          index={taskIndex}
          onTaskClick={onTaskClick}
          onTaskDurationChange={onTaskDurationChange}
          HOUR_HEIGHT={HOUR_HEIGHT}
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
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hourBorderColor = useColorModeValue("gray.100", "gray.700");
  const hourTextColor = useColorModeValue("gray.400", "gray.500");

  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef(null);
  const HOUR_HEIGHT = 48;

  // Monitor drag over to calculate drop time for all day columns
  useDndMonitor({
    onDragOver(event) {
      if (
        event.over &&
        typeof event.over.id === "string" &&
        event.over.id.startsWith("calendar-week:") &&
        event.activatorEvent
      ) {
        const dayStr = event.over.id.split(":").slice(1).join(":");
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const columnIndex = weekDays.findIndex(
            d => d.toISOString() === dayStr
          );
          if (columnIndex !== -1) {
            const columnWidth = (rect.width - 48) / 7;
            const columnLeft = 48 + columnIndex * columnWidth;
            const x = event.activatorEvent.clientX - rect.left;
            if (x >= columnLeft && x < columnLeft + columnWidth) {
              const y =
                event.activatorEvent.clientY -
                rect.top +
                (containerRef.current?.scrollTop || 0);
              const minutes = Math.max(
                0,
                Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60))
              );
              const snappedMinutes = snapToIncrement(minutes, 15);
              const calculatedTime = minutesToTime(snappedMinutes);
              if (onDropTimeChange) {
                onDropTimeChange(calculatedTime);
              }
            }
          }
        }
      }
    },
  });

  const handleColumnClick = (e, day) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (containerRef.current?.scrollTop || 0);
    onCreateTask(
      minutesToTime(snapToIncrement((y / HOUR_HEIGHT) * 60, 15)),
      day
    );
  };

  return (
    <Flex direction="column" h="full">
      <Flex
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={bgColor}
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Box w={12} flexShrink={0} />
        {weekDays.map((day, i) => (
          <DayColumnHeader
            key={`header-${i}`}
            day={day}
            index={i}
            onDayClick={onDayClick}
          />
        ))}
        {/* Untimed tasks row */}
        <Flex position="absolute" left={12} right={0} top={48} zIndex={9}>
          {weekDays.map((day, i) => (
            <UntimedDayColumn
              key={`untimed-${i}`}
              day={day}
              tasks={tasks}
              onTaskClick={onTaskClick}
            />
          ))}
        </Flex>
      </Flex>
      <Box ref={containerRef} flex={1} overflowY="auto">
        <Box position="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {hours.map(hour => (
            <Box
              key={hour}
              position="absolute"
              w="full"
              borderTopWidth="1px"
              borderColor={hourBorderColor}
              display="flex"
              style={{
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box
                w={12}
                fontSize="xs"
                color={hourTextColor}
                pr={1}
                textAlign="right"
                pt={1}
              >
                {hour === 0
                  ? ""
                  : hour < 12
                  ? `${hour}a`
                  : hour === 12
                  ? "12p"
                  : `${hour - 12}p`}
              </Box>
            </Box>
          ))}
          <Flex position="absolute" left={12} right={0} top={0} bottom={0}>
            {weekDays.map((day, i) => (
              <TimedDayColumn
                key={`timed-${i}`}
                day={day}
                tasks={tasks}
                onTaskClick={onTaskClick}
                onTaskDurationChange={onTaskDurationChange}
                onColumnClick={handleColumnClick}
                HOUR_HEIGHT={HOUR_HEIGHT}
              />
            ))}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

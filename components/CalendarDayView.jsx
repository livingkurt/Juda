"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { useDndMonitor } from "@dnd-kit/core";
import {
  formatTime,
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";

const CalendarTask = ({
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
        source: "calendar-day",
        droppableId: `calendar-day:${
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
      fontSize="sm"
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "lg" }}
      style={{
        top: `${(taskMinutes / 60) * HOUR_HEIGHT}px`,
        height: `${Math.max((taskDuration / 60) * HOUR_HEIGHT, 24)}px`,
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
      <Box position="absolute" inset={0} px={2} py={1} cursor="grab">
        <Text fontWeight="medium" isTruncated>
          {task.title}
        </Text>
        {(taskDuration || 30) >= 45 && (
          <Text fontSize="xs" opacity={0.8}>
            {formatTime(task.time)}
          </Text>
        )}
      </Box>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h={3}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.100" }}
        display="flex"
        align="center"
        justify="center"
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e);
        }}
        onClick={e => e.stopPropagation()}
      >
        <Box w={8} h={1} borderRadius="full" bg="whiteAlpha.500" />
      </Box>
    </Box>
  );
};

const UntimedTask = ({ task, onTaskClick }) => {
  const draggingBg = useColorModeValue("blue.100", "blue.800");
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: {
        type: "TASK",
        task,
        source: "calendar-day-untimed",
        droppableId: `calendar-day-untimed:${
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
      p={2}
      borderRadius="md"
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
      <Text fontSize="sm" fontWeight="medium">
        {task.title}
      </Text>
    </Box>
  );
};

export const CalendarDayView = ({
  date,
  tasks,
  onTaskClick,
  onTaskTimeChange,
  onTaskDurationChange,
  onCreateTask,
  onDropTimeChange,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textMuted = useColorModeValue("gray.500", "gray.400");
  const hourTextColor = useColorModeValue("gray.400", "gray.500");
  const overBg = useColorModeValue("blue.50", "blue.900");

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, date));
  const untimedTasks = tasks.filter(t => !t.time && shouldShowOnDate(t, date));
  const containerRef = useRef(null);
  const HOUR_HEIGHT = 64;

  const { setNodeRef: setUntimedDroppableRef, isOver: isUntimedOver } =
    useDroppable({
      id: `calendar-day-untimed:${date.toISOString()}`,
      data: {
        type: "TASK",
        droppableId: `calendar-day-untimed:${date.toISOString()}`,
      },
    });

  const { setNodeRef: setTimedDroppableRef, isOver: isTimedOver } =
    useDroppable({
      id: `calendar-day:${date.toISOString()}`,
      data: {
        type: "TASK",
        droppableId: `calendar-day:${date.toISOString()}`,
      },
    });

  // Monitor drag over to calculate drop time using current pointer position
  useDndMonitor({
    onDragOver(event) {
      if (
        event.over?.id === `calendar-day:${date.toISOString()}` &&
        event.activatorEvent
      ) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const y =
            event.activatorEvent.clientY -
            rect.top +
            containerRef.current.scrollTop;
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
    },
  });

  const handleCalendarClick = e => {
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    onCreateTask(minutesToTime(snapToIncrement((y / HOUR_HEIGHT) * 60, 15)));
  };

  return (
    <Flex direction="column" h="full">
      <Box
        textAlign="center"
        py={3}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Text fontSize="2xl" fontWeight="bold">
          {date.getDate()}
        </Text>
        <Text fontSize="sm" color={textMuted}>
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </Text>
      </Box>
      {/* Untimed tasks at the top */}
      {untimedTasks.length > 0 && (
        <Box
          ref={setUntimedDroppableRef}
          px={4}
          py={2}
          borderBottomWidth="1px"
          borderColor={borderColor}
          bg={isUntimedOver ? overBg : bgColor}
        >
          <VStack align="stretch" spacing={2}>
            {untimedTasks.map((task, index) => (
              <UntimedTask
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
              />
            ))}
          </VStack>
        </Box>
      )}
      <Box
        ref={containerRef}
        flex={1}
        overflowY="auto"
        onClick={handleCalendarClick}
        position="relative"
        style={{ height: `${24 * HOUR_HEIGHT}px` }}
      >
        {hours.map(hour => (
          <Box
            key={hour}
            position="absolute"
            w="full"
            borderTopWidth="1px"
            borderColor={borderColor}
            display="flex"
            style={{
              top: `${hour * HOUR_HEIGHT}px`,
              height: `${HOUR_HEIGHT}px`,
            }}
          >
            <Box
              w={16}
              fontSize="xs"
              color={hourTextColor}
              pr={2}
              textAlign="right"
              pt={1}
            >
              {hour === 0
                ? "12 AM"
                : hour < 12
                ? `${hour} AM`
                : hour === 12
                ? "12 PM"
                : `${hour - 12} PM`}
            </Box>
            <Box flex={1} borderLeftWidth="1px" borderColor={borderColor} />
          </Box>
        ))}
        <Box
          ref={setTimedDroppableRef}
          data-droppable-id={`calendar-day:${date.toISOString()}`}
          position="absolute"
          left={16}
          right={2}
          top={0}
          bottom={0}
          bg={isTimedOver ? overBg : "transparent"}
          borderRadius="md"
          transition="background-color 0.2s"
        >
          {calculateTaskPositions(dayTasks, HOUR_HEIGHT).map((task, index) => (
            <CalendarTask
              key={task.id}
              task={task}
              index={index}
              onTaskClick={onTaskClick}
              onTaskDurationChange={onTaskDurationChange}
              HOUR_HEIGHT={HOUR_HEIGHT}
            />
          ))}
        </Box>
      </Box>
    </Flex>
  );
};

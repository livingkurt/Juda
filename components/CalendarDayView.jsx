"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  formatTime,
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";
const HOUR_HEIGHT = 64;
const DRAG_THRESHOLD = 5;

// Draggable untimed task component
const UntimedTask = ({ task, onTaskClick, createDraggableId, date }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p={2}
      borderRadius="md"
      bg={task.color || "#3b82f6"}
      color="white"
      cursor="grab"
      boxShadow="sm"
      onClick={() => onTaskClick(task)}
    >
      <Text fontSize="sm" fontWeight="medium">
        {task.title}
      </Text>
    </Box>
  );
};

// Draggable timed task component
const TimedTask = ({
  task,
  onTaskClick,
  createDraggableId,
  date,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, date),
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
      fontSize="sm"
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "lg" }}
      bg={task.color || "#3b82f6"}
      style={style}
      boxShadow={internalDrag.taskId === task.id ? "xl" : "none"}
      zIndex={internalDrag.taskId === task.id ? 50 : "auto"}
      onClick={e => e.stopPropagation()}
    >
      {/* Task content - drag handle for cross-container DnD */}
      <Box
        {...attributes}
        {...listeners}
        position="absolute"
        inset={0}
        px={2}
        py={1}
        cursor="grab"
        onClick={e => {
          e.stopPropagation();
          onTaskClick(task);
        }}
      >
        <Text fontWeight="medium" isTruncated>
          {task.title}
        </Text>
        {(task.duration || 30) >= 45 && (
          <Text fontSize="xs" opacity={0.8}>
            {formatTime(task.time)}
          </Text>
        )}
      </Box>

      {/* Resize handle */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h={3}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.200" }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        onMouseDown={e => {
          if (!isDragging) {
            handleInternalDragStart(e, task, "resize");
          }
        }}
        onClick={e => e.stopPropagation()}
      >
        <Box w={8} h={1} borderRadius="full" bg="whiteAlpha.500" />
      </Box>
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
  createDroppableId,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");
  const hourTextColor = useColorModeValue("gray.400", "gray.500");
  const hourBorderColor = useColorModeValue("gray.100", "gray.700");

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, date));
  const untimedTasks = tasks.filter(t => !t.time && shouldShowOnDate(t, date));
  const containerRef = useRef(null);

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

  const getTaskStyle = task => {
    const isDragging = internalDrag.taskId === task.id;
    const minutes =
      isDragging && internalDrag.type === "move"
        ? internalDrag.currentMinutes
        : timeToMinutes(task.time);
    const duration =
      isDragging && internalDrag.type === "resize"
        ? internalDrag.currentDuration
        : task.duration || 30;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 24)}px`,
      backgroundColor: task.color || "#3b82f6",
    };
  };

  // Start internal drag for time adjustment
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
        const newMinutes = snapToIncrement(
          internalDrag.startMinutes + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
        setInternalDrag(prev => ({
          ...prev,
          currentMinutes: Math.max(
            0,
            Math.min(24 * 60 - prev.startDuration, newMinutes)
          ),
          hasMoved: hasMoved || prev.hasMoved,
        }));
      } else {
        const newDuration = snapToIncrement(
          internalDrag.startDuration + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
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

    const { taskId, type, currentMinutes, currentDuration, hasMoved } =
      internalDrag;

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
        onTaskTimeChange(taskId, minutesToTime(currentMinutes));
      } else {
        onTaskDurationChange(taskId, currentDuration);
      }
    } else {
      // Click without drag - open task editor
      const task = dayTasks.find(t => t.id === taskId);
      if (task) {
        setTimeout(() => onTaskClick(task), 100);
      }
    }
  }, [
    internalDrag,
    onTaskTimeChange,
    onTaskDurationChange,
    dayTasks,
    onTaskClick,
  ]);

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

  // Click on empty calendar space to create task
  const handleCalendarClick = e => {
    if (internalDrag.taskId || internalDrag.hasMoved) return;
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const minutes = snapToIncrement((y / HOUR_HEIGHT) * 60, 15);
    onCreateTask(minutesToTime(minutes), date);
  };

  // Calculate drop time from mouse position
  const handleDropTimeCalculation = (e, rect) => {
    const y = e.clientY - rect.top;
    const minutes = Math.max(
      0,
      Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60))
    );
    const snappedMinutes = snapToIncrement(minutes, 15);
    if (onDropTimeChange) {
      onDropTimeChange(minutesToTime(snappedMinutes));
    }
  };

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
    <Flex direction="column" h="full">
      {/* Day header */}
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
        <Text fontSize="sm" color={hourTextColor}>
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </Text>
      </Box>

      {/* Untimed tasks area */}
      <Box
        ref={setUntimedRef}
        px={4}
        py={2}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={isOverUntimed ? dropHighlight : bgColor}
        minH={untimedTasks.length > 0 || isOverUntimed ? "auto" : "0"}
        transition="background-color 0.2s"
      >
        {(untimedTasks.length > 0 || isOverUntimed) && (
          <VStack align="stretch" spacing={2}>
            <Text fontSize="xs" color={hourTextColor} fontWeight="medium">
              All Day
            </Text>
            {untimedTasks.map(task => (
              <UntimedTask
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                createDraggableId={createDraggableId}
                date={date}
              />
            ))}
            {isOverUntimed && untimedTasks.length === 0 && (
              <Text
                fontSize="xs"
                color={hourTextColor}
                textAlign="center"
                py={2}
              >
                Drop here for all-day task
              </Text>
            )}
          </VStack>
        )}
      </Box>

      {/* Timed calendar grid */}
      <Box
        ref={containerRef}
        flex={1}
        overflowY="auto"
        position="relative"
        style={{ height: `${24 * HOUR_HEIGHT}px` }}
      >
        {/* Hour lines */}
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

        {/* Droppable timed area */}
        <Box
          ref={setTimedRef}
          position="absolute"
          left={16}
          right={2}
          top={0}
          bottom={0}
          bg={isOverTimed ? dropHighlight : "transparent"}
          borderRadius="md"
          transition="background-color 0.2s"
          onClick={handleCalendarClick}
          onMouseMove={e => {
            if (isOverTimed) {
              handleDropTimeCalculation(
                e,
                e.currentTarget.getBoundingClientRect()
              );
            }
          }}
        >
          {/* Render positioned tasks */}
          {calculateTaskPositions(dayTasks, HOUR_HEIGHT).map(task => (
            <TimedTask
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              createDraggableId={createDraggableId}
              date={date}
              getTaskStyle={getTaskStyle}
              internalDrag={internalDrag}
              handleInternalDragStart={handleInternalDragStart}
            />
          ))}
        </Box>
      </Box>
    </Flex>
  );
};

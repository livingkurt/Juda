"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import {
  formatTime,
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";

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
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, date));
  const untimedTasks = tasks.filter(t => !t.time && shouldShowOnDate(t, date));
  const containerRef = useRef(null);
  const HOUR_HEIGHT = 64;
  const DRAG_THRESHOLD = 5;

  const [dragState, setDragState] = useState({
    taskId: null,
    type: null,
    startY: 0,
    startMinutes: 0,
    startDuration: 0,
    currentMinutes: 0,
    currentDuration: 0,
    hasMoved: false,
  });

  const getTaskStyle = task => {
    const isDragging = dragState.taskId === task.id;
    const minutes =
      isDragging && dragState.type === "move"
        ? dragState.currentMinutes
        : timeToMinutes(task.time);
    const duration =
      isDragging && dragState.type === "resize"
        ? dragState.currentDuration
        : task.duration || 30;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 24)}px`,
      backgroundColor: task.color || "#3b82f6",
    };
  };

  const handleMouseDown = (e, task, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
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

  const handleMove = useCallback(
    clientY => {
      if (!dragState.taskId) return;
      const deltaY = clientY - dragState.startY;
      const hasMoved = Math.abs(deltaY) > DRAG_THRESHOLD;
      if (dragState.type === "move") {
        const newMinutes = snapToIncrement(
          dragState.startMinutes + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
        setDragState(prev => ({
          ...prev,
          currentMinutes: Math.max(
            0,
            Math.min(24 * 60 - prev.startDuration, newMinutes)
          ),
          hasMoved: hasMoved || prev.hasMoved,
        }));
      } else {
        const newDuration = snapToIncrement(
          dragState.startDuration + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
        setDragState(prev => ({
          ...prev,
          currentDuration: Math.max(15, newDuration),
          hasMoved: hasMoved || prev.hasMoved,
        }));
      }
    },
    [
      dragState.taskId,
      dragState.type,
      dragState.startY,
      dragState.startMinutes,
      dragState.startDuration,
    ]
  );

  const handleEnd = useCallback(() => {
    if (!dragState.taskId) return;
    const wasDragging = dragState.hasMoved;
    const taskId = dragState.taskId;
    const taskType = dragState.type;
    const currentMinutes = dragState.currentMinutes;
    const currentDuration = dragState.currentDuration;

    // Reset drag state first
    setDragState({
      taskId: null,
      type: null,
      startY: 0,
      startMinutes: 0,
      startDuration: 0,
      currentMinutes: 0,
      currentDuration: 0,
      hasMoved: false,
    });

    if (wasDragging) {
      // Handle drag completion
      if (taskType === "move")
        onTaskTimeChange(taskId, minutesToTime(currentMinutes));
      else onTaskDurationChange(taskId, currentDuration);
    } else {
      // If no drag happened, open modal after a short delay
      setTimeout(() => {
        const task = dayTasks.find(t => t.id === taskId);
        if (task) {
          onTaskClick(task);
        }
      }, 150);
    }
  }, [
    dragState,
    onTaskTimeChange,
    onTaskDurationChange,
    dayTasks,
    onTaskClick,
  ]);

  useEffect(() => {
    if (!dragState.taskId) return;
    const onMouseMove = e => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragState.taskId, handleMove, handleEnd]);

  const handleCalendarClick = e => {
    if (dragState.taskId || dragState.hasMoved) return;
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
        <Text fontSize="sm" color={useColorModeValue("gray.500", "gray.400")}>
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </Text>
      </Box>
      {/* Untimed tasks at the top */}
      {untimedTasks.length > 0 && (
        <Droppable
          droppableId={`calendar-day-untimed:${date.toISOString()}`}
          type="TASK"
        >
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              px={4}
              py={2}
              borderBottomWidth="1px"
              borderColor={borderColor}
              bg={
                snapshot.isDraggingOver
                  ? useColorModeValue("blue.50", "blue.900")
                  : bgColor
              }
            >
              <VStack align="stretch" spacing={2}>
                {untimedTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        p={2}
                        borderRadius="md"
                        bg={
                          snapshot.isDragging
                            ? useColorModeValue("blue.100", "blue.800")
                            : task.color || "#3b82f6"
                        }
                        color="white"
                        cursor="grab"
                        boxShadow={snapshot.isDragging ? "lg" : "sm"}
                        onClick={e => {
                          e.stopPropagation();
                          onTaskClick(task);
                        }}
                        onMouseDown={e => {
                          // Only start drag if clicking on the box itself, not if it's from another drag
                          if (!provided.dragHandleProps.onMouseDown) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        <Box
                          {...provided.dragHandleProps}
                          cursor="grab"
                          _active={{ cursor: "grabbing" }}
                        >
                          <Text fontSize="sm" fontWeight="medium">
                            {task.title}
                          </Text>
                        </Box>
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </VStack>
            </Box>
          )}
        </Droppable>
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
              color={useColorModeValue("gray.400", "gray.500")}
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
        <Droppable
          droppableId={`calendar-day:${date.toISOString()}`}
          type="TASK"
          isDropDisabled={false}
        >
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              position="absolute"
              left={16}
              right={2}
              top={0}
              bottom={0}
              bg={
                snapshot.isDraggingOver
                  ? useColorModeValue("blue.50", "blue.900")
                  : "transparent"
              }
              borderRadius="md"
              transition="background-color 0.2s"
              onMouseMove={e => {
                // Calculate time based on mouse position for external drags
                if (snapshot.isDraggingOver) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minutes = Math.max(
                    0,
                    Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60))
                  );
                  const snappedMinutes = snapToIncrement(minutes, 15);
                  const calculatedTime = minutesToTime(snappedMinutes);
                  // Store time via callback
                  if (onDropTimeChange) {
                    onDropTimeChange(calculatedTime);
                  }
                }
              }}
            >
              {calculateTaskPositions(dayTasks, HOUR_HEIGHT).map(
                (task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
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
                          ...getTaskStyle(task),
                          ...provided.draggableProps.style,
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          // Only open modal if this task was clicked (not dragged)
                          // The handleEnd callback will handle opening the modal for non-dragged clicks
                        }}
                        boxShadow={
                          snapshot.isDragging ||
                          (dragState.taskId === task.id && dragState.hasMoved)
                            ? "xl"
                            : "none"
                        }
                        zIndex={
                          snapshot.isDragging ||
                          (dragState.taskId === task.id && dragState.hasMoved)
                            ? 50
                            : "auto"
                        }
                        opacity={snapshot.isDragging ? 0.8 : 1}
                      >
                        <Box
                          position="absolute"
                          inset={0}
                          px={2}
                          py={1}
                          cursor="grab"
                          {...provided.dragHandleProps}
                          onMouseDown={e => {
                            // If @hello-pangea/dnd is handling the drag, don't start internal drag
                            // The dragHandleProps.onMouseDown will be called first by @hello-pangea/dnd
                            // So we check if the event is already being handled
                            if (
                              provided.dragHandleProps &&
                              provided.dragHandleProps.onMouseDown
                            ) {
                              // Let @hello-pangea/dnd handle it - don't prevent default or stop propagation
                              return;
                            }
                            // Only handle mouse down for internal calendar drags (time/duration adjustments)
                            e.preventDefault();
                            e.stopPropagation();
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
                            // Only handle resize if not dragging with @hello-pangea/dnd
                            if (!snapshot.isDragging) {
                              handleMouseDown(e, task, "resize");
                            }
                            e.stopPropagation();
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Box
                            w={8}
                            h={1}
                            borderRadius="full"
                            bg="whiteAlpha.500"
                          />
                        </Box>
                      </Box>
                    )}
                  </Draggable>
                )
              )}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </Box>
    </Flex>
  );
};

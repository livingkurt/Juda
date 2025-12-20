"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

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
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date();
  const containerRef = useRef(null);
  const HOUR_HEIGHT = 48;
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

  const getTasksForDay = day =>
    tasks.filter(t => t.time && shouldShowOnDate(t, day));

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
      height: `${Math.max((duration / 60) * HOUR_HEIGHT, 18)}px`,
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
      // If no drag happened, find and open the task modal
      setTimeout(() => {
        // Find the task in any of the days
        let task = null;
        for (const day of weekDays) {
          const dayTasks = getTasksForDay(day);
          task = dayTasks.find(t => t.id === taskId);
          if (task) break;
        }
        // Fallback to all tasks if not found in day tasks
        if (!task) {
          task = tasks.find(t => t.id === taskId);
        }
        if (task) {
          onTaskClick(task);
        }
      }, 150);
    }
  }, [
    dragState,
    onTaskTimeChange,
    onTaskDurationChange,
    getTasksForDay,
    weekDays,
    tasks,
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

  const handleColumnClick = (e, day) => {
    if (dragState.taskId || dragState.hasMoved) return;
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
        {weekDays.map((day, i) => {
          const untimedTasksForDay = tasks.filter(
            t => !t.time && shouldShowOnDate(t, day)
          );
          return (
            <Box
              key={i}
              flex={1}
              borderLeftWidth="1px"
              borderColor={borderColor}
            >
              <Box
                textAlign="center"
                py={2}
                cursor="pointer"
                _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                onClick={() => onDayClick(day)}
              >
                <Text
                  fontSize="xs"
                  color={useColorModeValue("gray.500", "gray.400")}
                >
                  {DAYS_OF_WEEK[i].short}
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
                    day.toDateString() === today.toDateString()
                      ? "white"
                      : "inherit"
                  }
                  borderRadius="full"
                  w={8}
                  h={8}
                  lineHeight="32px"
                >
                  {day.getDate()}
                </Box>
              </Box>
              {/* Untimed tasks at the top of each day */}
              {untimedTasksForDay.length > 0 && (
                <Droppable
                  droppableId={`calendar-week-untimed:${day.toISOString()}`}
                  type="TASK"
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      px={1}
                      py={1}
                      borderTopWidth="1px"
                      borderColor={borderColor}
                      bg={
                        snapshot.isDraggingOver
                          ? useColorModeValue("blue.50", "blue.900")
                          : "transparent"
                      }
                    >
                      <VStack align="stretch" spacing={1}>
                        {untimedTasksForDay.map((task, taskIdx) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={taskIdx}
                          >
                            {(provided, snapshot) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                p={1}
                                borderRadius="sm"
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
                                  <Text
                                    fontSize="2xs"
                                    fontWeight="medium"
                                    noOfLines={2}
                                  >
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
            </Box>
          );
        })}
      </Flex>
      <Box ref={containerRef} flex={1} overflowY="auto">
        <Box position="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {hours.map(hour => (
            <Box
              key={hour}
              position="absolute"
              w="full"
              borderTopWidth="1px"
              borderColor={useColorModeValue("gray.100", "gray.700")}
              display="flex"
              style={{
                top: `${hour * HOUR_HEIGHT}px`,
                height: `${HOUR_HEIGHT}px`,
              }}
            >
              <Box
                w={12}
                fontSize="xs"
                color={useColorModeValue("gray.400", "gray.500")}
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
              <Droppable
                key={i}
                droppableId={`calendar-week:${day.toISOString()}`}
                type="TASK"
              >
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    flex={1}
                    borderLeftWidth="1px"
                    borderColor={borderColor}
                    position="relative"
                    onClick={e => {
                      // Prevent click when dragging to avoid view change
                      if (snapshot.isDraggingOver) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      handleColumnClick(e, day);
                    }}
                    bg={
                      snapshot.isDraggingOver
                        ? useColorModeValue("blue.50", "blue.900")
                        : "transparent"
                    }
                    transition="background-color 0.2s"
                    onMouseMove={e => {
                      // Calculate time based on mouse position for external drags
                      if (snapshot.isDraggingOver) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const minutes = Math.max(
                          0,
                          Math.min(
                            24 * 60 - 1,
                            Math.floor((y / HOUR_HEIGHT) * 60)
                          )
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
                    {calculateTaskPositions(
                      getTasksForDay(day),
                      HOUR_HEIGHT
                    ).map((task, taskIndex) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={taskIndex}
                      >
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
                            fontSize="xs"
                            overflow="hidden"
                            cursor="grab"
                            _hover={{ shadow: "md" }}
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
                              (dragState.taskId === task.id &&
                                dragState.hasMoved)
                                ? "xl"
                                : "none"
                            }
                            zIndex={
                              snapshot.isDragging ||
                              (dragState.taskId === task.id &&
                                dragState.hasMoved)
                                ? 50
                                : "auto"
                            }
                            opacity={snapshot.isDragging ? 0.8 : 1}
                          >
                            <Box
                              position="absolute"
                              inset={0}
                              px={1}
                              py={0.5}
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
                                // Only handle resize if not dragging with @hello-pangea/dnd
                                if (!snapshot.isDragging) {
                                  handleMouseDown(e, task, "resize");
                                }
                                e.stopPropagation();
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            ))}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

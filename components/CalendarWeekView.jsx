"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, VStack, useColorModeValue } from "@chakra-ui/react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import {
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
  calculateTaskPositions,
} from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

const HOUR_HEIGHT = 48;
const DRAG_THRESHOLD = 5;

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

  const getTasksForDay = day => tasks.filter(t => t.time && shouldShowOnDate(t, day));
  const getUntimedTasksForDay = day => tasks.filter(t => !t.time && shouldShowOnDate(t, day));

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
        const newMinutes = snapToIncrement(
          internalDrag.startMinutes + (deltaY / HOUR_HEIGHT) * 60,
          15
        );
        setInternalDrag(prev => ({
          ...prev,
          currentMinutes: Math.max(0, Math.min(24 * 60 - prev.startDuration, newMinutes)),
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
  }, [internalDrag, onTaskTimeChange, onTaskDurationChange, weekDays, tasks, onTaskClick]);

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
          const untimedTasksForDay = getUntimedTasksForDay(day);
          const isToday = day.toDateString() === today.toDateString();
          const untimedDroppableId = createDroppableId.calendarWeekUntimed(day);
          
          return (
            <Box key={i} flex={1} borderLeftWidth="1px" borderColor={borderColor}>
              {/* Day header */}
              <Box
                textAlign="center"
                py={2}
                cursor="pointer"
                _hover={{ bg: hoverBg }}
                onClick={() => onDayClick(day)}
              >
                <Text fontSize="xs" color={hourTextColor}>
                  {DAYS_OF_WEEK[i].short}
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
              <Droppable droppableId={untimedDroppableId} type="TASK">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    px={1}
                    py={1}
                    borderTopWidth="1px"
                    borderColor={borderColor}
                    bg={snapshot.isDraggingOver ? dropHighlight : "transparent"}
                    minH={untimedTasksForDay.length > 0 || snapshot.isDraggingOver ? "40px" : "0"}
                    transition="background-color 0.2s"
                  >
                    <VStack align="stretch" spacing={1}>
                      {untimedTasksForDay.map((task, taskIdx) => (
                        <Draggable key={task.id} draggableId={task.id} index={taskIdx}>
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              p={1}
                              borderRadius="sm"
                              bg={snapshot.isDragging ? dropHighlight : task.color || "#3b82f6"}
                              color="white"
                              cursor="grab"
                              boxShadow={snapshot.isDragging ? "lg" : "sm"}
                              onClick={e => {
                                e.stopPropagation();
                                onTaskClick(task);
                              }}
                            >
                              <Text fontSize="2xs" fontWeight="medium" noOfLines={2}>
                                {task.title}
                              </Text>
                            </Box>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </VStack>
                  </Box>
                )}
              </Droppable>
            </Box>
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

          {/* Day columns */}
          <Flex position="absolute" left={12} right={0} top={0} bottom={0}>
            {weekDays.map((day, i) => {
              const timedDroppableId = createDroppableId.calendarWeek(day);
              const dayTasks = getTasksForDay(day);
              
              return (
                <Droppable key={i} droppableId={timedDroppableId} type="TASK">
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      flex={1}
                      borderLeftWidth="1px"
                      borderColor={borderColor}
                      position="relative"
                      onClick={e => {
                        if (!snapshot.isDraggingOver) {
                          handleColumnClick(e, day);
                        }
                      }}
                      bg={snapshot.isDraggingOver ? dropHighlight : "transparent"}
                      transition="background-color 0.2s"
                      onMouseMove={e => {
                        if (snapshot.isDraggingOver) {
                          handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
                        }
                      }}
                    >
                      {/* Render tasks */}
                      {calculateTaskPositions(dayTasks, HOUR_HEIGHT).map((task, taskIndex) => (
                        <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                          {(dragProvided, dragSnapshot) => (
                            <Box
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
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
                                ...dragProvided.draggableProps.style,
                              }}
                              boxShadow={
                                dragSnapshot.isDragging || internalDrag.taskId === task.id
                                  ? "xl"
                                  : "none"
                              }
                              zIndex={
                                dragSnapshot.isDragging || internalDrag.taskId === task.id
                                  ? 50
                                  : "auto"
                              }
                              opacity={dragSnapshot.isDragging ? 0.8 : 1}
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Task content */}
                              <Box
                                {...dragProvided.dragHandleProps}
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
                                  if (!dragSnapshot.isDragging) {
                                    handleInternalDragStart(e, task, "resize");
                                  }
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
              );
            })}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

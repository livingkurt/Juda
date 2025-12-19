"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text, Flex, useColorModeValue } from "@chakra-ui/react";
import {
  timeToMinutes,
  minutesToTime,
  snapToIncrement,
  shouldShowOnDate,
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
    if (dragState.hasMoved) {
      if (dragState.type === "move")
        onTaskTimeChange(
          dragState.taskId,
          minutesToTime(dragState.currentMinutes)
        );
      else onTaskDurationChange(dragState.taskId, dragState.currentDuration);
    }
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
  }, [dragState, onTaskTimeChange, onTaskDurationChange]);

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
        {weekDays.map((day, i) => (
          <Box
            key={i}
            flex={1}
            textAlign="center"
            py={2}
            borderLeftWidth="1px"
            borderColor={borderColor}
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
        ))}
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
              <Box
                key={i}
                flex={1}
                borderLeftWidth="1px"
                borderColor={borderColor}
                position="relative"
                onClick={e => handleColumnClick(e, day)}
              >
                {getTasksForDay(day).map(task => (
                  <Box
                    key={task.id}
                    position="absolute"
                    left={1}
                    right={1}
                    borderRadius="md"
                    color="white"
                    fontSize="xs"
                    overflow="hidden"
                    cursor="pointer"
                    _hover={{ shadow: "md" }}
                    style={getTaskStyle(task)}
                    onClick={e => {
                      e.stopPropagation();
                      if (!dragState.hasMoved) onTaskClick(task);
                    }}
                    boxShadow={
                      dragState.taskId === task.id && dragState.hasMoved
                        ? "xl"
                        : "none"
                    }
                    zIndex={
                      dragState.taskId === task.id && dragState.hasMoved
                        ? 50
                        : "auto"
                    }
                  >
                    <Box
                      position="absolute"
                      inset={0}
                      px={1}
                      py={0.5}
                      cursor="grab"
                      onMouseDown={e => handleMouseDown(e, task, "move")}
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
                      onMouseDown={e => handleMouseDown(e, task, "resize")}
                      onClick={e => e.stopPropagation()}
                    />
                  </Box>
                ))}
              </Box>
            ))}
          </Flex>
        </Box>
      </Box>
    </Flex>
  );
};

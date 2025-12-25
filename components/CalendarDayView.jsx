"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Text, Flex, VStack, HStack } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { timeToMinutes, minutesToTime, snapToIncrement, shouldShowOnDate, calculateTaskPositions } from "@/lib/utils";
import { HOUR_HEIGHT_DAY, DRAG_THRESHOLD } from "@/lib/calendarConstants";
import { UntimedTask } from "./UntimedTask";
import { TimedTask } from "./TimedTask";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";

const BASE_HOUR_HEIGHT = HOUR_HEIGHT_DAY;

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
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
  zoom = 1.0,
  tags = [],
  onCreateTag,
  onEditTask,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
  onUpdateTaskColor,
}) => {
  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoom;
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.700" };
  const dropHighlight = { _light: "blue.50", _dark: "blue.900" };
  const hourTextColor = { _light: "gray.400", _dark: "gray.500" };
  const hourBorderColor = { _light: "gray.100", _dark: "gray.700" };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Filter tasks by date and search term
  const filteredTasks = useMemo(() => {
    let dayTasks = tasks.filter(t => t.time && shouldShowOnDate(t, date));
    let untimedTasks = tasks.filter(t => !t.time && shouldShowOnDate(t, date));

    // Filter out completed/skipped tasks if showCompleted is false
    if (!showCompleted) {
      dayTasks = dayTasks.filter(task => {
        const isCompleted = isCompletedOnDate(task.id, date);
        const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, date) : null;
        const hasOutcome = outcome !== null && outcome !== undefined;
        return !isCompleted && !hasOutcome;
      });
      untimedTasks = untimedTasks.filter(task => {
        const isCompleted = isCompletedOnDate(task.id, date);
        const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, date) : null;
        const hasOutcome = outcome !== null && outcome !== undefined;
        return !isCompleted && !hasOutcome;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      dayTasks = dayTasks.filter(task => task.title.toLowerCase().includes(lowerSearch));
      untimedTasks = untimedTasks.filter(task => task.title.toLowerCase().includes(lowerSearch));
    }

    // Filter by tags
    if (selectedTagIds.length > 0) {
      dayTasks = dayTasks.filter(task => task.tags?.some(tag => selectedTagIds.includes(tag.id)));
      untimedTasks = untimedTasks.filter(task => task.tags?.some(tag => selectedTagIds.includes(tag.id)));
    }

    return { dayTasks, untimedTasks };
  }, [tasks, date, showCompleted, isCompletedOnDate, getOutcomeOnDate, searchTerm, selectedTagIds]);

  const handleTagSelect = useCallback(tagId => {
    setSelectedTagIds(prev => [...prev, tagId]);
  }, []);

  const handleTagDeselect = useCallback(tagId => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  const { dayTasks, untimedTasks } = filteredTasks;

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
    const minutes = isDragging && internalDrag.type === "move" ? internalDrag.currentMinutes : timeToMinutes(task.time);
    const duration =
      isDragging && internalDrag.type === "resize" ? internalDrag.currentDuration : (task.duration ?? 30);
    const isNoDuration = duration === 0;
    return {
      top: `${(minutes / 60) * HOUR_HEIGHT}px`,
      height: `${isNoDuration ? 24 : Math.max((duration / 60) * HOUR_HEIGHT, 24)}px`,
      // Don't set backgroundColor here - let Chakra UI bg prop handle it for proper theming
    };
  };

  // Start internal drag for time adjustment
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
    [internalDrag, HOUR_HEIGHT]
  );

  const handleInternalDragEnd = useCallback(() => {
    if (!internalDrag.taskId) return;

    const { taskId, type, currentMinutes, currentDuration, hasMoved } = internalDrag;

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
  }, [internalDrag, onTaskTimeChange, onTaskDurationChange, dayTasks, onTaskClick]);

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
    const minutes = Math.max(0, Math.min(24 * 60 - 1, Math.floor((y / HOUR_HEIGHT) * 60)));
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
    <Flex direction="column" h="full" w="100%" maxW="100%" overflow="hidden">
      {/* Day header */}
      <Box
        textAlign="center"
        py={3}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={bgColor}
        flexShrink={0}
        w="100%"
        maxW="100%"
      >
        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold">
          {date.getDate()}
        </Text>
        <Text fontSize={{ base: "xs", md: "sm" }} color={hourTextColor} mb={3}>
          {date.toLocaleDateString("en-US", { weekday: "long", month: "long" })}
        </Text>
        <Box px={{ base: 2, md: 4 }} py={2} w="100%" maxW="100%">
          <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
            <Box flex={1} minW={0}>
              <TaskSearchInput onSearchChange={setSearchTerm} />
            </Box>
            <TagFilter
              tags={tags}
              selectedTagIds={selectedTagIds}
              onTagSelect={handleTagSelect}
              onTagDeselect={handleTagDeselect}
              onCreateTag={onCreateTag}
              compact
            />
          </HStack>
        </Box>
      </Box>

      {/* Untimed tasks area */}
      <Box
        ref={setUntimedRef}
        px={{ base: 2, md: 4 }}
        py={2}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={isOverUntimed ? dropHighlight : bgColor}
        minH={untimedTasks.length > 0 || isOverUntimed ? "auto" : "0"}
        transition="background-color 0.2s"
        w="100%"
        maxW="100%"
      >
        {(untimedTasks.length > 0 || isOverUntimed) && (
          <VStack align="stretch" spacing={2}>
            <Text fontSize={{ base: "2xs", md: "xs" }} color={hourTextColor} fontWeight="medium">
              All Day
            </Text>
            {untimedTasks.map(task => (
              <UntimedTask
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                createDraggableId={createDraggableId}
                date={date}
                isCompletedOnDate={isCompletedOnDate}
                getOutcomeOnDate={getOutcomeOnDate}
                onEditTask={onEditTask}
                onOutcomeChange={onOutcomeChange}
                onDuplicateTask={onDuplicateTask}
                onDeleteTask={onDeleteTask}
                onUpdateTaskColor={onUpdateTaskColor}
              />
            ))}
            {isOverUntimed && untimedTasks.length === 0 && (
              <Text fontSize={{ base: "2xs", md: "xs" }} color={hourTextColor} textAlign="center" py={2}>
                Drop here for all-day task
              </Text>
            )}
          </VStack>
        )}
      </Box>

      {/* Timed calendar grid */}
      <Box ref={containerRef} flex={1} overflowY="auto" w="100%" maxW="100%" minH={0}>
        <Box position="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
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
              <Box w={16} fontSize={{ base: "2xs", md: "xs" }} color={hourTextColor} pr={2} textAlign="right" pt={1}>
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
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
            data-calendar-timed="true"
            data-calendar-view="day"
            data-hour-height={HOUR_HEIGHT}
            key={`timed-area-${zoom}`}
            onMouseMove={e => {
              if (isOverTimed) {
                handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
              }
            }}
          >
            {/* Render positioned tasks */}
            {calculateTaskPositions(dayTasks).map(task => (
              <TimedTask
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                createDraggableId={createDraggableId}
                date={date}
                getTaskStyle={getTaskStyle}
                internalDrag={internalDrag}
                handleInternalDragStart={handleInternalDragStart}
                isCompletedOnDate={isCompletedOnDate}
                getOutcomeOnDate={getOutcomeOnDate}
                onEditTask={onEditTask}
                onOutcomeChange={onOutcomeChange}
                onDuplicateTask={onDuplicateTask}
                onDeleteTask={onDeleteTask}
                onUpdateTaskColor={onUpdateTaskColor}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { UntimedWeekTask } from "./UntimedWeekTask";

export const DayHeaderColumn = ({
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
  isCompletedOnDate,
  getOutcomeOnDate,
  onEditTask,
  onEditWorkout,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
  tags,
  onTagsChange,
  onCreateTag,
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
      borderLeftWidth={dayIndex === 0 ? "0" : isToday ? "1.5px" : "1px"}
      borderRightWidth={isToday ? "1.5px" : "0"}
      borderColor={isToday ? "blue.300" : borderColor}
      bg={isToday ? { _light: "rgba(59, 130, 246, 0.1)", _dark: "rgba(37, 99, 235, 0.15)" } : "transparent"}
    >
      {/* Day header */}
      <Box
        textAlign="center"
        py={2}
        cursor="pointer"
        _hover={{ bg: isToday ? { _light: "rgba(59, 130, 246, 0.15)", _dark: "rgba(37, 99, 235, 0.2)" } : hoverBg }}
        onClick={() => onDayClick(day)}
        bg={isToday ? { _light: "rgba(59, 130, 246, 0.12)", _dark: "rgba(37, 99, 235, 0.18)" } : "transparent"}
      >
        <Text
          fontSize={{ base: "2xs", md: "xs" }}
          color={isToday ? { _light: "blue.600", _dark: "blue.300" } : hourTextColor}
          fontWeight={isToday ? "medium" : "normal"}
        >
          {DAYS_OF_WEEK[dayIndex].short}
        </Text>
        <Box
          as="span"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight={isToday ? "semibold" : "normal"}
          display="inline-block"
          bg={isToday ? "blue.400" : "transparent"}
          color={isToday ? "white" : "inherit"}
          borderRadius="full"
          w={8}
          h={8}
          lineHeight="32px"
          boxShadow={isToday ? "sm" : "none"}
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
        bg={
          isOver
            ? dropHighlight
            : isToday
              ? { _light: "rgba(59, 130, 246, 0.1)", _dark: "rgba(37, 99, 235, 0.15)" }
              : "transparent"
        }
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
              isCompletedOnDate={isCompletedOnDate}
              getOutcomeOnDate={getOutcomeOnDate}
              onEditTask={onEditTask}
              onEditWorkout={onEditWorkout}
              onOutcomeChange={onOutcomeChange}
              onDuplicateTask={onDuplicateTask}
              onDeleteTask={onDeleteTask}
              tags={tags}
              onTagsChange={onTagsChange}
              onCreateTag={onCreateTag}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

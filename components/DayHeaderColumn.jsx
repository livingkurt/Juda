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
      minW={{ base: "60px", md: 0 }}
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
              isCompletedOnDate={isCompletedOnDate}
              getOutcomeOnDate={getOutcomeOnDate}
            />
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

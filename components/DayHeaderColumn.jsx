"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { UntimedWeekTask } from "./UntimedWeekTask";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const DayHeaderColumn = ({
  day,
  dayIndex,
  untimedTasks,
  isToday,
  onDayClick,
  createDroppableId,
  createDraggableId,
  borderColor,
  dropHighlight,
  hourTextColor,
  hoverBg,
}) => {
  const { mode, calendar, interactive } = useSemanticColors();
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
      borderColor={isToday ? calendar.today : borderColor}
      bg={isToday ? calendar.todayBg : "transparent"}
    >
      {/* Day header */}
      <Box
        textAlign="center"
        py={2}
        cursor="pointer"
        _hover={{ bg: isToday ? calendar.selected : hoverBg }}
        onClick={() => onDayClick(day)}
        bg={isToday ? calendar.todayBg : "transparent"}
      >
        <Text
          fontSize={{ base: "2xs", md: "xs" }}
          color={isToday ? interactive.primary : hourTextColor}
          fontWeight={isToday ? "medium" : "normal"}
        >
          {DAYS_OF_WEEK[dayIndex].short}
        </Text>
        <Box
          as="span"
          fontSize={{ base: "md", md: "lg" }}
          fontWeight={isToday ? "semibold" : "normal"}
          display="inline-block"
          bg={isToday ? calendar.today : "transparent"}
          color={isToday ? mode.text.inverse : "inherit"}
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
        px={0.5}
        py={0.5}
        borderTopWidth="1px"
        borderColor={borderColor}
        bg={isOver ? dropHighlight : isToday ? calendar.todayBg : "transparent"}
        minH={untimedTasks.length > 0 || isOver ? "auto" : "0"}
        maxH="80px"
        overflowY="auto"
        transition="background-color 0.2s"
        flexShrink={0}
      >
        <VStack align="stretch" spacing={0.5}>
          {untimedTasks.map(task => (
            <UntimedWeekTask key={task.id} task={task} createDraggableId={createDraggableId} day={day} />
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

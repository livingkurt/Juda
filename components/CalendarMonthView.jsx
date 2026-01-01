"use client";

import { Box, Flex, SimpleGrid } from "@chakra-ui/react";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

export const CalendarMonthView = ({
  date,
  tasks,
  onDayClick,
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
  zoom = 1.0,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.700" };
  const hoverBg = { _light: "gray.50", _dark: "gray.700" };
  const textColor = { _light: "gray.900", _dark: "gray.200" };
  const mutedText = { _light: "gray.400", _dark: "gray.600" };
  const dayHeaderColor = { _light: "gray.500", _dark: "gray.400" };
  const nonCurrentMonthBg = { _light: "gray.50", _dark: "gray.850" };

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const weeks = [];
  const current = new Date(startDate);
  while (current <= lastDay || weeks.length < 6) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 6) break;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Flex direction="column" h="full" w="100%" maxW="100%" overflow="hidden">
      <SimpleGrid columns={7} borderBottomWidth="1px" borderColor={borderColor} bg={bgColor} w="100%" maxW="100%">
        {DAYS_OF_WEEK.map(day => (
          <Box
            key={day.value}
            textAlign="center"
            py={2}
            fontSize={{ base: "xs", md: "sm" }}
            fontWeight="medium"
            color={dayHeaderColor}
          >
            {day.label}
          </Box>
        ))}
      </SimpleGrid>
      <Box flex={1}>
        {weeks.map((week, wi) => (
          <SimpleGrid key={wi} columns={7} borderBottomWidth="1px" borderColor={borderColor}>
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === month;
              const isToday = day.toDateString() === today.toDateString();
              let dayTasks = tasks.filter(t => shouldShowOnDate(t, day));
              // Filter out completed/not completed tasks if showCompleted is false
              if (!showCompleted) {
                dayTasks = dayTasks.filter(task => {
                  const isCompleted = isCompletedOnDate(task.id, day);
                  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
                  const hasOutcome = outcome !== null && outcome !== undefined;
                  return !isCompleted && !hasOutcome;
                });
              }
              dayTasks = dayTasks.slice(0, 3);
              return (
                <Box
                  key={di}
                  borderTopWidth={isToday ? "1.5px" : "1px"}
                  borderBottomWidth={isToday ? "1.5px" : "1px"}
                  borderLeftWidth={isToday ? "1.5px" : "1px"}
                  borderRightWidth={isToday ? "1.5px" : "1px"}
                  borderColor={isToday ? "blue.300" : borderColor}
                  p={1}
                  minH={`${80 * zoom}px`}
                  cursor="pointer"
                  _hover={{
                    bg: isToday ? { _light: "rgba(59, 130, 246, 0.15)", _dark: "rgba(37, 99, 235, 0.2)" } : hoverBg,
                  }}
                  bg={
                    isToday
                      ? { _light: "rgba(59, 130, 246, 0.1)", _dark: "rgba(37, 99, 235, 0.15)" }
                      : !isCurrentMonth
                        ? nonCurrentMonthBg
                        : "transparent"
                  }
                  onClick={() => onDayClick(day)}
                >
                  <Box
                    as="span"
                    fontSize={{
                      base: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
                      md: zoom >= 1.5 ? "md" : zoom >= 1.0 ? "sm" : "xs",
                    }}
                    mb={1}
                    display="inline-block"
                    bg={isToday ? "blue.400" : "transparent"}
                    color={isToday ? "white" : !isCurrentMonth ? mutedText : textColor}
                    borderRadius="full"
                    w={6 * zoom}
                    h={6 * zoom}
                    lineHeight={`${24 * zoom}px`}
                    textAlign="center"
                    fontWeight={isToday ? "semibold" : "normal"}
                    boxShadow={isToday ? "sm" : "none"}
                  >
                    {day.getDate()}
                  </Box>
                  {dayTasks.map(task => (
                    <Box
                      key={task.id}
                      fontSize={{
                        base: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
                        md: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
                      }}
                      px={1}
                      py={0.5}
                      borderRadius="md"
                      isTruncated
                      color={getTaskDisplayColor(task) ? "white" : undefined}
                      mb={0.5}
                      bg={getTaskDisplayColor(task) || "gray.200"}
                      _dark={{ bg: getTaskDisplayColor(task) || "gray.700" }}
                    >
                      {task.title}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </SimpleGrid>
        ))}
      </Box>
    </Flex>
  );
};

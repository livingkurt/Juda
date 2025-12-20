"use client";

import { Box, Flex, SimpleGrid, useColorModeValue } from "@chakra-ui/react";
import { shouldShowOnDate } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

export const CalendarMonthView = ({ date, tasks, onDayClick }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.900", "gray.200");
  const mutedText = useColorModeValue("gray.400", "gray.600");
  const dayHeaderColor = useColorModeValue("gray.500", "gray.400");
  const nonCurrentMonthBg = useColorModeValue("gray.50", "gray.850");

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
    <Flex direction="column" h="full">
      <SimpleGrid columns={7} borderBottomWidth="1px" borderColor={borderColor} bg={bgColor}>
        {DAYS_OF_WEEK.map(day => (
          <Box key={day.value} textAlign="center" py={2} fontSize="sm" fontWeight="medium" color={dayHeaderColor}>
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
              const dayTasks = tasks.filter(t => shouldShowOnDate(t, day)).slice(0, 3);
              return (
                <Box
                  key={di}
                  borderRightWidth="1px"
                  borderColor={borderColor}
                  p={1}
                  minH="80px"
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  bg={!isCurrentMonth ? nonCurrentMonthBg : "transparent"}
                  onClick={() => onDayClick(day)}
                >
                  <Box
                    as="span"
                    fontSize="sm"
                    mb={1}
                    display="inline-block"
                    bg={isToday ? "blue.500" : "transparent"}
                    color={isToday ? "white" : !isCurrentMonth ? mutedText : textColor}
                    borderRadius="full"
                    w={6}
                    h={6}
                    lineHeight="24px"
                    textAlign="center"
                  >
                    {day.getDate()}
                  </Box>
                  {dayTasks.map(task => (
                    <Box
                      key={task.id}
                      fontSize="xs"
                      px={1}
                      py={0.5}
                      borderRadius="md"
                      isTruncated
                      color="white"
                      mb={0.5}
                      bg={task.color || "#3b82f6"}
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

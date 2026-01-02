"use client";

import { Box, Flex } from "@chakra-ui/react";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { MONTH_OPTIONS } from "@/lib/constants";

export const CalendarYearView = ({
  date,
  tasks,
  onDayClick,
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
}) => {
  // Color scheme
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.700" };
  const cellBg = { _light: "gray.50", _dark: "gray.700" };
  const cellHover = { _light: "gray.100", _dark: "gray.700" };
  const invalidCellBg = { _light: "gray.100", _dark: "gray.900" };
  const todayBorder = { _light: "blue.500", _dark: "blue.400" };
  const headerText = { _light: "gray.600", _dark: "gray.400" };
  const monthText = { _light: "gray.700", _dark: "gray.300" };

  const year = date.getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Days of month (1-31)
  const daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Check if a day exists in a given month
  const isValidDate = (month, day) => {
    // Month is 0-indexed (0 = January)
    const testDate = new Date(year, month, day);
    return testDate.getMonth() === month && testDate.getDate() === day;
  };

  // Get tasks for a specific date
  const getTasksForDate = (month, day) => {
    if (!isValidDate(month, day)) return [];
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    let dayTasks = tasks.filter(t => shouldShowOnDate(t, targetDate));

    // Filter completed if needed
    if (!showCompleted) {
      dayTasks = dayTasks.filter(task => {
        const isCompleted = isCompletedOnDate(task.id, targetDate);
        const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, targetDate) : null;
        const hasOutcome = outcome !== null && outcome !== undefined;
        return !isCompleted && !hasOutcome;
      });
    }

    return dayTasks;
  };

  // Check if date is today
  const isToday = (month, day) => {
    if (!isValidDate(month, day)) return false;
    const checkDate = new Date(year, month, day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  // Handle cell click
  const handleCellClick = (month, day) => {
    if (!isValidDate(month, day)) return;
    const clickedDate = new Date(year, month, day);
    clickedDate.setHours(0, 0, 0, 0);
    onDayClick(clickedDate);
  };

  // Get indicator color based on tasks
  const getIndicatorColor = dayTasks => {
    if (dayTasks.length === 0) return null;

    // If single task with tag, use tag color (returns hex string)
    if (dayTasks.length === 1 && dayTasks[0].tags?.length > 0) {
      const tagColor = getTaskDisplayColor(dayTasks[0]);
      if (tagColor) {
        // Convert hex string to object format for Chakra v3
        return { _light: tagColor, _dark: tagColor };
      }
    }

    // Multiple tasks or no tag - use intensity based on count
    const count = dayTasks.length;
    if (count >= 5) return { _light: "blue.600", _dark: "blue.400" };
    if (count >= 3) return { _light: "blue.400", _dark: "blue.500" };
    return { _light: "blue.200", _dark: "blue.700" };
  };

  // Cell size
  const cellSize = { base: "20px", md: "24px", lg: "28px" };

  return (
    <Flex direction="column" h="full" overflow="auto" bg={bgColor} p={2}>
      {/* Header row - Day numbers */}
      <Flex mb={1} pl={{ base: "40px", md: "60px" }}>
        {daysOfMonth.map(day => (
          <Box
            key={day}
            w={cellSize}
            minW={cellSize}
            textAlign="center"
            fontSize={{ base: "2xs", md: "xs" }}
            color={headerText}
            fontWeight="medium"
          >
            {day}
          </Box>
        ))}
      </Flex>

      {/* Month rows */}
      {MONTH_OPTIONS.map((monthOption, monthIndex) => (
        <Flex key={monthOption.value} align="center" mb={0.5}>
          {/* Month label */}
          <Box
            w={{ base: "40px", md: "60px" }}
            pr={2}
            fontSize={{ base: "2xs", md: "xs" }}
            fontWeight="medium"
            color={monthText}
            textAlign="right"
          >
            {monthOption.label.substring(0, 3)}
          </Box>

          {/* Day cells */}
          <Flex>
            {daysOfMonth.map(day => {
              const valid = isValidDate(monthIndex, day);
              const dayTasks = valid ? getTasksForDate(monthIndex, day) : [];
              const todayCell = isToday(monthIndex, day);
              const indicatorColor = getIndicatorColor(dayTasks);

              return (
                <Box
                  key={day}
                  w={cellSize}
                  h={cellSize}
                  minW={cellSize}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg={valid ? cellBg : invalidCellBg}
                  borderWidth={todayCell ? "2px" : "1px"}
                  borderColor={todayCell ? todayBorder : borderColor}
                  borderRadius="sm"
                  cursor={valid ? "pointer" : "default"}
                  opacity={valid ? 1 : 0.3}
                  _hover={valid ? { bg: cellHover } : {}}
                  onClick={() => handleCellClick(monthIndex, day)}
                  transition="all 0.15s"
                  title={
                    valid && dayTasks.length > 0
                      ? `${monthOption.label} ${day}: ${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  {indicatorColor && (
                    <Box
                      w={{ base: "6px", md: "8px" }}
                      h={{ base: "6px", md: "8px" }}
                      borderRadius="full"
                      bg={indicatorColor}
                    />
                  )}
                </Box>
              );
            })}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};


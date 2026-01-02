"use client";

import { Box, Flex, VStack } from "@chakra-ui/react";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { MONTH_OPTIONS } from "@/lib/constants";

export const CalendarYearView = ({
  date,
  tasks,
  onDayClick,
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
  zoom = 1.0,
}) => {
  // Color scheme
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.400", _dark: "gray.500" }; // More visible borders
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

  // Cell size based on zoom - use exact pixel values for alignment
  const baseCellWidth = 60;
  const cellWidth = baseCellWidth * zoom;
  const baseCellHeight = 80;
  const cellHeight = baseCellHeight * zoom;
  // Use exact pixel value to ensure header and cells align perfectly
  const cellSizePx = `${cellWidth}px`;
  const cellMinHeight = {
    base: `${cellHeight}px`,
    md: `${cellHeight * 1.2}px`,
    lg: `${cellHeight * 1.4}px`,
  };

  const textColor = { _light: "gray.900", _dark: "gray.200" };
  const mutedText = { _light: "gray.400", _dark: "gray.600" };

  return (
    <Flex direction="column" h="full" overflow="auto" bg={bgColor} p={2}>
      {/* Header row - Day numbers */}
      <Flex mb={0} pl={"32px"} position="sticky" top={0} bg={bgColor} zIndex={10} pb={0}>
        {daysOfMonth.map(day => (
          <Box
            key={day}
            w={cellSizePx}
            minW={cellSizePx}
            maxW={cellSizePx}
            h="auto"
            textAlign="left"
            fontSize={{
              base: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
              md: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
            }}
            pl={2}
            color={headerText}
            fontWeight="medium"
            borderTopWidth="2px"
            borderTopColor={borderColor}
            borderBottomWidth="1px"
            borderBottomColor={borderColor}
            borderLeftWidth={day === 1 ? "2px" : "1px"}
            borderLeftColor={borderColor}
            borderRightWidth={day === 31 ? "2px" : "1px"}
            borderRightColor={borderColor}
            py={1}
            bg={bgColor}
            boxSizing="border-box"
          >
            {day}
          </Box>
        ))}
      </Flex>

      {/* Month rows */}
      {MONTH_OPTIONS.map((monthOption, monthIndex) => (
        <Flex key={monthOption.value} align="flex-start" mb={0}>
          {/* Month label */}
          <Box
            w={{ base: "60px", md: "80px" }}
            pr={2}
            fontSize={{
              base: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
              md: zoom >= 1.5 ? "md" : zoom >= 1.0 ? "sm" : "xs",
            }}
            fontWeight="medium"
            color={monthText}
            textAlign="right"
            position="sticky"
            left={0}
            bg={bgColor}
            zIndex={5}
          >
            {monthOption.label.substring(0, 3)}
          </Box>

          {/* Day cells */}
          <Flex>
            {daysOfMonth.map(day => {
              const valid = isValidDate(monthIndex, day);
              const dayTasks = valid ? getTasksForDate(monthIndex, day) : [];
              const todayCell = isToday(monthIndex, day);
              // Limit tasks shown based on zoom
              const maxTasks = zoom >= 1.5 ? 5 : zoom >= 1.0 ? 3 : 2;
              const visibleTasks = dayTasks.slice(0, maxTasks);
              const remainingCount = dayTasks.length - visibleTasks.length;

              return (
                <Box
                  key={day}
                  w={cellSizePx}
                  minW={cellSizePx}
                  maxW={cellSizePx}
                  minH={cellMinHeight}
                  display="flex"
                  flexDirection="column"
                  bg={valid ? cellBg : invalidCellBg}
                  borderTopWidth={monthIndex === 0 ? "2px" : "1px"}
                  borderTopColor={todayCell ? todayBorder : borderColor}
                  borderBottomWidth={monthIndex === 11 ? "2px" : "1px"}
                  borderBottomColor={todayCell ? todayBorder : borderColor}
                  borderLeftWidth={day === 1 ? "2px" : "1px"}
                  borderLeftColor={todayCell ? todayBorder : borderColor}
                  borderRightWidth={day === 31 ? "2px" : "1px"}
                  borderRightColor={todayCell ? todayBorder : borderColor}
                  cursor={valid ? "pointer" : "default"}
                  opacity={valid ? 1 : 0.3}
                  _hover={valid ? { bg: cellHover } : {}}
                  onClick={() => handleCellClick(monthIndex, day)}
                  transition="all 0.15s"
                  p={zoom >= 1.0 ? 1 : 0.5}
                  position="relative"
                  boxSizing="border-box"
                  title={
                    valid && dayTasks.length > 0
                      ? `${monthOption.label} ${day}: ${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  {/* Day number */}
                  {valid && (
                    <Box
                      as="span"
                      fontSize={{
                        base: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
                        md: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
                      }}
                      mb={zoom >= 1.0 ? 0.5 : 0.25}
                      display="inline-block"
                      bg={todayCell ? "blue.400" : "transparent"}
                      color={todayCell ? "white" : textColor}
                      borderRadius="full"
                      w={zoom >= 1.5 ? 6 : zoom >= 1.0 ? 5 : 4}
                      h={zoom >= 1.5 ? 6 : zoom >= 1.0 ? 5 : 4}
                      lineHeight={`${zoom >= 1.5 ? 24 : zoom >= 1.0 ? 20 : 16}px`}
                      textAlign="center"
                      fontWeight={todayCell ? "semibold" : "normal"}
                      boxShadow={todayCell ? "sm" : "none"}
                      alignSelf="flex-start"
                    >
                      {day}
                    </Box>
                  )}

                  {/* Tasks */}
                  {valid && (
                    <VStack spacing={zoom >= 1.0 ? 0.5 : 0.25} align="stretch" flex={1} overflow="hidden">
                      {visibleTasks.map(task => {
                        const taskColor = getTaskDisplayColor(task);
                        return (
                          <Box
                            key={task.id}
                            fontSize={{
                              base: zoom >= 1.5 ? "2xs" : zoom >= 1.0 ? "3xs" : "4xs",
                              md: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
                            }}
                            px={zoom >= 1.0 ? 0.5 : 0.25}
                            py={zoom >= 1.0 ? 0.5 : 0.25}
                            borderRadius="md"
                            isTruncated
                            color={taskColor ? "white" : undefined}
                            bg={taskColor || { _light: "gray.200", _dark: "gray.700" }}
                            _dark={{ bg: taskColor || "gray.700" }}
                            title={task.title}
                            lineHeight={zoom >= 1.5 ? 1.2 : zoom >= 1.0 ? 1.1 : 1}
                            overflow="hidden"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                          >
                            {task.title}
                          </Box>
                        );
                      })}
                      {remainingCount > 0 && (
                        <Box
                          fontSize={{
                            base: zoom >= 1.5 ? "3xs" : zoom >= 1.0 ? "4xs" : "5xs",
                            md: zoom >= 1.5 ? "2xs" : zoom >= 1.0 ? "3xs" : "4xs",
                          }}
                          color={mutedText}
                          textAlign="center"
                          px={0.5}
                        >
                          +{remainingCount}
                        </Box>
                      )}
                    </VStack>
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

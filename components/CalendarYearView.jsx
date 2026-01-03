"use client";

import { useState } from "react";
import { Box, Flex, VStack, Text, Menu, Portal } from "@chakra-ui/react";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { MONTH_OPTIONS } from "@/lib/constants";
import { Calendar } from "lucide-react";
import { TaskCardMini } from "./shared/TaskCardMini";
import { TaskContextMenu } from "./TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const CalendarYearView = ({
  date,
  tasks,
  onDayClick,
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
  zoom = 1.0,
  onEdit,
  onEditWorkout,
  onOutcomeChange,
  onDuplicate,
  onDelete,
}) => {
  const [openMenuDate, setOpenMenuDate] = useState(null);
  const { mode, calendar } = useSemanticColors();

  // Color scheme
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.emphasized; // More visible borders
  const cellBg = mode.bg.muted;
  const cellHover = mode.bg.surfaceHover;
  const invalidCellBg = mode.bg.subtle;
  const todayBorder = calendar.today;
  const headerText = mode.text.secondary;
  const monthText = mode.text.primary;

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
  const baseCellWidth = 150;
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

  const mutedText = mode.text.muted;

  const monthLabelWidth = "50px";

  return (
    <Flex direction="column" h="full" overflow="auto" bg={bgColor} p={2}>
      {/* Header row - Day numbers */}
      <Flex mb={0} position="sticky" top={0} bg={bgColor} zIndex={10} pb={0}>
        {/* Empty space for month label column */}
        <Box w={monthLabelWidth} minW={monthLabelWidth} flexShrink={0} />

        {/* Day number headers */}
        <Flex>
          {daysOfMonth.map(day => (
            <Box
              key={day}
              w={cellSizePx}
              minW={cellSizePx}
              maxW={cellSizePx}
              flexShrink={0}
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
      </Flex>

      {/* Month rows */}
      {MONTH_OPTIONS.map((monthOption, monthIndex) => (
        <Flex key={monthOption.value} align="flex-start" mb={0}>
          {/* Month label */}
          <Box
            w={monthLabelWidth}
            minW={monthLabelWidth}
            flexShrink={0}
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
          <Flex flexShrink={0}>
            {daysOfMonth.map(day => {
              const valid = isValidDate(monthIndex, day);
              const dayTasks = valid ? getTasksForDate(monthIndex, day) : [];
              const todayCell = isToday(monthIndex, day);
              // Limit tasks shown based on zoom
              const maxTasks = zoom >= 1.5 ? 5 : zoom >= 1.0 ? 3 : 2;
              const visibleTasks = dayTasks.slice(0, maxTasks);
              const remainingCount = dayTasks.length - visibleTasks.length;

              const cellDate = valid ? new Date(year, monthIndex, day) : null;
              const dateKey = cellDate ? cellDate.toISOString() : null;
              const hasHiddenTasks = remainingCount > 0;

              return (
                <Menu.Root
                  key={day}
                  open={openMenuDate === dateKey}
                  onOpenChange={e => setOpenMenuDate(e.open ? dateKey : null)}
                >
                  <Menu.Trigger asChild>
                    <Box
                      w={cellSizePx}
                      minW={cellSizePx}
                      maxW={cellSizePx}
                      flexShrink={0}
                      minH={cellMinHeight}
                      display="flex"
                      flexDirection="column"
                      bg={todayCell ? calendar.todayBg : valid ? cellBg : invalidCellBg}
                      borderTopWidth={monthIndex === 0 ? "2px" : "1px"}
                      borderTopColor={borderColor}
                      borderBottomWidth={monthIndex === 11 ? "2px" : "1px"}
                      borderBottomColor={borderColor}
                      borderLeftWidth={day === 1 ? "2px" : "1px"}
                      borderLeftColor={borderColor}
                      borderRightWidth={day === 31 ? "2px" : "1px"}
                      borderRightColor={borderColor}
                      boxShadow={todayCell ? `inset 0 0 0 1.5px ${todayBorder}` : "none"}
                      cursor={valid ? "pointer" : "default"}
                      opacity={valid ? 1 : 0.3}
                      _hover={valid ? { bg: todayCell ? calendar.selected : cellHover } : {}}
                      onClick={e => {
                        // If there are hidden tasks, open menu; otherwise navigate to day
                        if (!hasHiddenTasks) {
                          e.stopPropagation();
                          handleCellClick(monthIndex, day);
                        }
                      }}
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
                      {/* {valid && (
                    <Box
                      as="span"
                      fontSize={{
                        base: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
                        md: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
                      }}
                      mb={zoom >= 1.0 ? 0.5 : 0.25}
                      display="inline-block"
                      bg={todayCell ? calendar.today : "transparent"}
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
                  )} */}

                      {/* Tasks */}
                      {valid && (
                        <VStack spacing={zoom >= 1.0 ? 0.5 : 0.25} align="stretch" flex={1} overflow="hidden">
                          {visibleTasks.map(task => {
                            const targetDate = new Date(year, monthIndex, day);
                            targetDate.setHours(0, 0, 0, 0);
                            return (
                              <TaskCardMini
                                key={task.id}
                                task={task}
                                zoom={zoom}
                                isCompleted={isCompletedOnDate(task.id, targetDate)}
                                outcome={getOutcomeOnDate ? getOutcomeOnDate(task.id, targetDate) : null}
                              />
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
                  </Menu.Trigger>

                  {/* Popover menu for all tasks */}
                  {hasHiddenTasks && (
                    <Portal>
                      <Menu.Positioner>
                        <Menu.Content
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                          minW="250px"
                          maxW="350px"
                          p={2}
                        >
                          {/* Go to Day View button */}
                          <Box
                            as="button"
                            w="full"
                            p={2}
                            mb={2}
                            borderRadius="md"
                            bg={calendar.todayBg}
                            color={mode.text.link}
                            _hover={{ bg: calendar.selected }}
                            onClick={e => {
                              e.stopPropagation();
                              handleCellClick(monthIndex, day);
                              setOpenMenuDate(null);
                            }}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            gap={2}
                            cursor="pointer"
                            border="none"
                            outline="none"
                          >
                            <Calendar size={14} />
                            <Text fontSize="sm" fontWeight="medium">
                              Go to Day View
                            </Text>
                          </Box>

                          {/* All tasks for this day - styled like calendar cells */}
                          <VStack spacing={1} align="stretch">
                            {dayTasks.map(task => {
                              const taskColor = getTaskDisplayColor(task);
                              const isRecurring = task.recurrence && task.recurrence.type !== "none";
                              const isWorkoutTask = task.completionType === "workout";
                              const taskDate = new Date(year, monthIndex, day);
                              taskDate.setHours(0, 0, 0, 0);
                              const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, taskDate) : null;

                              return (
                                <Menu.Root key={task.id}>
                                  <Menu.Trigger asChild>
                                    <Box
                                      as="button"
                                      w="full"
                                      px={2}
                                      py={1.5}
                                      borderRadius="md"
                                      bg={taskColor || mode.task.neutral}
                                      color={taskColor ? "white" : mode.task.neutralText}
                                      _hover={{
                                        opacity: 0.8,
                                        transform: "translateY(-1px)",
                                        boxShadow: "sm",
                                      }}
                                      onClick={e => {
                                        e.stopPropagation();
                                      }}
                                      cursor="pointer"
                                      textAlign="left"
                                      transition="all 0.15s"
                                      border="none"
                                      outline="none"
                                      display="flex"
                                      alignItems="center"
                                      gap={2}
                                    >
                                      <Text flex={1} fontSize="sm" isTruncated fontWeight="medium">
                                        {task.title}
                                      </Text>
                                    </Box>
                                  </Menu.Trigger>
                                  <Portal>
                                    <Menu.Positioner>
                                      <Menu.Content
                                        onClick={e => e.stopPropagation()}
                                        onMouseDown={e => e.stopPropagation()}
                                      >
                                        <TaskContextMenu
                                          task={task}
                                          date={taskDate}
                                          isRecurring={isRecurring}
                                          isWorkoutTask={isWorkoutTask}
                                          outcome={outcome}
                                          onEdit={onEdit}
                                          onEditWorkout={onEditWorkout}
                                          onOutcomeChange={onOutcomeChange}
                                          onDuplicate={onDuplicate}
                                          onDelete={onDelete}
                                          onClose={() => setOpenMenuDate(null)}
                                        />
                                      </Menu.Content>
                                    </Menu.Positioner>
                                  </Portal>
                                </Menu.Root>
                              );
                            })}
                          </VStack>
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  )}
                </Menu.Root>
              );
            })}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};

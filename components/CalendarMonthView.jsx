"use client";

import { useState } from "react";
import { Box, Flex, SimpleGrid, Menu, Portal } from "@chakra-ui/react";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { TaskContextMenu } from "./TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const CalendarMonthView = ({
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
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);
  const { mode, calendar } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const dayHeaderColor = mode.text.muted;
  const nonCurrentMonthBg = mode.bg.subtle;

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
                  borderColor={isToday ? calendar.today : borderColor}
                  p={1}
                  minH={`${80 * zoom}px`}
                  cursor="pointer"
                  _hover={{
                    bg: isToday ? calendar.todayBg : hoverBg,
                  }}
                  bg={isToday ? calendar.todayBg : !isCurrentMonth ? nonCurrentMonthBg : "transparent"}
                  onClick={e => {
                    // Only navigate to day if clicking on the cell background, not a task
                    if (e.target === e.currentTarget || e.target.tagName === "SPAN") {
                      onDayClick(day);
                    }
                  }}
                >
                  <Box
                    as="span"
                    fontSize={{
                      base: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
                      md: zoom >= 1.5 ? "md" : zoom >= 1.0 ? "sm" : "xs",
                    }}
                    mb={1}
                    display="inline-block"
                    bg={isToday ? calendar.today : "transparent"}
                    color={isToday ? mode.text.inverse : !isCurrentMonth ? mutedText : textColor}
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
                  {dayTasks.map(task => {
                    const isMenuOpen = openMenuTaskId === task.id;
                    const isRecurring = task.recurrence && task.recurrence.type !== "none";
                    const isWorkoutTask = task.completionType === "workout";
                    const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;

                    return (
                      <Menu.Root
                        key={task.id}
                        open={isMenuOpen}
                        onOpenChange={isOpen => {
                          if (isOpen) {
                            setOpenMenuTaskId(task.id);
                          } else {
                            setOpenMenuTaskId(null);
                          }
                        }}
                      >
                        <Menu.Trigger asChild>
                          <Box
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
                            bg={getTaskDisplayColor(task) || mode.task.neutral}
                            cursor="pointer"
                            _hover={{ opacity: 0.8 }}
                            onClick={e => {
                              e.stopPropagation();
                            }}
                          >
                            {task.title}
                          </Box>
                        </Menu.Trigger>
                        <Portal>
                          <Menu.Positioner>
                            <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                              <TaskContextMenu
                                task={task}
                                date={day}
                                isRecurring={isRecurring}
                                isWorkoutTask={isWorkoutTask}
                                outcome={outcome}
                                onEdit={onEdit}
                                onEditWorkout={onEditWorkout}
                                onOutcomeChange={onOutcomeChange}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                                onClose={() => setOpenMenuTaskId(null)}
                              />
                            </Menu.Content>
                          </Menu.Positioner>
                        </Portal>
                      </Menu.Root>
                    );
                  })}
                </Box>
              );
            })}
          </SimpleGrid>
        ))}
      </Box>
    </Flex>
  );
};

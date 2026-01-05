"use client";

import { useState } from "react";
import { Box, Flex, Stack, Text, Menu } from "@mantine/core";
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
    <Flex direction="column" style={{ height: "100%", overflow: "auto", background: bgColor, padding: 8 }}>
      {/* Header row - Day numbers */}
      <Flex style={{ marginBottom: 0, position: "sticky", top: 0, background: bgColor, zIndex: 10, paddingBottom: 0 }}>
        {/* Empty space for month label column */}
        <Box style={{ width: monthLabelWidth, minWidth: monthLabelWidth, flexShrink: 0 }} />

        {/* Day number headers */}
        <Flex>
          {daysOfMonth.map(day => (
            <Box
              key={day}
              style={{
                width: cellSizePx,
                minWidth: cellSizePx,
                maxWidth: cellSizePx,
                flexShrink: 0,
                height: "auto",
                textAlign: "left",
                fontSize:
                  zoom >= 1.5
                    ? "var(--mantine-font-size-sm)"
                    : zoom >= 1.0
                      ? "var(--mantine-font-size-xs)"
                      : "var(--mantine-font-size-xs)",
                paddingLeft: 8,
                color: headerText,
                fontWeight: 500,
                borderTopWidth: "2px",
                borderTopColor: borderColor,
                borderTopStyle: "solid",
                borderBottomWidth: "1px",
                borderBottomColor: borderColor,
                borderBottomStyle: "solid",
                borderLeftWidth: day === 1 ? "2px" : "1px",
                borderLeftColor: borderColor,
                borderLeftStyle: "solid",
                borderRightWidth: day === 31 ? "2px" : "1px",
                borderRightColor: borderColor,
                borderRightStyle: "solid",
                paddingTop: 4,
                paddingBottom: 4,
                background: bgColor,
                boxSizing: "border-box",
              }}
            >
              {day}
            </Box>
          ))}
        </Flex>
      </Flex>

      {/* Month rows */}
      {MONTH_OPTIONS.map((monthOption, monthIndex) => (
        <Flex key={monthOption.value} align="flex-start" style={{ marginBottom: 0 }}>
          {/* Month label */}
          <Box
            style={{
              width: monthLabelWidth,
              minWidth: monthLabelWidth,
              flexShrink: 0,
              paddingRight: 8,
              fontSize:
                zoom >= 1.5
                  ? "var(--mantine-font-size-md)"
                  : zoom >= 1.0
                    ? "var(--mantine-font-size-sm)"
                    : "var(--mantine-font-size-xs)",
              fontWeight: 500,
              color: monthText,
              textAlign: "right",
              position: "sticky",
              left: 0,
              background: bgColor,
              zIndex: 5,
            }}
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
                <Menu
                  key={day}
                  opened={openMenuDate === dateKey}
                  onChange={opened => setOpenMenuDate(opened ? dateKey : null)}
                >
                  <Menu.Target>
                    <Box
                      style={{
                        width: cellSizePx,
                        minWidth: cellSizePx,
                        maxWidth: cellSizePx,
                        flexShrink: 0,
                        minHeight: cellMinHeight.base,
                        display: "flex",
                        flexDirection: "column",
                        background: todayCell ? calendar.todayBg : valid ? cellBg : invalidCellBg,
                        borderTopWidth: monthIndex === 0 ? "2px" : "1px",
                        borderTopColor: borderColor,
                        borderTopStyle: "solid",
                        borderBottomWidth: monthIndex === 11 ? "2px" : "1px",
                        borderBottomColor: borderColor,
                        borderBottomStyle: "solid",
                        borderLeftWidth: day === 1 ? "2px" : "1px",
                        borderLeftColor: borderColor,
                        borderLeftStyle: "solid",
                        borderRightWidth: day === 31 ? "2px" : "1px",
                        borderRightColor: borderColor,
                        borderRightStyle: "solid",
                        boxShadow: todayCell ? `inset 0 0 0 1.5px ${todayBorder}` : "none",
                        cursor: valid ? "pointer" : "default",
                        opacity: valid ? 1 : 0.3,
                        transition: "all 0.15s",
                        padding: zoom >= 1.0 ? 4 : 2,
                        position: "relative",
                        boxSizing: "border-box",
                      }}
                      title={
                        valid && dayTasks.length > 0
                          ? `${monthOption.label} ${day}: ${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`
                          : undefined
                      }
                      onMouseEnter={e => {
                        if (valid) {
                          e.currentTarget.style.backgroundColor = todayCell ? calendar.selected : cellHover;
                        }
                      }}
                      onMouseLeave={e => {
                        if (valid) {
                          e.currentTarget.style.backgroundColor = todayCell
                            ? calendar.todayBg
                            : valid
                              ? cellBg
                              : invalidCellBg;
                        }
                      }}
                      onClick={e => {
                        // If there are hidden tasks, open menu; otherwise navigate to day
                        if (!hasHiddenTasks) {
                          e.stopPropagation();
                          handleCellClick(monthIndex, day);
                        }
                      }}
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
                        <Stack spacing={zoom >= 1.0 ? 2 : 1} align="stretch" style={{ flex: 1, overflow: "hidden" }}>
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
                              style={{
                                fontSize: "var(--mantine-font-size-xs)",
                                color: mutedText,
                                textAlign: "center",
                                paddingLeft: 2,
                                paddingRight: 2,
                              }}
                            >
                              +{remainingCount}
                            </Box>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Menu.Target>

                  {/* Popover menu for all tasks */}
                  {hasHiddenTasks && (
                    <Menu.Dropdown
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                      style={{ minWidth: "250px", maxWidth: "350px", padding: 8 }}
                    >
                      {/* Go to Day View button */}
                      <Box
                        component="button"
                        style={{
                          width: "100%",
                          padding: 8,
                          marginBottom: 8,
                          borderRadius: "var(--mantine-radius-md)",
                          background: calendar.todayBg,
                          color: mode.text.link,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          cursor: "pointer",
                          border: "none",
                          outline: "none",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = calendar.selected;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = calendar.todayBg;
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          handleCellClick(monthIndex, day);
                          setOpenMenuDate(null);
                        }}
                      >
                        <Calendar size={14} />
                        <Text size="sm" fw={500}>
                          Go to Day View
                        </Text>
                      </Box>

                      {/* All tasks for this day - styled like calendar cells */}
                      <Stack gap={4} align="stretch">
                        {dayTasks.map(task => {
                          const taskColor = getTaskDisplayColor(task);
                          const isRecurring = task.recurrence && task.recurrence.type !== "none";
                          const isWorkoutTask = task.completionType === "workout";
                          const taskDate = new Date(year, monthIndex, day);
                          taskDate.setHours(0, 0, 0, 0);
                          const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, taskDate) : null;

                          return (
                            <Menu key={task.id}>
                              <Menu.Target>
                                <Box
                                  component="button"
                                  style={{
                                    width: "100%",
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                    paddingTop: 6,
                                    paddingBottom: 6,
                                    borderRadius: "var(--mantine-radius-md)",
                                    background: taskColor || mode.task.neutral,
                                    color: taskColor ? "white" : mode.task.neutralText,
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s",
                                    border: "none",
                                    outline: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.opacity = "0.8";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.opacity = "1";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                  onClick={e => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Text
                                    style={{
                                      flex: 1,
                                      fontSize: "var(--mantine-font-size-sm)",
                                      fontWeight: 500,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {task.title}
                                  </Text>
                                </Box>
                              </Menu.Target>
                              <Menu.Dropdown onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
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
                              </Menu.Dropdown>
                            </Menu>
                          );
                        })}
                      </Stack>
                    </Menu.Dropdown>
                  )}
                </Menu>
              );
            })}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
};

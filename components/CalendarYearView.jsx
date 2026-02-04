"use client";

import { useState } from "react";
import { Box, Typography, Menu, MenuItem, Button, Stack } from "@mui/material";
import { CalendarToday } from "@mui/icons-material";
import { shouldShowOnDate, getTaskDisplayColor } from "@/lib/utils";
import { MONTH_OPTIONS } from "@/lib/constants";
import { TaskCardMini } from "./shared/TaskCardMini";
import { useColorMode } from "@/hooks/useColorMode";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export const CalendarYearView = ({
  date,
  tasks,
  onDayClick,
  isCompletedOnDate,
  getOutcomeOnDate,
  showCompleted = true,
  zoom = 1.0,
}) => {
  const [openMenuDate, setOpenMenuDate] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const { mode: colorMode } = useColorMode();
  const taskOps = useTaskOperations();

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

    let dayTasks = tasks.filter(t => shouldShowOnDate(t, targetDate, getOutcomeOnDate));

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
    xs: `${cellHeight}px`,
    md: `${cellHeight * 1.2}px`,
    lg: `${cellHeight * 1.4}px`,
  };

  const monthLabelWidth = "50px";

  const handleCellContextMenu = (e, month, day) => {
    if (!isValidDate(month, day)) return;
    e.preventDefault();
    e.stopPropagation();
    const cellDate = new Date(year, month, day);
    cellDate.setHours(0, 0, 0, 0);
    const dateKey = cellDate.toISOString();
    const dayTasks = getTasksForDate(month, day);
    const maxTasks = zoom >= 1.5 ? 5 : zoom >= 1.0 ? 3 : 2;
    const hasHiddenTasks = dayTasks.length > maxTasks;

    if (hasHiddenTasks) {
      setAnchorEl(e.currentTarget);
      setOpenMenuDate(dateKey);
    } else {
      handleCellClick(month, day);
    }
  };

  return (
    <Box sx={{ height: "100%", overflow: "auto", bgcolor: "background.default", p: 2 }}>
      {/* Header row - Day numbers */}
      <Box sx={{ mb: 0, position: "sticky", top: 0, bgcolor: "background.default", zIndex: 10, pb: 0 }}>
        <Box sx={{ display: "flex" }}>
          {/* Empty space for month label column */}
          <Box sx={{ width: monthLabelWidth, minWidth: monthLabelWidth, flexShrink: 0 }} />

          {/* Day number headers */}
          <Box sx={{ display: "flex" }}>
            {daysOfMonth.map(day => (
              <Box
                key={day}
                sx={{
                  width: cellSizePx,
                  minWidth: cellSizePx,
                  maxWidth: cellSizePx,
                  flexShrink: 0,
                  height: "auto",
                  textAlign: "left",
                  fontSize: {
                    xs: zoom >= 1.5 ? "0.75rem" : zoom >= 1.0 ? "0.625rem" : "0.5rem",
                    md: zoom >= 1.5 ? "0.875rem" : zoom >= 1.0 ? "0.75rem" : "0.625rem",
                  },
                  pl: 2,
                  color: "text.secondary",
                  fontWeight: 500,
                  borderTop: 2,
                  borderBottom: 1,
                  borderLeft: day === 1 ? 2 : 1,
                  borderRight: day === 31 ? 2 : 1,
                  borderColor: "divider",
                  py: 1,
                  bgcolor: "background.paper",
                  boxSizing: "border-box",
                }}
              >
                {day}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Month rows */}
      {MONTH_OPTIONS.map((monthOption, monthIndex) => (
        <Box key={monthOption.value} sx={{ display: "flex", alignItems: "flex-start", mb: 0 }}>
          {/* Month label */}
          <Box
            sx={{
              width: monthLabelWidth,
              minWidth: monthLabelWidth,
              flexShrink: 0,
              pr: 2,
              fontSize: {
                xs: zoom >= 1.5 ? "0.875rem" : zoom >= 1.0 ? "0.75rem" : "0.625rem",
                md: zoom >= 1.5 ? "1rem" : zoom >= 1.0 ? "0.875rem" : "0.75rem",
              },
              fontWeight: 500,
              color: "text.primary",
              textAlign: "right",
              position: "sticky",
              left: 0,
              bgcolor: "background.default",
              zIndex: 5,
            }}
          >
            {monthOption.label.substring(0, 3)}
          </Box>

          {/* Day cells */}
          <Box sx={{ display: "flex", flexShrink: 0 }}>
            {daysOfMonth.map(day => {
              const valid = isValidDate(monthIndex, day);
              const dayTasks = valid ? getTasksForDate(monthIndex, day) : [];
              const todayCell = isToday(monthIndex, day);
              // Limit tasks shown based on zoom
              const maxTasks = zoom >= 1.5 ? 5 : zoom >= 1.0 ? 3 : 2;
              const visibleTasks = dayTasks.slice(0, maxTasks);
              const remainingCount = dayTasks.length - visibleTasks.length;

              const hasHiddenTasks = remainingCount > 0;

              return (
                <Box
                  key={day}
                  onContextMenu={e => handleCellContextMenu(e, monthIndex, day)}
                  onClick={e => {
                    // If there are hidden tasks, open menu; otherwise navigate to day
                    if (!hasHiddenTasks) {
                      e.stopPropagation();
                      handleCellClick(monthIndex, day);
                    }
                  }}
                  sx={{
                    width: cellSizePx,
                    minWidth: cellSizePx,
                    maxWidth: cellSizePx,
                    flexShrink: 0,
                    minHeight: cellMinHeight,
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: todayCell ? "action.selected" : valid ? "background.paper" : "action.disabledBackground",
                    borderTop: monthIndex === 0 ? 2 : 1,
                    borderBottom: monthIndex === 11 ? 2 : 1,
                    borderLeft: day === 1 ? 2 : 1,
                    borderRight: day === 31 ? 2 : 1,
                    borderColor: "divider",
                    boxShadow: todayCell ? `inset 0 0 0 1.5px ${valid ? "primary.main" : "transparent"}` : "none",
                    cursor: valid ? "pointer" : "default",
                    opacity: valid ? 1 : 0.3,
                    transition: "all 0.15s",
                    p: zoom >= 1.0 ? 1 : 0.5,
                    position: "relative",
                    boxSizing: "border-box",
                    "&:hover": valid ? { bgcolor: todayCell ? "action.selected" : "action.hover" } : {},
                  }}
                  title={
                    valid && dayTasks.length > 0
                      ? `${monthOption.label} ${day}: ${dayTasks.length} task${dayTasks.length !== 1 ? "s" : ""}`
                      : undefined
                  }
                >
                  {/* Tasks */}
                  {valid && (
                    <Stack spacing={zoom >= 1.0 ? 0.5 : 0.25} sx={{ flex: 1, overflow: "hidden" }}>
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
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: {
                              xs: zoom >= 1.5 ? "0.5rem" : zoom >= 1.0 ? "0.4rem" : "0.35rem",
                              md: zoom >= 1.5 ? "0.625rem" : zoom >= 1.0 ? "0.5rem" : "0.4rem",
                            },
                            color: "text.secondary",
                            textAlign: "center",
                            px: 0.5,
                          }}
                        >
                          +{remainingCount}
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      {/* Context Menu for hidden tasks */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl && openMenuDate)}
        onClose={() => {
          setAnchorEl(null);
          setOpenMenuDate(null);
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        PaperProps={{
          sx: { minWidth: 250, maxWidth: 350, p: 2 },
        }}
      >
        {openMenuDate &&
          (() => {
            const menuDate = new Date(openMenuDate);
            const monthIndex = menuDate.getMonth();
            const day = menuDate.getDate();
            const dayTasks = getTasksForDate(monthIndex, day);

            return (
              <>
                {/* Go to Day View button */}
                <Button
                  fullWidth
                  sx={{ mb: 2, bgcolor: "action.selected", color: "text.primary" }}
                  onClick={e => {
                    e.stopPropagation();
                    handleCellClick(monthIndex, day);
                    setAnchorEl(null);
                    setOpenMenuDate(null);
                  }}
                  startIcon={<CalendarToday fontSize="small" />}
                >
                  Go to Day View
                </Button>

                {/* All tasks for this day */}
                <Stack spacing={1}>
                  {dayTasks.map(task => {
                    const taskColor = getTaskDisplayColor(task, null, colorMode);
                    const taskDate = new Date(year, monthIndex, day);
                    taskDate.setHours(0, 0, 0, 0);

                    return (
                      <MenuItem
                        key={task.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: 1,
                          bgcolor: taskColor || "action.selected",
                          color: taskColor ? "white" : "text.primary",
                          mb: 0.5,
                          "&:hover": {
                            opacity: 0.8,
                            transform: "translateY(-1px)",
                            boxShadow: 1,
                          },
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          taskOps.handleEditTask(task);
                          setAnchorEl(null);
                          setOpenMenuDate(null);
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                          }}
                        >
                          {task.title}
                        </Typography>
                      </MenuItem>
                    );
                  })}
                </Stack>
              </>
            );
          })()}
      </Menu>
    </Box>
  );
};

export default CalendarYearView;

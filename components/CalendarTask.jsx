"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Repeat, FitnessCenter } from "@mui/icons-material";
import { TaskContextMenuBase } from "./TaskContextMenu";
import { OutcomeCheckbox } from "./OutcomeCheckbox";
import { getTaskDisplayColor } from "@/lib/utils";
import { useColorMode } from "@/hooks/useColorMode";

// Striped pattern for not_completed
const getStripedBg = theme => `repeating-linear-gradient(
  45deg,
  transparent,
  transparent 4px,
  ${theme.palette.error.dark}22 4px,
  ${theme.palette.error.dark}22 8px
)`;

export const CalendarTask = memo(
  function CalendarTask({
    task,
    date,
    variant = "timed", // 'timed' | 'untimed' | 'timed-week' | 'untimed-week'
    createDraggableId: _createDraggableId, // Kept for API compatibility
    getTaskStyle,
    outcome,
    isCompleted,
    isNotCompleted,
    isRecurring,
    isWorkoutTask,
    onOutcomeChange,
    onRollover,
    onEdit,
    menuHandlers,
    canEditCompletion,
  }) {
    const theme = useTheme();
    const { mode: colorMode } = useColorMode();
    const [anchorEl, setAnchorEl] = useState(null);
    const taskRef = useRef(null);

    // Variant flags
    const isTimed = variant === "timed" || variant === "timed-week";
    const isWeek = variant === "timed-week" || variant === "untimed-week";
    const fontSize = isWeek ? "0.7rem" : "0.8rem";

    // Completion state for recurring tasks
    const effectiveOutcome = outcome ?? null;
    const effectiveCompleted = Boolean(isCompleted);
    const effectiveNotCompleted = Boolean(isNotCompleted);
    const effectiveIsRecurring = Boolean(isRecurring);
    const effectiveIsWorkout = Boolean(isWorkoutTask);

    // Get task color from first tag, or use neutral gray if no tags
    const taskColor = getTaskDisplayColor(task, null, colorMode);

    // Style for positioning (timed variants only)
    const positionStyle = isTimed && getTaskStyle ? getTaskStyle(task) : {};

    // Background based on completion state
    const getBgColor = () => {
      if (effectiveNotCompleted) return "transparent";
      if (effectiveCompleted) return theme.palette.success.dark + "20";
      return taskColor || theme.palette.background.paper;
    };

    // Border color based on completion
    const getBorderColor = () => {
      if (effectiveCompleted) return theme.palette.success.main;
      if (effectiveNotCompleted) return theme.palette.error.main;
      return theme.palette.divider;
    };

    const handleContextMenu = useCallback(e => {
      e.preventDefault();
      e.stopPropagation();
      setAnchorEl(e.currentTarget);
    }, []);

    // Handle outcome change (reused from OutcomeCheckbox logic)
    const handleOutcomeChange = useCallback(
      newOutcome => {
        onOutcomeChange?.(task.id, date, newOutcome);
      },
      [task.id, date, onOutcomeChange]
    );

    // Handle click - open task editor
    const handleTaskClick = useCallback(
      e => {
        // Prevent event bubbling to avoid triggering parent handlers
        e.stopPropagation();
        e.preventDefault();

        // Don't open if clicking on outcome button
        if (e.target.closest("button[aria-label]")) return;

        // Open task editor - pass the date for recurring tasks
        onEdit?.(task, date);
      },
      [onEdit, task, date]
    );

    const isNoDuration = !task.duration || task.duration === 0;
    const showTimeText = isTimed && (task.duration || 30) >= 45;

    return (
      <>
        <Paper
          ref={taskRef}
          variant="outlined"
          onContextMenu={handleContextMenu}
          onClick={handleTaskClick}
          sx={{
            ...(isTimed
              ? {
                  position: "absolute",
                  // Use percentage-based positioning with small gaps between overlapping tasks
                  left: positionStyle.left ? positionStyle.left : "0%",
                  ...(positionStyle.top ? { top: positionStyle.top } : {}),
                  ...(positionStyle.height ? { height: positionStyle.height } : {}),
                  // Add small gaps between overlapping tasks (more space on left edge)
                  marginLeft: positionStyle.left === "0%" ? "4px" : "2px",
                  marginRight: "2px",
                  boxSizing: "border-box",
                  // Adjust width to account for margins
                  width: positionStyle.width
                    ? `calc(${positionStyle.width} - ${positionStyle.left === "0%" ? "6px" : "4px"})`
                    : "calc(100% - 6px)",
                }
              : {
                  position: "relative",
                }),
            // Apple Calendar style - task stays visible and elevated during drag
            opacity: effectiveCompleted || effectiveNotCompleted ? 0.6 : 1,
            filter: effectiveCompleted || effectiveNotCompleted ? "brightness(0.7)" : "none",
            p: 0,
            bgcolor: getBgColor(),
            borderColor: getBorderColor(),
            borderWidth: isNoDuration ? 2 : 1,
            borderRadius: 1,
            cursor: isTimed ? "grab" : "default",
            overflow: "hidden",
            touchAction: isTimed ? "none" : "auto", // Prevent default touch behaviors during drag
            backgroundImage: effectiveNotCompleted ? getStripedBg(theme) : "none",
            color: taskColor ? "white" : theme.palette.text.primary,
            minHeight: isTimed ? (isNoDuration ? 24 : undefined) : undefined,
            userSelect: "none",
            "&:hover": {
              bgcolor: isNotCompleted ? undefined : "action.hover",
            },
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="flex-start">
            {/* Outcome Checkbox (for recurring tasks) */}
            {effectiveIsRecurring && (
              <Box
                onMouseDown={e => e.stopPropagation()} // Prevent drag start when clicking
                onClick={e => e.stopPropagation()} // Prevent task click when clicking checkbox
                sx={{
                  px: 0.5,
                  pt: 0.25,
                }}
              >
                <OutcomeCheckbox
                  outcome={effectiveOutcome}
                  onOutcomeChange={handleOutcomeChange}
                  isChecked={effectiveCompleted}
                  size={isWeek ? "sm" : "md"}
                  isRecurring={effectiveIsRecurring}
                  viewDate={date}
                  onRollover={onRollover}
                  taskId={task.id}
                />
              </Box>
            )}

            {/* Task Content */}
            <Box flex={1} minWidth={0}>
              <Typography
                sx={{
                  fontSize,
                  fontWeight: 500,
                  color: effectiveCompleted ? "text.secondary" : "inherit",
                  textDecoration: effectiveCompleted || effectiveNotCompleted ? "line-through" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {task.title}
              </Typography>

              {/* Time display (for timed tasks with sufficient duration) */}
              {showTimeText && task.time && (
                <Typography variant="caption" sx={{ fontSize: "0.65rem", opacity: 0.8 }}>
                  {task.time}
                </Typography>
              )}

              {/* Tags (non-week view only to save space) */}
              {/* {!isWeek && task.tags?.length > 0 && (
              <Stack direction="row" spacing={0.25} sx={{ mt: 0.25 }} flexWrap="wrap">
                {task.tags.slice(0, 2).map(tag => (
                  <TagChip key={tag.id} tag={tag} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                ))}
                {task.tags.length > 2 && (
                  <Chip label={`+${task.tags.length - 2}`} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                )}
              </Stack>
            )} */}
            </Box>

            {/* Indicators */}
            <Stack direction="row" spacing={0.25} alignItems="center">
              {effectiveIsRecurring && <Repeat fontSize={isWeek ? "inherit" : "small"} sx={{ opacity: 0.6 }} />}
              {effectiveIsWorkout && <FitnessCenter fontSize={isWeek ? "inherit" : "small"} sx={{ opacity: 0.6 }} />}
            </Stack>
          </Stack>
        </Paper>

        {/* Context Menu */}
        <TaskContextMenuBase
          task={task}
          date={date}
          isWorkoutTask={effectiveIsWorkout}
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={() => {
            setAnchorEl(null);
          }}
          onEdit={menuHandlers?.onEdit}
          onEditWorkout={menuHandlers?.onEditWorkout}
          onDuplicate={menuHandlers?.onDuplicate}
          onDelete={menuHandlers?.onDelete}
          onBulkEdit={menuHandlers?.onBulkEdit}
          hasMultipleSelected={menuHandlers?.hasMultipleSelected}
          selectedCount={menuHandlers?.selectedCount}
          canEditCompletion={canEditCompletion}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Only re-render if these specific props change
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.time === nextProps.task.time &&
      prevProps.task.duration === nextProps.task.duration &&
      prevProps.task.color === nextProps.task.color &&
      prevProps.task.tags?.length === nextProps.task.tags?.length &&
      prevProps.variant === nextProps.variant &&
      prevProps.date?.getTime() === nextProps.date?.getTime() &&
      prevProps.outcome === nextProps.outcome &&
      prevProps.isCompleted === nextProps.isCompleted &&
      prevProps.isNotCompleted === nextProps.isNotCompleted
    );
  }
);

export default CalendarTask;

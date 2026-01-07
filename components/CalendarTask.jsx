"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Box, Typography, Chip, IconButton, Paper, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CheckCircle, RadioButtonUnchecked, Cancel, Repeat, FitnessCenter } from "@mui/icons-material";
import { TagChip } from "./TagChip";
import { TaskContextMenu } from "./TaskContextMenu";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { getTaskDisplayColor } from "@/lib/utils";
import { useColorMode } from "@/hooks/useColorMode";

// Completion status colors
const getCompletionColor = (outcome, theme) => {
  if (outcome === "completed") return theme.palette.success.main;
  if (outcome === "not_completed") return theme.palette.error.main;
  return theme.palette.action.disabled;
};

// Striped pattern for not_completed
const getStripedBg = theme => `repeating-linear-gradient(
  45deg,
  transparent,
  transparent 4px,
  ${theme.palette.error.dark}22 4px,
  ${theme.palette.error.dark}22 8px
)`;

export const CalendarTask = memo(function CalendarTask({
  task,
  date,
  variant = "timed", // 'timed' | 'untimed' | 'timed-week' | 'untimed-week'
  createDraggableId: _createDraggableId, // Kept for API compatibility but not used for internal calendar drags
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
}) {
  const theme = useTheme();
  const { mode: colorMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const resizeRef = useRef(null);
  const taskRef = useRef(null);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();
  const completionHandlers = useCompletionHandlers();

  // Variant flags
  const isTimed = variant === "timed" || variant === "timed-week";
  const isWeek = variant === "timed-week" || variant === "untimed-week";
  const fontSize = isWeek ? "0.7rem" : "0.8rem";
  const padding = isWeek ? 0.5 : 1;

  // Completion state for recurring tasks
  const outcome = getOutcomeOnDate(task.id, date);
  const isCompleted = isCompletedOnDate(task.id, date);
  const isNotCompleted = outcome === "not_completed";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";

  // Get task color from first tag, or use neutral gray if no tags
  const taskColor = getTaskDisplayColor(task, null, colorMode);

  // Check if this task is currently being dragged internally
  const isInternalDragging = internalDrag?.taskId === task.id;

  // Style for positioning (timed variants only)
  const positionStyle = isTimed && getTaskStyle ? getTaskStyle(task) : {};

  // Background based on completion state
  const getBgColor = () => {
    if (isNotCompleted) return "transparent";
    if (isCompleted) return theme.palette.success.dark + "20";
    return taskColor || theme.palette.background.paper;
  };

  // Border color based on completion
  const getBorderColor = () => {
    if (isCompleted) return theme.palette.success.main;
    if (isNotCompleted) return theme.palette.error.main;
    return theme.palette.divider;
  };

  const handleContextMenu = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  // Cycle through outcomes: none -> completed -> not_completed -> none
  const handleOutcomeClick = useCallback(
    e => {
      e.stopPropagation();
      const nextOutcome = outcome === "completed" ? "not_completed" : outcome === "not_completed" ? null : "completed";
      completionHandlers.handleOutcomeChange(task.id, date, nextOutcome);
    },
    [outcome, task.id, date, completionHandlers]
  );

  // Handle mouse down for move (internal drag - Apple Calendar style)
  const handleMoveMouseDown = useCallback(
    e => {
      // Only left click
      if (e.button !== 0) return;
      // Don't start drag if clicking on resize handle
      if (resizeRef.current && resizeRef.current.contains(e.target)) return;
      // For timed tasks, use internal drag system for moving (Apple Calendar feel)
      if (isTimed && handleInternalDragStart) {
        handleInternalDragStart(e, task, "move");
      }
    },
    [isTimed, handleInternalDragStart, task]
  );

  // Handle resize mouse down
  const handleResizeMouseDown = useCallback(
    e => {
      e.stopPropagation();
      if (handleInternalDragStart) {
        handleInternalDragStart(e, task, "resize");
      }
    },
    [handleInternalDragStart, task]
  );

  const isNoDuration = !task.duration || task.duration === 0;
  const showTimeText = isTimed && (task.duration || 30) >= 45;

  return (
    <>
      <Paper
        ref={taskRef}
        variant="outlined"
        onContextMenu={handleContextMenu}
        onMouseDown={handleMoveMouseDown}
        sx={{
          ...(isTimed
            ? {
                position: "absolute",
                left: 4,
                right: 4,
                ...positionStyle,
              }
            : {
                position: "relative",
              }),
          // Apple Calendar style - task stays visible and elevated during drag
          opacity: isCompleted || isNotCompleted ? 0.6 : 1,
          filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
          p: padding,
          bgcolor: getBgColor(),
          borderColor: getBorderColor(),
          borderWidth: isNoDuration ? 2 : 1,
          borderRadius: 1,
          cursor: isTimed ? "grab" : "default",
          overflow: "hidden",
          backgroundImage: isNotCompleted ? getStripedBg(theme) : "none",
          color: taskColor ? "white" : theme.palette.text.primary,
          // Elevated appearance when dragging (Apple Calendar style)
          boxShadow: isInternalDragging ? theme.shadows[8] : "none",
          zIndex: isInternalDragging ? 100 : "auto",
          // Subtle scale when dragging
          transform: isInternalDragging ? "scale(1.02)" : "none",
          transition: isInternalDragging ? "none" : "box-shadow 0.15s, transform 0.15s",
          minHeight: isTimed ? (isNoDuration ? 24 : undefined) : undefined,
          userSelect: "none",
          "&:hover": {
            bgcolor: isNotCompleted ? undefined : "action.hover",
            "& .resize-handle": { opacity: 1 },
          },
          "&:active": {
            cursor: "grabbing",
          },
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="flex-start">
          {/* Completion Circle (for recurring tasks) */}
          {isRecurring && (
            <IconButton
              size="small"
              onClick={handleOutcomeClick}
              onMouseDown={e => e.stopPropagation()} // Prevent drag start when clicking
              sx={{
                p: 0,
                color: getCompletionColor(outcome, theme),
              }}
            >
              {isCompleted ? (
                <CheckCircle size={isWeek ? 12 : 14} />
              ) : isNotCompleted ? (
                <Cancel fontSize={isWeek ? "inherit" : "small"} />
              ) : (
                <RadioButtonUnchecked fontSize={isWeek ? "inherit" : "small"} />
              )}
            </IconButton>
          )}

          {/* Task Content */}
          <Box flex={1} minWidth={0}>
            <Typography
              sx={{
                fontSize,
                fontWeight: 500,
                color: isCompleted ? "text.secondary" : "inherit",
                textDecoration: isCompleted || isNotCompleted ? "line-through" : "none",
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
            {!isWeek && task.tags?.length > 0 && (
              <Stack direction="row" spacing={0.25} sx={{ mt: 0.25 }} flexWrap="wrap">
                {task.tags.slice(0, 2).map(tag => (
                  <TagChip key={tag.id} tag={tag} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                ))}
                {task.tags.length > 2 && (
                  <Chip label={`+${task.tags.length - 2}`} size="small" sx={{ height: 16, fontSize: "0.6rem" }} />
                )}
              </Stack>
            )}
          </Box>

          {/* Indicators */}
          <Stack direction="row" spacing={0.25} alignItems="center">
            {isRecurring && <Repeat fontSize={isWeek ? "inherit" : "small"} sx={{ opacity: 0.6 }} />}
            {isWorkoutTask && <FitnessCenter fontSize={isWeek ? "inherit" : "small"} sx={{ opacity: 0.6 }} />}
          </Stack>
        </Stack>

        {/* Resize Handle (timed variants only) */}
        {isTimed && (
          <Box
            ref={resizeRef}
            className="resize-handle"
            onMouseDown={handleResizeMouseDown}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: isWeek ? 4 : 6,
              bgcolor: "primary.main",
              cursor: "ns-resize",
              opacity: 0,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            {!isWeek && (
              <Box
                sx={{
                  width: 32,
                  height: 2,
                  borderRadius: "full",
                  bgcolor: "rgba(255, 255, 255, 0.7)",
                }}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <TaskContextMenu
        task={task}
        date={date}
        isRecurring={isRecurring}
        isWorkoutTask={isWorkoutTask}
        outcome={outcome}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
        }}
        onEdit={taskOps.handleEditTask}
        onDelete={taskOps.handleDeleteTask}
        onDuplicate={taskOps.handleDuplicateTask}
      />
    </>
  );
});

export default CalendarTask;

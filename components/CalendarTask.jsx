"use client";

import { memo, useState, useRef } from "react";
import { Box, Typography, Chip, IconButton, Paper, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  createDraggableId,
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

  // Create appropriate draggable ID based on variant
  const draggableId = isTimed
    ? createDraggableId.calendarTimed(task.id, date)
    : createDraggableId.calendarUntimed(task.id, date);

  // DnD Kit
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    data: { task, date, type: "TASK" },
  });

  // Completion state for recurring tasks
  const outcome = getOutcomeOnDate(task.id, date);
  const isCompleted = isCompletedOnDate(task.id, date);
  const isNotCompleted = outcome === "not_completed";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";

  // Get task color from first tag, or use neutral gray if no tags
  const taskColor = getTaskDisplayColor(task, null, colorMode);

  // Style for positioning (timed variants only)
  const positionStyle = isTimed && getTaskStyle ? getTaskStyle(task) : {};
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !internalDrag?.taskId ? 0.5 : isCompleted || isNotCompleted ? 0.6 : 1,
    filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
    pointerEvents: isDragging && !internalDrag?.taskId ? "none" : "auto",
  };

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

  const handleContextMenu = e => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  // Cycle through outcomes: none -> completed -> not_completed -> none
  const handleOutcomeClick = e => {
    e.stopPropagation();
    const nextOutcome = outcome === "completed" ? "not_completed" : outcome === "not_completed" ? null : "completed";
    completionHandlers.handleOutcomeChange(task.id, date, nextOutcome);
  };

  const isNoDuration = !task.duration || task.duration === 0;
  const showTimeText = isTimed && (task.duration || 30) >= 45;

  return (
    <>
      <Paper
        ref={node => {
          taskRef.current = node;
          setNodeRef(node);
        }}
        variant="outlined"
        onContextMenu={handleContextMenu}
        onClick={() => {
          taskOps.handleEditTask(task);
        }}
        {...attributes}
        {...listeners}
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
          ...dragStyle,
          p: padding,
          bgcolor: getBgColor(),
          borderColor: getBorderColor(),
          borderWidth: isNoDuration ? 2 : 1,
          borderRadius: 1,
          cursor: "grab",
          overflow: "hidden",
          backgroundImage: isNotCompleted ? getStripedBg(theme) : "none",
          color: taskColor ? "white" : theme.palette.text.primary,
          boxShadow: internalDrag?.taskId === task.id ? theme.shadows[8] : "none",
          zIndex: internalDrag?.taskId === task.id ? 50 : "auto",
          minHeight: isTimed ? (isNoDuration ? 24 : undefined) : undefined,
          "&:hover": {
            bgcolor: isNotCompleted ? undefined : "action.hover",
            "& .resize-handle": { opacity: 1 },
          },
        }}
      >
        <Stack direction="row" spacing={0.5} alignItems="flex-start">
          {/* Completion Circle (for recurring tasks) */}
          {isRecurring && (
            <IconButton
              size="small"
              onClick={handleOutcomeClick}
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
            onMouseDown={e => {
              if (!isDragging && handleInternalDragStart) {
                handleInternalDragStart(e, task, "resize");
              }
            }}
            onClick={e => e.stopPropagation()}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: isWeek ? 2 : 3,
              bgcolor: "primary.main",
              cursor: "ns-resize",
              opacity: 0,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!isWeek && (
              <Box
                sx={{
                  width: 32,
                  height: 1,
                  borderRadius: "full",
                  bgcolor: "rgba(255, 255, 255, 0.5)",
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

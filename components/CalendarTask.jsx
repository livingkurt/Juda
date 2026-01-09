"use client";

import { memo, useState, useRef, useCallback, useEffect } from "react";
import { Box, Typography, Paper, Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Repeat, FitnessCenter } from "@mui/icons-material";
import { TaskContextMenu } from "./TaskContextMenu";
import { OutcomeCheckbox } from "./OutcomeCheckbox";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
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
    const justDraggedRef = useRef(false);

    // Use hooks directly (they use Redux internally)
    const taskOps = useTaskOperations();
    const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();
    const completionHandlers = useCompletionHandlers();

    // Variant flags
    const isTimed = variant === "timed" || variant === "timed-week";
    const isWeek = variant === "timed-week" || variant === "untimed-week";
    const fontSize = isWeek ? "0.7rem" : "0.8rem";

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
    const wasDraggingRef = useRef(false);
    const hadMovedRef = useRef(false);

    // Track when drag ends to prevent click from firing
    useEffect(() => {
      if (isInternalDragging) {
        // Currently dragging - mark that we were dragging and store hasMoved
        wasDraggingRef.current = true;
        hadMovedRef.current = internalDrag?.hasMoved || false;
      } else if (wasDraggingRef.current) {
        // Drag just ended - check if we moved
        if (hadMovedRef.current) {
          // We moved - prevent click from firing
          justDraggedRef.current = true;
          // Reset flag after a short delay to allow click events to be processed
          const timeoutId = setTimeout(() => {
            justDraggedRef.current = false;
          }, 150);
          wasDraggingRef.current = false;
          hadMovedRef.current = false;
          return () => clearTimeout(timeoutId);
        }
        // Didn't move - allow click to fire
        wasDraggingRef.current = false;
        hadMovedRef.current = false;
      }
    }, [isInternalDragging, internalDrag?.hasMoved]);

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

    // Handle outcome change (reused from OutcomeCheckbox logic)
    const handleOutcomeChange = useCallback(
      newOutcome => {
        completionHandlers.handleOutcomeChange(task.id, date, newOutcome);
      },
      [task.id, date, completionHandlers]
    );

    // Handle rollover (for recurring tasks)
    const handleRollover = useCallback(
      (taskId, viewDate) => {
        completionHandlers.handleRolloverTask(taskId, viewDate);
      },
      [completionHandlers]
    );

    // Handle mouse down for move (internal drag - Apple Calendar style)
    const handleMoveMouseDown = useCallback(
      e => {
        // Only left click
        if (e.button !== 0) return;
        // Don't start drag if clicking on resize handle
        if (resizeRef.current && resizeRef.current.contains(e.target)) return;
        // Reset drag flag when starting a new drag
        justDraggedRef.current = false;
        // For timed tasks, use internal drag system for moving (Apple Calendar feel)
        if (isTimed && handleInternalDragStart) {
          handleInternalDragStart(e, task, "move");
        }
      },
      [isTimed, handleInternalDragStart, task]
    );

    // Handle touch start for move (iPad/tablet support)
    const handleMoveTouchStart = useCallback(
      e => {
        // Don't start drag if touching on resize handle
        if (resizeRef.current && resizeRef.current.contains(e.target)) return;
        // Reset drag flag when starting a new drag
        justDraggedRef.current = false;
        // For timed tasks, use internal drag system for moving
        if (isTimed && handleInternalDragStart && e.touches.length === 1) {
          // Prevent default touch behaviors (scrolling, zooming)
          e.preventDefault();
          // Create a synthetic event-like object with clientY from touch
          const syntheticEvent = {
            ...e,
            clientY: e.touches[0].clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
          };
          handleInternalDragStart(syntheticEvent, task, "move");
        }
      },
      [isTimed, handleInternalDragStart, task]
    );

    // Handle click - only open dialog if we didn't just drag
    const handleTaskClick = useCallback(
      e => {
        // Don't open if we just finished dragging
        if (justDraggedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        // Don't open if clicking on resize handle or outcome button
        if (resizeRef.current?.contains(e.target)) return;
        if (e.target.closest("button[aria-label]")) return;

        // Open task editor
        taskOps.handleEditTask(task);
      },
      [taskOps, task]
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

    // Handle resize touch start (iPad/tablet support)
    const handleResizeTouchStart = useCallback(
      e => {
        e.preventDefault();
        e.stopPropagation();
        if (handleInternalDragStart && e.touches.length === 1) {
          // Create a synthetic event-like object with clientY from touch
          const syntheticEvent = {
            ...e,
            clientY: e.touches[0].clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
          };
          handleInternalDragStart(syntheticEvent, task, "resize");
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
          onTouchStart={handleMoveTouchStart}
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
            opacity: isCompleted || isNotCompleted ? 0.6 : 1,
            filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
            p: 0,
            bgcolor: getBgColor(),
            borderColor: getBorderColor(),
            borderWidth: isNoDuration ? 2 : 1,
            borderRadius: 1,
            cursor: isTimed ? "grab" : "default",
            overflow: "hidden",
            touchAction: isTimed ? "none" : "auto", // Prevent default touch behaviors during drag
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
            {/* Outcome Checkbox (for recurring tasks) */}
            {isRecurring && (
              <Box
                onMouseDown={e => e.stopPropagation()} // Prevent drag start when clicking
                onClick={e => e.stopPropagation()} // Prevent task click when clicking checkbox
                sx={{
                  px: 0.5,
                  pt: 0.25,
                }}
              >
                <OutcomeCheckbox
                  outcome={outcome}
                  onOutcomeChange={handleOutcomeChange}
                  isChecked={isCompleted}
                  size={isWeek ? "sm" : "md"}
                  isRecurring={isRecurring}
                  viewDate={date}
                  onRollover={handleRollover}
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
              onTouchStart={handleResizeTouchStart}
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
      prevProps.internalDrag?.taskId === nextProps.internalDrag?.taskId &&
      prevProps.internalDrag?.hasMoved === nextProps.internalDrag?.hasMoved
    );
  }
);

export default CalendarTask;

"use client";

import { useState, memo } from "react";
import { Box, Menu } from "@mui/material";
import { getTaskDisplayColor } from "@/lib/utils";
import { TaskContextMenuBase } from "../TaskContextMenu";
import { useTheme } from "@/hooks/useTheme";

/**
 * Compact task card for calendar month view
 * Shows just the title as a colored pill with context menu
 */
export const TaskCardCompact = memo(function TaskCardCompact({
  task,
  date,
  zoom = 1.0,
  isCompleted,
  outcome,
  menuHandlers,
  canEditCompletion,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { theme } = useTheme();

  const actualOutcome = outcome ?? null;
  const actualIsCompleted = isCompleted !== undefined ? isCompleted : actualOutcome === "completed";

  const taskColor = getTaskDisplayColor(task, theme, "dark");
  const isWorkoutTask = task.completionType === "workout";
  const isNotCompleted = actualOutcome === "not_completed";
  const hasOutcome = actualIsCompleted || isNotCompleted;

  // Responsive font sizes based on zoom
  const fontSize = zoom >= 1.5 ? "0.875rem" : zoom >= 1.0 ? "0.75rem" : "0.625rem";

  const handleClick = e => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
    setAnchorEl(null);
  };

  return (
    <>
      <Box
        sx={{
          fontSize,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          color: taskColor ? "white" : "text.primary",
          mb: 0.5,
          bgcolor: taskColor || "grey.700",
          cursor: "pointer",
          opacity: hasOutcome ? 0.6 : 1,
          textDecoration: actualIsCompleted ? "line-through" : "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          "&:hover": {
            opacity: 0.8,
          },
        }}
        onClick={handleClick}
      >
        {task.title}
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <TaskContextMenuBase
          task={task}
          date={date}
          isWorkoutTask={isWorkoutTask}
          onClose={handleMenuClose}
          onEdit={menuHandlers?.onEdit}
          onEditWorkout={menuHandlers?.onEditWorkout}
          onDuplicate={menuHandlers?.onDuplicate}
          onDelete={menuHandlers?.onDelete}
          onBulkEdit={menuHandlers?.onBulkEdit}
          hasMultipleSelected={menuHandlers?.hasMultipleSelected}
          selectedCount={menuHandlers?.selectedCount}
          canEditCompletion={canEditCompletion}
        />
      </Menu>
    </>
  );
});

"use client";

import { useState, memo } from "react";
import { Box, Menu, Text } from "@mantine/core";
import { getTaskDisplayColor } from "@/lib/utils";
import { TaskContextMenu } from "../TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useTheme } from "@/hooks/useTheme";

/**
 * Compact task card for calendar month view
 * Shows just the title as a colored pill with context menu
 */
export const TaskCardCompact = memo(function TaskCardCompact({
  task,
  date,
  zoom = 1.0,
  isCompleted = false,
  outcome = null,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, colorMode } = useSemanticColors();
  const { theme } = useTheme();

  // Use hooks directly (they use Redux internally)
  const { getOutcomeOnDate } = useCompletionHelpers();

  // Get outcome from Redux if not provided
  const actualOutcome = outcome !== null ? outcome : getOutcomeOnDate(task.id, date);
  const actualIsCompleted = isCompleted !== undefined ? isCompleted : actualOutcome === "completed";

  const taskColor = getTaskDisplayColor(task, theme, colorMode);
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const isNotCompleted = actualOutcome === "not_completed";
  const hasOutcome = actualIsCompleted || isNotCompleted;

  // Responsive font sizes based on zoom
  const fontSize = {
    base: zoom >= 1.5 ? "0.75rem" : zoom >= 1.0 ? "0.625rem" : "0.625rem",
    md: zoom >= 1.5 ? "0.875rem" : zoom >= 1.0 ? "0.75rem" : "0.625rem",
  };

  return (
    <Menu opened={menuOpen} onClose={() => setMenuOpen(false)} position="right-start">
      <Menu.Target>
        <Box
          style={{
            fontSize: fontSize.base,
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: "0.375rem",
            color: taskColor ? "white" : undefined,
            marginBottom: 2,
            background: taskColor || mode.task.neutral,
            cursor: "pointer",
            opacity: hasOutcome ? 0.6 : 1,
            textDecoration: actualIsCompleted ? "line-through" : "none",
          }}
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.8";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = hasOutcome ? 0.6 : 1;
          }}
        >
          <Text truncate="end">{task.title}</Text>
        </Box>
      </Menu.Target>

      <Menu.Dropdown onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <TaskContextMenu
          task={task}
          date={date}
          isRecurring={isRecurring}
          isWorkoutTask={isWorkoutTask}
          outcome={actualOutcome}
          onClose={() => setMenuOpen(false)}
        />
      </Menu.Dropdown>
    </Menu>
  );
});

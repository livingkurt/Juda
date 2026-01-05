"use client";

import { memo } from "react";
import { Box, Text } from "@mantine/core";
import { getTaskDisplayColor } from "@/lib/utils";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTheme } from "@/hooks/useTheme";

/**
 * Minimal task display for year view cells
 * Just shows a colored box with truncated title
 */
export const TaskCardMini = memo(function TaskCardMini({
  task,
  zoom = 1.0,
  isCompleted = false,
  outcome = null,
  onClick,
}) {
  const { mode, colorMode } = useSemanticColors();
  const { theme } = useTheme();
  const taskColor = getTaskDisplayColor(task, theme, colorMode);
  const hasOutcome = isCompleted || outcome === "not_completed";

  const fontSize = {
    base: zoom >= 1.5 ? "0.625rem" : zoom >= 1.0 ? "0.625rem" : "0.5rem",
    md: zoom >= 1.5 ? "0.75rem" : zoom >= 1.0 ? "0.625rem" : "0.625rem",
  };

  return (
    <Box
      style={{
        fontSize: fontSize.base,
        paddingLeft: zoom >= 1.0 ? 2 : 1,
        paddingRight: zoom >= 1.0 ? 2 : 1,
        paddingTop: zoom >= 1.0 ? 2 : 1,
        paddingBottom: zoom >= 1.0 ? 2 : 1,
        borderRadius: "0.375rem",
        color: taskColor ? "white" : undefined,
        background: taskColor || mode.task.neutral,
        opacity: hasOutcome ? 0.6 : 1,
        lineHeight: zoom >= 1.5 ? 1.2 : zoom >= 1.0 ? 1.1 : 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
      }}
      title={task.title}
      onClick={onClick}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.opacity = "0.8";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = hasOutcome ? 0.6 : 1;
      }}
    >
      <Text truncate="end">{task.title}</Text>
    </Box>
  );
});

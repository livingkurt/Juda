"use client";

import { memo } from "react";
import { Box } from "@mui/material";
import { getTaskDisplayColor } from "@/lib/utils";
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
  const { theme } = useTheme();
  const taskColor = getTaskDisplayColor(task, theme, "dark");
  const hasOutcome = isCompleted || outcome === "not_completed";

  const fontSize = zoom >= 1.5 ? "0.75rem" : zoom >= 1.0 ? "0.625rem" : "0.5rem";

  return (
    <Box
      sx={{
        fontSize,
        px: zoom >= 1.0 ? 0.5 : 0.25,
        py: zoom >= 1.0 ? 0.5 : 0.25,
        borderRadius: 1,
        color: taskColor ? "white" : "text.primary",
        bgcolor: taskColor || "grey.700",
        opacity: hasOutcome ? 0.6 : 1,
        lineHeight: zoom >= 1.5 ? 1.2 : zoom >= 1.0 ? 1.1 : 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick ? { opacity: 0.8 } : {},
      }}
      title={task.title}
      onClick={onClick}
    >
      {task.title}
    </Box>
  );
});

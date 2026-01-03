"use client";

import { memo } from "react";
import { Box } from "@chakra-ui/react";
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
    base: zoom >= 1.5 ? "2xs" : zoom >= 1.0 ? "3xs" : "4xs",
    md: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
  };

  return (
    <Box
      fontSize={fontSize}
      px={zoom >= 1.0 ? 0.5 : 0.25}
      py={zoom >= 1.0 ? 0.5 : 0.25}
      borderRadius="md"
      isTruncated
      color={taskColor ? "white" : undefined}
      bg={taskColor || mode.task.neutral}
      opacity={hasOutcome ? 0.6 : 1}
      title={task.title}
      lineHeight={zoom >= 1.5 ? 1.2 : zoom >= 1.0 ? 1.1 : 1}
      overflow="hidden"
      textOverflow="ellipsis"
      whiteSpace="nowrap"
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      _hover={onClick ? { opacity: 0.8 } : {}}
    >
      {task.title}
    </Box>
  );
});

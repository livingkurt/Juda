"use client";

import { useMemo } from "react";
import { getTaskDisplayColor } from "@/lib/utils";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * Hook to compute task display styles based on state
 *
 * @param {Object} task - Task object
 * @param {Object} options - Style options
 * @param {boolean} options.isCompleted - Is task completed
 * @param {string|null} options.outcome - Task outcome
 * @param {boolean} options.isDragging - Is task being dragged
 * @param {boolean} options.isSelected - Is task selected for bulk edit
 * @returns {Object} Style properties for task rendering
 */
export function useTaskStyles(task, options = {}) {
  const { isCompleted = false, outcome = null, isDragging = false, isSelected = false } = options;
  const { mode, selection } = useSemanticColors();

  return useMemo(() => {
    const taskColor = getTaskDisplayColor(task);
    const isNotCompleted = outcome === "not_completed";
    const hasOutcome = isCompleted || isNotCompleted;

    // Base styles
    const baseStyles = {
      // Task color from first tag, or neutral
      taskColor,
      hasCustomColor: Boolean(taskColor),

      // Text colors
      textColor: taskColor ? "white" : mode.text.primary,
      mutedTextColor: taskColor ? "whiteAlpha.700" : mode.text.secondary,

      // Background colors
      bgColor: taskColor || mode.bg.surface,
      hoverBgColor: mode.bg.surfaceHover,

      // Border
      borderColor: isSelected ? selection.border : taskColor || mode.border.default,
      borderWidth: isSelected ? "2px" : "1px",

      // Selection highlight
      selectionRing: isSelected ? `0 0 0 2px ${selection.border}` : "none",
    };

    // Completion state modifiers
    const completionStyles = {
      opacity: hasOutcome ? 0.6 : isDragging ? 0.5 : 1,
      filter: hasOutcome ? "brightness(0.7)" : "none",
      textDecoration: isCompleted ? "line-through" : "none",
    };

    // Not completed pattern (diagonal stripes)
    const notCompletedPattern = isNotCompleted
      ? {
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(0, 0, 0, 0.2) 4px,
            rgba(0, 0, 0, 0.2) 8px
          )`,
        }
      : {};

    return {
      ...baseStyles,
      ...completionStyles,
      notCompletedPattern,

      // Computed properties
      isCompleted,
      isNotCompleted,
      hasOutcome,
      isDragging,
      isSelected,
    };
  }, [task, isCompleted, outcome, isDragging, isSelected, mode, selection]);
}

/**
 * Get neutral task colors (when task has no tags)
 */
export function getNeutralTaskColors(colorMode = "dark") {
  return {
    bg: colorMode === "dark" ? "#2D3748" : "#E2E8F0",
    text: colorMode === "dark" ? "#F7FAFC" : "#1A202C",
  };
}

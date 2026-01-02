"use client";

import { useMemo } from "react";
import { semanticColors, badgeColors, palette } from "@/lib/colors";
import { useColorModeSync } from "@/hooks/useColorModeSync";

/**
 * Hook to access semantic colors based on current color mode.
 *
 * @returns {Object} Semantic colors resolved for current mode
 *
 * @example
 * const { bg, text, border, status, task, interactive, selection, dnd, calendar, badges } = useSemanticColors();
 *
 * // Use in components:
 * <Box bg={bg.surface} color={text.primary} borderColor={border.default}>
 *   Content
 * </Box>
 */
export function useSemanticColors() {
  const { colorMode } = useColorModeSync();
  const mode = colorMode || "dark";

  return useMemo(() => {
    // Helper to resolve color for current mode
    const resolve = colorDef => {
      if (typeof colorDef === "string") return colorDef;
      return colorDef[mode] || colorDef.dark;
    };

    // Helper to resolve an entire color group
    const resolveGroup = group => {
      const resolved = {};
      for (const [key, value] of Object.entries(group)) {
        resolved[key] = resolve(value);
      }
      return resolved;
    };

    // Helper to create Chakra color mode object for inline styles
    const colorModeObj = colorDef => {
      if (typeof colorDef === "string") return colorDef;
      return { _light: colorDef.light, _dark: colorDef.dark };
    };

    // Helper to resolve badge colors
    const resolveBadge = badgeDef => ({
      colorPalette: badgeDef.colorPalette,
      bg: resolve(badgeDef.bg),
      color: resolve(badgeDef.color),
      // Also provide color mode objects for Chakra components
      bgMode: colorModeObj(badgeDef.bg),
      colorMode: colorModeObj(badgeDef.color),
    });

    return {
      // Resolved colors (direct hex values)
      bg: resolveGroup(semanticColors.bg),
      text: resolveGroup(semanticColors.text),
      border: resolveGroup(semanticColors.border),
      status: resolveGroup(semanticColors.status),
      task: resolveGroup(semanticColors.task),
      interactive: resolveGroup(semanticColors.interactive),
      selection: resolveGroup(semanticColors.selection),
      dnd: resolveGroup(semanticColors.dnd),
      calendar: resolveGroup(semanticColors.calendar),

      // Badge presets
      badges: {
        overdue: resolveBadge(badgeColors.overdue),
        recurring: resolveBadge(badgeColors.recurring),
        noTime: resolveBadge(badgeColors.noTime),
        workout: resolveBadge(badgeColors.workout),
        completed: resolveBadge(badgeColors.completed),
        count: resolveBadge(badgeColors.count),
        past: resolveBadge(badgeColors.past),
        future: resolveBadge(badgeColors.future),
      },

      // Color mode objects (for Chakra's _light/_dark syntax)
      mode: {
        bg: {
          canvas: colorModeObj(semanticColors.bg.canvas),
          surface: colorModeObj(semanticColors.bg.surface),
          surfaceHover: colorModeObj(semanticColors.bg.surfaceHover),
          elevated: colorModeObj(semanticColors.bg.elevated),
          muted: colorModeObj(semanticColors.bg.muted),
          subtle: colorModeObj(semanticColors.bg.subtle),
          input: colorModeObj(semanticColors.bg.input),
          inputHover: colorModeObj(semanticColors.bg.inputHover),
        },
        text: {
          primary: colorModeObj(semanticColors.text.primary),
          secondary: colorModeObj(semanticColors.text.secondary),
          muted: colorModeObj(semanticColors.text.muted),
          placeholder: colorModeObj(semanticColors.text.placeholder),
          inverse: colorModeObj(semanticColors.text.inverse),
          link: colorModeObj(semanticColors.text.link),
          linkHover: colorModeObj(semanticColors.text.linkHover),
        },
        border: {
          default: colorModeObj(semanticColors.border.default),
          subtle: colorModeObj(semanticColors.border.subtle),
          emphasized: colorModeObj(semanticColors.border.emphasized),
          input: colorModeObj(semanticColors.border.input),
          focus: colorModeObj(semanticColors.border.focus),
        },
        task: {
          completed: colorModeObj(semanticColors.task.completed),
          completedBg: colorModeObj(semanticColors.task.completedBg),
          overdue: colorModeObj(semanticColors.task.overdue),
          overdueBg: colorModeObj(semanticColors.task.overdueBg),
          recurring: colorModeObj(semanticColors.task.recurring),
          recurringBg: colorModeObj(semanticColors.task.recurringBg),
          noTime: colorModeObj(semanticColors.task.noTime),
          noTimeBg: colorModeObj(semanticColors.task.noTimeBg),
          workout: colorModeObj(semanticColors.task.workout),
          workoutBg: colorModeObj(semanticColors.task.workoutBg),
          neutral: colorModeObj(semanticColors.task.neutral),
          neutralText: colorModeObj(semanticColors.task.neutralText),
        },
        selection: {
          bg: colorModeObj(semanticColors.selection.bg),
          border: colorModeObj(semanticColors.selection.border),
        },
        status: {
          success: colorModeObj(semanticColors.status.success),
          successBg: colorModeObj(semanticColors.status.successBg),
          successText: colorModeObj(semanticColors.status.successText),
          warning: colorModeObj(semanticColors.status.warning),
          warningBg: colorModeObj(semanticColors.status.warningBg),
          warningText: colorModeObj(semanticColors.status.warningText),
          error: colorModeObj(semanticColors.status.error),
          errorBg: colorModeObj(semanticColors.status.errorBg),
          errorText: colorModeObj(semanticColors.status.errorText),
          info: colorModeObj(semanticColors.status.info),
          infoBg: colorModeObj(semanticColors.status.infoBg),
          infoText: colorModeObj(semanticColors.status.infoText),
        },
      },

      // Raw palette access for edge cases
      palette,

      // Current mode for conditional logic
      colorMode: mode,
      isDark: mode === "dark",
      isLight: mode === "light",
    };
  }, [mode]);
}

/**
 * Get task display color from first tag, with semantic fallback
 * This is a pure function that can be used outside of React components
 *
 * @param {Object} task - Task object with optional tags array
 * @param {string} colorMode - Current color mode ('light' or 'dark')
 * @returns {string|null} Hex color or null for neutral styling
 */
export function getTaskColor(task) {
  if (task?.tags && task.tags.length > 0) {
    return task.tags[0].color;
  }
  return null;
}

/**
 * Get neutral task colors based on color mode
 * Use when task has no tags
 *
 * @param {string} colorMode - Current color mode
 * @returns {Object} { bg, text } colors
 */
export function getNeutralTaskColors(colorMode = "dark") {
  return {
    bg: colorMode === "dark" ? palette.gray[700] : palette.gray[200],
    text: colorMode === "dark" ? palette.gray[100] : palette.gray[800],
  };
}

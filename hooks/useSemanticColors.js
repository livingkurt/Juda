"use client";

import { useMemo } from "react";
import { semanticColors, badgeColors, palette } from "@/lib/colors";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useTheme } from "@/hooks/useTheme";

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
  const { theme } = useTheme();
  const mode = colorMode || "dark";

  return useMemo(() => {
    // Get theme colors for current mode
    const themeColors = theme.colors[mode];

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

    // Helper to create color mode object for inline styles
    const colorModeObj = colorDef => {
      if (typeof colorDef === "string") return colorDef;
      return { _light: colorDef.light, _dark: colorDef.dark };
    };

    // Helper to resolve badge colors
    const resolveBadge = badgeDef => ({
      colorPalette: badgeDef.colorPalette,
      bg: resolve(badgeDef.bg),
      color: resolve(badgeDef.color),
      // Also provide color mode objects for compatibility
      bgMode: colorModeObj(badgeDef.bg),
      colorMode: colorModeObj(badgeDef.color),
    });

    // Resolve base semantic colors
    const baseBg = resolveGroup(semanticColors.bg);
    const baseText = resolveGroup(semanticColors.text);
    const baseBorder = resolveGroup(semanticColors.border);
    const baseStatus = resolveGroup(semanticColors.status);
    const baseTask = resolveGroup(semanticColors.task);

    // Override background colors with theme-specific backgrounds
    const bg = {
      ...baseBg,
      canvas: themeColors.bgCanvas,
      surface: themeColors.bgSurface,
      elevated: themeColors.bgElevated,
    };

    // Icon colors from theme
    const icon = {
      primary: themeColors.iconPrimary,
      secondary: themeColors.iconSecondary,
      accent: themeColors.iconAccent,
    };

    // Merge theme colors into interactive colors
    const interactive = {
      primary: themeColors.primary,
      primaryHover: themeColors.primaryHover,
      primaryActive: themeColors.primaryActive,
      secondary: resolve(semanticColors.interactive.secondary),
      secondaryHover: resolve(semanticColors.interactive.secondaryHover),
      danger: resolve(semanticColors.interactive.danger),
      dangerHover: resolve(semanticColors.interactive.dangerHover),
    };

    // Merge theme colors into text (for links)
    const text = {
      ...baseText,
      link: themeColors.link,
      linkHover: themeColors.linkHover,
    };

    // Merge theme colors into border (for focus)
    const border = {
      ...baseBorder,
      focus: themeColors.focus,
    };

    // Merge theme colors into selection
    const selection = {
      bg: themeColors.selection,
      border: themeColors.selectionBorder,
      ring: resolve(semanticColors.selection.ring),
    };

    // Merge theme colors into dnd
    const dnd = {
      overlay: resolve(semanticColors.dnd.overlay),
      dropTarget: themeColors.dndDropTarget,
      dropTargetBorder: themeColors.dndDropTargetBorder,
    };

    // Merge theme colors into calendar
    const calendar = {
      ...resolveGroup(semanticColors.calendar),
      today: themeColors.calendarToday,
      selected: themeColors.calendarSelected,
    };

    return {
      // Resolved colors (direct hex values)
      bg,
      text,
      border,
      status: baseStatus,
      task: baseTask,
      interactive,
      selection,
      dnd,
      calendar,
      icon,

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

      // Color mode objects (for light/dark mode styling)
      mode: {
        bg: {
          canvas: { _light: theme.colors.light.bgCanvas, _dark: theme.colors.dark.bgCanvas },
          surface: { _light: theme.colors.light.bgSurface, _dark: theme.colors.dark.bgSurface },
          surfaceHover: colorModeObj(semanticColors.bg.surfaceHover),
          elevated: { _light: theme.colors.light.bgElevated, _dark: theme.colors.dark.bgElevated },
          muted: colorModeObj(semanticColors.bg.muted),
          subtle: colorModeObj(semanticColors.bg.subtle),
          input: colorModeObj(semanticColors.bg.input),
          inputHover: colorModeObj(semanticColors.bg.inputHover),
        },
        icon: {
          primary: { _light: theme.colors.light.iconPrimary, _dark: theme.colors.dark.iconPrimary },
          secondary: { _light: theme.colors.light.iconSecondary, _dark: theme.colors.dark.iconSecondary },
          accent: { _light: theme.colors.light.iconAccent, _dark: theme.colors.dark.iconAccent },
        },
        text: {
          primary: colorModeObj(semanticColors.text.primary),
          secondary: colorModeObj(semanticColors.text.secondary),
          muted: colorModeObj(semanticColors.text.muted),
          placeholder: colorModeObj(semanticColors.text.placeholder),
          inverse: colorModeObj(semanticColors.text.inverse),
          link: { _light: theme.colors.light.link, _dark: theme.colors.dark.link },
          linkHover: { _light: theme.colors.light.linkHover, _dark: theme.colors.dark.linkHover },
        },
        border: {
          default: colorModeObj(semanticColors.border.default),
          subtle: colorModeObj(semanticColors.border.subtle),
          emphasized: colorModeObj(semanticColors.border.emphasized),
          input: colorModeObj(semanticColors.border.input),
          focus: { _light: theme.colors.light.focus, _dark: theme.colors.dark.focus },
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
  }, [mode, theme]);
}

/**
 * Get task display color from first tag, with theme mapping
 * This is a pure function that can be used outside of React components
 *
 * @param {Object} task - Task object with optional tags array
 * @param {Object} theme - Current theme object (optional)
 * @param {string} colorMode - Current color mode ('light' or 'dark')
 * @returns {string|null} Hex color or null for neutral styling
 */
export function getTaskColor(task, theme = null, colorMode = "dark") {
  if (task?.tags && task.tags.length > 0) {
    const storedColor = task.tags[0].color;

    // If theme is provided, map the color to the theme palette
    if (theme && theme.colors && theme.colors[colorMode]) {
      const { mapColorToTheme } = require("@/lib/themes.js");
      const themePalette = theme.colors[colorMode].tagColors;
      return mapColorToTheme(storedColor, themePalette);
    }

    return storedColor;
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

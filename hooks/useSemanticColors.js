"use client";

import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { useColorModeSync } from "@/hooks/useColorModeSync";

/**
 * Hook to get semantic colors based on Material UI theme
 * Provides color values compatible with existing component code
 *
 * @returns {Object} Semantic color values
 */
export function useSemanticColors() {
  const theme = useTheme();
  const { colorMode } = useColorModeSync();

  return useMemo(() => {
    const isDark = colorMode === "dark";
    const palette = theme.palette;

    return {
      mode: {
        // Text colors
        text: {
          primary: palette.text.primary,
          secondary: palette.text.secondary,
          disabled: palette.text.disabled,
        },
        // Background colors
        bg: {
          surface: palette.background.paper,
          surfaceHover: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
          elevated: palette.background.elevated || palette.background.paper,
          canvas: palette.background.default,
        },
        // Border colors
        border: {
          default: palette.divider,
          hover: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
        },
      },
      // Selection colors
      selection: {
        bg: palette.action.selected,
        border: palette.primary.main,
        hover: palette.action.hover,
      },
      // Primary colors
      primary: {
        main: palette.primary.main,
        light: palette.primary.light,
        dark: palette.primary.dark,
        contrast: palette.primary.contrastText,
      },
      // Error colors
      error: {
        main: palette.error.main,
        light: palette.error.light,
        dark: palette.error.dark,
      },
      // Success colors
      success: {
        main: palette.success.main,
        light: palette.success.light,
        dark: palette.success.dark,
      },
      // Warning colors
      warning: {
        main: palette.warning.main,
        light: palette.warning.light,
        dark: palette.warning.dark,
      },
    };
  }, [theme, colorMode]);
}

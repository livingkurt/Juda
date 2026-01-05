"use client";

import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useColorMode } from "@/hooks/useColorMode";
import { TASK_COLORS } from "@/lib/constants";

/**
 * Hook to get theme-aware colors for tag color picker
 * Returns the current theme's tag color palette for display
 *
 * @returns {Object} Theme colors and utilities
 */
export function useThemeColors() {
  const { theme } = useTheme();
  const { mode: colorMode } = useColorMode();

  return useMemo(() => {
    const mode = colorMode || "dark";
    const themePalette = theme.colors[mode].tagColors;

    return {
      // Theme-aware tag colors for color picker display
      tagColors: themePalette,

      // Original canonical colors (for storing in database)
      canonicalColors: TASK_COLORS,

      // Get theme color by index
      getThemeColor: index => themePalette[index] || TASK_COLORS[index],

      // Get canonical color by index (for database storage)
      getCanonicalColor: index => TASK_COLORS[index],
    };
  }, [theme, colorMode]);
}

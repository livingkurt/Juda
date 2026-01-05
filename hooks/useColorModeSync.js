"use client";

import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { useColorMode } from "@/hooks/useColorMode";

/**
 * Hook to sync color mode from Material UI theme
 * Provides color mode value compatible with existing code
 *
 * @returns {Object} Color mode state
 * @returns {string} colorMode - Current color mode ("light" or "dark")
 */
export function useColorModeSync() {
  const { mode } = useColorMode();
  const muiTheme = useTheme();

  return useMemo(() => {
    // Get mode from Material UI theme or color mode context
    const currentMode = mode || muiTheme.palette.mode || "dark";

    return {
      colorMode: currentMode,
      mode: currentMode,
      isDark: currentMode === "dark",
      isLight: currentMode === "light",
    };
  }, [mode, muiTheme.palette.mode]);
}

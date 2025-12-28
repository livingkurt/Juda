"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

export function useColorModeSync() {
  const { preferences, updatePreference, initialized } = usePreferencesContext();

  // Derive color mode from preferences instead of storing in state
  const colorMode = useMemo(() => {
    return preferences?.colorMode || "dark";
  }, [preferences?.colorMode]);

  // Sync DOM with color mode whenever it changes
  useLayoutEffect(() => {
    if (!initialized) return;

    // Update document class and colorScheme for CSS-based theming (Chakra v3)
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(colorMode);
    document.documentElement.style.colorScheme = colorMode;
  }, [initialized, colorMode]);

  // Save color mode changes to preferences
  // The DOM update will happen automatically via the useLayoutEffect above
  const toggleColorModeWithSync = () => {
    const newMode = colorMode === "dark" ? "light" : "dark";
    updatePreference("colorMode", newMode);
  };

  const setColorMode = mode => {
    updatePreference("colorMode", mode);
  };

  return {
    colorMode,
    toggleColorMode: toggleColorModeWithSync,
    setColorMode,
  };
}

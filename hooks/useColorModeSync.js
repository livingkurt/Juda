"use client";

import { useEffect, useState } from "react";
import { usePreferencesContext } from "@/contexts/PreferencesContext";

export function useColorModeSync() {
  const { preferences, updatePreference, initialized } = usePreferencesContext();
  const [colorMode, setColorModeState] = useState(() => preferences?.colorMode || "dark");

  // Sync color mode from preferences whenever preferences change
  useEffect(() => {
    if (!initialized) return;

    // Sync whenever preferences.colorMode changes and doesn't match current colorMode
    if (preferences.colorMode && preferences.colorMode !== colorMode) {
      setColorModeState(preferences.colorMode);
      // Update document class and colorScheme for CSS-based theming (Chakra v3)
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(preferences.colorMode);
      document.documentElement.style.colorScheme = preferences.colorMode;
    }
  }, [initialized, preferences.colorMode, colorMode]);

  // Save color mode changes to preferences
  const toggleColorModeWithSync = () => {
    const newMode = colorMode === "dark" ? "light" : "dark";
    setColorModeState(newMode);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newMode);
    document.documentElement.style.colorScheme = newMode;

    // Save to preferences (will be saved to DB if authenticated)
    updatePreference("colorMode", newMode);
  };

  const setColorMode = mode => {
    setColorModeState(mode);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
    document.documentElement.style.colorScheme = mode;
    updatePreference("colorMode", mode);
  };

  return {
    colorMode,
    toggleColorMode: toggleColorModeWithSync,
    setColorMode,
  };
}

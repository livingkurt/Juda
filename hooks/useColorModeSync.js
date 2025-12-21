"use client";

import { useEffect } from "react";
import { useColorMode } from "@chakra-ui/react";
import { usePreferencesContext } from "@/contexts/PreferencesContext";

export function useColorModeSync() {
  const { colorMode, setColorMode } = useColorMode();
  const { preferences, updatePreference, initialized } = usePreferencesContext();

  // Sync color mode from preferences whenever preferences change
  useEffect(() => {
    if (!initialized) return;

    // Sync whenever preferences.colorMode changes and doesn't match Chakra UI's colorMode
    if (preferences.colorMode && preferences.colorMode !== colorMode) {
      setColorMode(preferences.colorMode);
    }
  }, [initialized, preferences.colorMode, colorMode, setColorMode]);

  // Save color mode changes to preferences
  const toggleColorModeWithSync = () => {
    const newMode = colorMode === "dark" ? "light" : "dark";
    setColorMode(newMode);

    // Save to preferences (will be saved to DB if authenticated)
    updatePreference("colorMode", newMode);
  };

  return {
    colorMode,
    toggleColorMode: toggleColorModeWithSync,
    setColorMode: mode => {
      setColorMode(mode);
      updatePreference("colorMode", mode);
    },
  };
}

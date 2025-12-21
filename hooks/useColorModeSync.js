"use client";

import { useEffect, useRef } from "react";
import { useColorMode } from "@chakra-ui/react";
import { usePreferencesContext } from "@/contexts/PreferencesContext";
import { useAuth } from "@/contexts/AuthContext";

export function useColorModeSync() {
  const { colorMode, setColorMode } = useColorMode();
  const { preferences, updatePreference, initialized } = usePreferencesContext();
  const { isAuthenticated } = useAuth();
  const initialSyncDone = useRef(false);

  // Sync color mode from preferences on initial load
  useEffect(() => {
    if (!initialized || initialSyncDone.current) return;

    // Only sync once after preferences are loaded
    if (preferences.colorMode && preferences.colorMode !== colorMode) {
      setColorMode(preferences.colorMode);
    }

    initialSyncDone.current = true;
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

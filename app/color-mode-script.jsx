"use client";

import { useEffect } from "react";

/**
 * Script to initialize color mode before React hydration
 * This prevents flash of wrong color mode on page load
 */
export function ColorModeScript() {
  useEffect(() => {
    // This runs on client side to ensure color mode is set correctly
    const initColorMode = () => {
      try {
        // Try to get from localStorage first (set by preferences)
        const stored = localStorage.getItem("juda-preferences");
        if (stored) {
          const prefs = JSON.parse(stored);
          const colorMode = prefs.colorMode || "dark";
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(colorMode);
          document.documentElement.style.colorScheme = colorMode;
        } else {
          // Default to dark mode
          document.documentElement.classList.add("dark");
          document.documentElement.style.colorScheme = "dark";
        }
      } catch {
        // Fallback to dark mode
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      }
    };

    initColorMode();
  }, []);

  return null;
}

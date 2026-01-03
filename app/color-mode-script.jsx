"use client";

import { useEffect } from "react";
import { getThemeById } from "@/lib/themes";

/**
 * Script to initialize color mode and theme before React hydration
 * This prevents flash of wrong color mode/theme on page load
 */
export function ColorModeScript() {
  useEffect(() => {
    // This runs on client side to ensure color mode and theme are set correctly
    const initTheme = () => {
      try {
        // Try to get from localStorage first (set by preferences)
        const stored = localStorage.getItem("juda-preferences");
        if (stored) {
          const prefs = JSON.parse(stored);
          const colorMode = prefs.colorMode || "dark";
          const themeId = prefs.themeId || "default";

          // Set color mode
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(colorMode);
          document.documentElement.style.colorScheme = colorMode;

          // Set theme data attribute
          document.documentElement.setAttribute("data-theme", themeId);

          // Apply theme CSS variables immediately
          const theme = getThemeById(themeId);
          const colors = theme.colors[colorMode];
          Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--theme-${key}`, value);
          });
          // Set background colors
          document.documentElement.style.setProperty("--chakra-colors-bg-canvas", colors.bgCanvas);
          document.documentElement.style.setProperty("--chakra-colors-bg-surface", colors.bgSurface);
          document.documentElement.style.setProperty("--chakra-colors-bg-elevated", colors.bgElevated);
          // Also set Chakra color tokens
          document.documentElement.style.setProperty("--chakra-colors-blue-500", colors.primary);
          document.documentElement.style.setProperty("--chakra-colors-blue-600", colors.primaryHover);
          document.documentElement.style.setProperty("--chakra-colors-blue-700", colors.primaryActive);
          document.documentElement.style.setProperty("--chakra-colors-blue-400", colors.focus);
        } else {
          // Default to dark mode and default theme
          document.documentElement.classList.add("dark");
          document.documentElement.style.colorScheme = "dark";
          document.documentElement.setAttribute("data-theme", "default");

          // Apply default theme colors
          const theme = getThemeById("default");
          const colors = theme.colors.dark;
          Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--theme-${key}`, value);
          });
          // Set background colors
          document.documentElement.style.setProperty("--chakra-colors-bg-canvas", colors.bgCanvas);
          document.documentElement.style.setProperty("--chakra-colors-bg-surface", colors.bgSurface);
          document.documentElement.style.setProperty("--chakra-colors-bg-elevated", colors.bgElevated);
          // Also set Chakra color tokens
          document.documentElement.style.setProperty("--chakra-colors-blue-500", colors.primary);
          document.documentElement.style.setProperty("--chakra-colors-blue-600", colors.primaryHover);
          document.documentElement.style.setProperty("--chakra-colors-blue-700", colors.primaryActive);
          document.documentElement.style.setProperty("--chakra-colors-blue-400", colors.focus);
        }
      } catch {
        // Fallback to dark mode and default theme
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
        document.documentElement.setAttribute("data-theme", "default");

        // Apply default theme colors
        const theme = getThemeById("default");
        const colors = theme.colors.dark;
        Object.entries(colors).forEach(([key, value]) => {
          document.documentElement.style.setProperty(`--theme-${key}`, value);
        });
        // Set background colors
        document.documentElement.style.setProperty("--chakra-colors-bg-canvas", colors.bgCanvas);
        document.documentElement.style.setProperty("--chakra-colors-bg-surface", colors.bgSurface);
        document.documentElement.style.setProperty("--chakra-colors-bg-elevated", colors.bgElevated);
        // Also set Chakra color tokens
        document.documentElement.style.setProperty("--chakra-colors-blue-500", colors.primary);
        document.documentElement.style.setProperty("--chakra-colors-blue-600", colors.primaryHover);
        document.documentElement.style.setProperty("--chakra-colors-blue-700", colors.primaryActive);
        document.documentElement.style.setProperty("--chakra-colors-blue-400", colors.focus);
      }
    };

    initTheme();
  }, []);

  return null;
}

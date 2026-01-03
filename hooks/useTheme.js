"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { getThemeById, getAllThemes } from "@/lib/themes";

/**
 * Hook to manage theme selection and application
 *
 * @returns {Object} Theme state and controls
 * @returns {string} themeId - Current theme ID
 * @returns {Object} theme - Current theme object
 * @returns {Function} setTheme - Function to change theme
 * @returns {Array} themes - All available themes
 */
export function useTheme() {
  const { preferences, updatePreference, initialized } = usePreferencesContext();

  const themeId = useMemo(() => {
    return preferences?.themeId || "default";
  }, [preferences?.themeId]);

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  // Apply theme colors as CSS variables when theme or color mode changes
  useLayoutEffect(() => {
    if (!initialized) return;

    // Get current color mode from document (set by useColorModeSync)
    const isDark = document.documentElement.classList.contains("dark");
    const mode = isDark ? "dark" : "light";
    const colors = theme.colors[mode];

    const root = document.documentElement;

    // Set CSS variables for theme colors
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Apply background colors
    root.style.setProperty("--chakra-colors-bg-canvas", colors.bgCanvas);
    root.style.setProperty("--chakra-colors-bg-surface", colors.bgSurface);
    root.style.setProperty("--chakra-colors-bg-elevated", colors.bgElevated);

    // Also set Chakra's CSS custom properties directly
    // Chakra v3 uses these CSS variables internally for color tokens
    // Format: --chakra-colors-{colorName}-{shade}
    root.style.setProperty("--chakra-colors-blue-500", colors.primary);
    root.style.setProperty("--chakra-colors-blue-600", colors.primaryHover);
    root.style.setProperty("--chakra-colors-blue-700", colors.primaryActive);
    root.style.setProperty("--chakra-colors-blue-400", colors.focus);
    root.style.setProperty("--chakra-colors-blue-300", colors.primaryHover);

    // Set data attribute for potential CSS selectors
    root.setAttribute("data-theme", themeId);
  }, [initialized, theme, themeId]);

  const setTheme = newThemeId => {
    updatePreference("themeId", newThemeId);
  };

  return {
    themeId,
    theme,
    setTheme,
    themes: getAllThemes(),
  };
}

/**
 * Component to initialize theme CSS variables early in the render tree
 * This ensures theme colors are available before Chakra components render
 */
export function ThemeInitializer() {
  useTheme(); // Just call the hook to trigger CSS variable updates
  return null;
}

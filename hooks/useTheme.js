"use client";

import { useLayoutEffect, useMemo } from "react";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { getThemeById, getAllThemes } from "@/lib/themes";

/**
 * Hook to manage theme selection and application
 * Supports customColors overrides merged over the default theme
 */
export function useTheme() {
  const { preferences, updatePreference, initialized } = usePreferencesContext();

  const themeId = useMemo(() => {
    return preferences?.themeId || "default";
  }, [preferences?.themeId]);

  const customColors = useMemo(() => {
    return preferences?.customColors || {};
  }, [preferences?.customColors]);

  const theme = useMemo(() => getThemeById(themeId), [themeId]);

  // Apply theme colors as CSS variables when theme or color mode changes
  useLayoutEffect(() => {
    if (!initialized) return;

    const isDark = document.documentElement.classList.contains("dark");
    const mode = isDark ? "dark" : "light";
    const baseColors = theme.colors[mode];

    // Merge customColors over base theme colors
    const colors = { ...baseColors, ...customColors };

    const root = document.documentElement;

    // Set CSS variables for theme colors
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === "string") {
        root.style.setProperty(`--theme-${key}`, value);
      }
    });

    // Apply background colors
    root.style.setProperty("--chakra-colors-bg-canvas", colors.bgCanvas);
    root.style.setProperty("--chakra-colors-bg-surface", colors.bgSurface);
    root.style.setProperty("--chakra-colors-bg-elevated", colors.bgElevated);

    // Set Chakra CSS custom properties
    root.style.setProperty("--chakra-colors-blue-500", colors.primary);
    root.style.setProperty("--chakra-colors-blue-600", colors.primaryHover);
    root.style.setProperty("--chakra-colors-blue-700", colors.primaryActive);
    root.style.setProperty("--chakra-colors-blue-400", colors.focus);
    root.style.setProperty("--chakra-colors-blue-300", colors.primaryHover);

    root.setAttribute("data-theme", themeId);
  }, [initialized, theme, themeId, customColors]);

  const setTheme = newThemeId => {
    updatePreference("themeId", newThemeId);
  };

  const setCustomColors = newCustomColors => {
    updatePreference("customColors", newCustomColors);
  };

  const updateCustomColor = (key, value) => {
    setCustomColors({ ...customColors, [key]: value });
  };

  const resetCustomColors = () => {
    updatePreference("customColors", {});
  };

  const loadPresetColors = presetThemeId => {
    const preset = getThemeById(presetThemeId);
    const isDark = document.documentElement.classList.contains("dark");
    const mode = isDark ? "dark" : "light";
    const presetColors = { ...preset.colors[mode] };
    // Remove tagColors if present (not a UI color)
    delete presetColors.tagColors;
    setCustomColors(presetColors);
  };

  return {
    themeId,
    theme,
    customColors,
    setTheme,
    setCustomColors,
    updateCustomColor,
    resetCustomColors,
    loadPresetColors,
    themes: getAllThemes(),
  };
}

/**
 * Component to initialize theme CSS variables early in the render tree
 */
export function ThemeInitializer() {
  useTheme();
  return null;
}

/**
 * Semantic Color System for Juda
 *
 * This file defines all semantic colors used throughout the app.
 * Components should use these via the useSemanticColors() hook
 * rather than hardcoding color values.
 */

// Base color palette (matching original design system values)
export const palette = {
  gray: {
    50: "#F7FAFC",
    100: "#EDF2F7",
    200: "#E2E8F0",
    300: "#CBD5E0",
    400: "#A0AEC0",
    500: "#718096",
    600: "#4A5568",
    700: "#2D3748",
    800: "#1A202C",
    900: "#171923",
  },
  blue: {
    50: "#EBF8FF",
    100: "#BEE3F8",
    200: "#90CDF4",
    300: "#63B3ED",
    400: "#4299E1",
    500: "#3182CE",
    600: "#2B6CB0",
    700: "#2C5282",
    800: "#2A4365",
    900: "#1A365D",
  },
  red: {
    50: "#FFF5F5",
    100: "#FED7D7",
    200: "#FEB2B2",
    300: "#FC8181",
    400: "#F56565",
    500: "#E53E3E",
    600: "#C53030",
    700: "#9B2C2C",
    800: "#822727",
    900: "#63171B",
  },
  orange: {
    50: "#FFFAF0",
    100: "#FEEBC8",
    200: "#FBD38D",
    300: "#F6AD55",
    400: "#ED8936",
    500: "#DD6B20",
    600: "#C05621",
    700: "#9C4221",
    800: "#7B341E",
    900: "#652B19",
  },
  green: {
    50: "#F0FFF4",
    100: "#C6F6D5",
    200: "#9AE6B4",
    300: "#68D391",
    400: "#48BB78",
    500: "#38A169",
    600: "#2F855A",
    700: "#276749",
    800: "#22543D",
    900: "#1C4532",
  },
  purple: {
    50: "#FAF5FF",
    100: "#E9D8FD",
    200: "#D6BCFA",
    300: "#B794F4",
    400: "#9F7AEA",
    500: "#805AD5",
    600: "#6B46C1",
    700: "#553C9A",
    800: "#44337A",
    900: "#322659",
  },
};

/**
 * Semantic color definitions for light and dark modes
 * These map semantic names to actual color values
 */
export const semanticColors = {
  // Background colors
  bg: {
    canvas: { light: palette.gray[50], dark: palette.gray[900] },
    surface: { light: "#FFFFFF", dark: palette.gray[800] },
    surfaceHover: { light: palette.gray[50], dark: palette.gray[700] },
    elevated: { light: "#FFFFFF", dark: palette.gray[700] },
    muted: { light: palette.gray[100], dark: palette.gray[800] },
    subtle: { light: palette.gray[50], dark: palette.gray[900] },
    input: { light: "#FFFFFF", dark: palette.gray[700] },
    inputHover: { light: palette.gray[50], dark: palette.gray[600] },
  },

  // Text colors
  text: {
    primary: { light: palette.gray[900], dark: palette.gray[100] },
    secondary: { light: palette.gray[600], dark: palette.gray[400] },
    muted: { light: palette.gray[500], dark: palette.gray[500] },
    placeholder: { light: palette.gray[400], dark: palette.gray[500] },
    inverse: { light: "#FFFFFF", dark: palette.gray[900] },
    link: { light: palette.blue[600], dark: palette.blue[400] },
    linkHover: { light: palette.blue[700], dark: palette.blue[300] },
  },

  // Border colors
  border: {
    default: { light: palette.gray[200], dark: palette.gray[600] },
    subtle: { light: palette.gray[100], dark: palette.gray[700] },
    emphasized: { light: palette.gray[300], dark: palette.gray[500] },
    input: { light: palette.gray[300], dark: palette.gray[600] },
    focus: { light: palette.blue[500], dark: palette.blue[400] },
  },

  // Status colors (for badges, alerts, etc.)
  status: {
    success: { light: palette.green[500], dark: palette.green[400] },
    successBg: { light: palette.green[100], dark: palette.green[800] },
    successText: { light: palette.green[800], dark: palette.green[100] },

    warning: { light: palette.orange[500], dark: palette.orange[400] },
    warningBg: { light: palette.orange[100], dark: palette.orange[800] },
    warningText: { light: palette.orange[800], dark: palette.orange[100] },

    error: { light: palette.red[500], dark: palette.red[400] },
    errorBg: { light: palette.red[100], dark: palette.red[800] },
    errorText: { light: palette.red[800], dark: palette.red[100] },

    info: { light: palette.blue[500], dark: palette.blue[400] },
    infoBg: { light: palette.blue[100], dark: palette.blue[800] },
    infoText: { light: palette.blue[800], dark: palette.blue[100] },
  },

  // Task-specific colors
  task: {
    completed: { light: palette.green[500], dark: palette.green[400] },
    completedBg: { light: palette.green[50], dark: "rgba(72, 187, 120, 0.1)" },

    overdue: { light: palette.red[500], dark: palette.red[400] },
    overdueBg: { light: palette.red[50], dark: "rgba(245, 101, 101, 0.1)" },

    recurring: { light: palette.purple[500], dark: palette.purple[400] },
    recurringBg: { light: palette.purple[50], dark: "rgba(159, 122, 234, 0.1)" },

    noTime: { light: palette.orange[500], dark: palette.orange[400] },
    noTimeBg: { light: palette.orange[50], dark: "rgba(237, 137, 54, 0.1)" },

    workout: { light: palette.blue[500], dark: palette.blue[400] },
    workoutBg: { light: palette.blue[50], dark: "rgba(66, 153, 225, 0.1)" },

    neutral: { light: palette.gray[200], dark: palette.gray[700] },
    neutralText: { light: palette.gray[800], dark: palette.gray[100] },
  },

  // Interactive element colors
  interactive: {
    primary: { light: palette.blue[500], dark: palette.blue[400] },
    primaryHover: { light: palette.blue[600], dark: palette.blue[300] },
    primaryActive: { light: palette.blue[700], dark: palette.blue[200] },

    secondary: { light: palette.gray[600], dark: palette.gray[400] },
    secondaryHover: { light: palette.gray[700], dark: palette.gray[300] },

    danger: { light: palette.red[500], dark: palette.red[400] },
    dangerHover: { light: palette.red[600], dark: palette.red[300] },
  },

  // Selection colors
  selection: {
    bg: { light: palette.blue[50], dark: palette.blue[900] },
    border: { light: palette.blue[500], dark: palette.blue[400] },
    ring: { light: "rgba(66, 153, 225, 0.4)", dark: "rgba(66, 153, 225, 0.4)" },
  },

  // Drag and drop colors
  dnd: {
    overlay: { light: "rgba(0, 0, 0, 0.1)", dark: "rgba(255, 255, 255, 0.1)" },
    dropTarget: { light: palette.blue[100], dark: palette.blue[900] },
    dropTargetBorder: { light: palette.blue[400], dark: palette.blue[500] },
  },

  // Calendar-specific colors
  calendar: {
    today: { light: palette.blue[500], dark: palette.blue[400] },
    todayBg: { light: "rgba(235, 248, 255, 0.15)", dark: "rgba(26, 54, 93, 0.15)" },
    selected: { light: palette.blue[100], dark: palette.blue[800] },
    weekend: { light: palette.gray[100], dark: palette.gray[800] },
    pastDate: { light: palette.gray[400], dark: palette.gray[600] },
    futureDate: { light: palette.gray[600], dark: palette.gray[400] },
    gridLine: { light: palette.gray[200], dark: palette.gray[700] },
    hourText: { light: palette.gray[500], dark: palette.gray[500] },
  },
};

/**
 * Badge color mappings for different states
 * Used for task badges (overdue, recurring, no time, etc.)
 */
export const badgeColors = {
  overdue: {
    colorPalette: "red",
    bg: { light: palette.red[100], dark: palette.red[800] },
    color: { light: palette.red[800], dark: palette.red[100] },
  },
  recurring: {
    colorPalette: "purple",
    bg: { light: palette.purple[100], dark: palette.purple[800] },
    color: { light: palette.purple[800], dark: palette.purple[100] },
  },
  noTime: {
    colorPalette: "orange",
    bg: { light: palette.orange[100], dark: palette.orange[800] },
    color: { light: palette.orange[800], dark: palette.orange[100] },
  },
  workout: {
    colorPalette: "blue",
    bg: { light: palette.blue[100], dark: palette.blue[800] },
    color: { light: palette.blue[800], dark: palette.blue[100] },
  },
  completed: {
    colorPalette: "green",
    bg: { light: palette.green[100], dark: palette.green[800] },
    color: { light: palette.green[800], dark: palette.green[100] },
  },
  count: {
    colorPalette: "blue",
    bg: { light: palette.blue[100], dark: palette.blue[800] },
    color: { light: palette.blue[800], dark: palette.blue[100] },
  },
  past: {
    colorPalette: "orange",
    bg: { light: palette.orange[100], dark: palette.orange[800] },
    color: { light: palette.orange[800], dark: palette.orange[100] },
  },
  future: {
    colorPalette: "blue",
    bg: { light: palette.blue[100], dark: palette.blue[800] },
    color: { light: palette.blue[800], dark: palette.blue[100] },
  },
};

/**
 * Complete Theme System for Juda
 *
 * Each theme defines:
 * 1. Tag color palette (12 colors for user tags)
 * 2. UI colors (interactive elements, backgrounds, etc.)
 * 3. Both light and dark mode variants
 *
 * Tags store hex colors in the database, but are rendered using the active theme's palette.
 * This allows complete visual transformation without data changes.
 */

import { palette } from "./colors.js";

/**
 * Default tag color palette (used for color picker and mapping)
 * These are the "canonical" colors that tags are created with
 */
export const defaultTagColors = [
  "#6366f1", // 0: Indigo
  "#8b5cf6", // 1: Purple
  "#ec4899", // 2: Pink
  "#ef4444", // 3: Red
  "#f97316", // 4: Orange
  "#f59e0b", // 5: Amber
  "#eab308", // 6: Yellow
  "#84cc16", // 7: Lime
  "#22c55e", // 8: Green
  "#14b8a6", // 9: Teal
  "#06b6d4", // 10: Cyan
  "#3b82f6", // 11: Blue
];

/**
 * Theme definitions
 * Each theme provides complete color palettes for light and dark modes
 */
export const themes = [
  {
    id: "default",
    name: "Default",
    colors: {
      light: {
        // Background Colors
        bgCanvas: palette.gray[50],
        bgSurface: "#FFFFFF",
        bgElevated: "#FFFFFF",

        // Icon Colors
        iconPrimary: palette.blue[500],
        iconSecondary: palette.purple[500],
        iconAccent: palette.blue[600],

        // Button Colors (more subtle than primary)
        buttonPrimary: palette.blue[600],
        buttonPrimaryHover: palette.blue[700],
        buttonPrimaryActive: palette.blue[800],

        // UI Colors
        primary: palette.blue[500],
        primaryHover: palette.blue[600],
        primaryActive: palette.blue[700],
        accent: palette.purple[500],
        accentHover: palette.purple[600],
        link: palette.blue[600],
        linkHover: palette.blue[700],
        focus: palette.blue[500],
        selection: palette.blue[50],
        selectionBorder: palette.blue[500],
        dndDropTarget: palette.blue[100],
        dndDropTargetBorder: palette.blue[400],
        calendarToday: palette.blue[500],
        calendarSelected: palette.blue[100],

        // Tag Colors (12 colors)
        tagColors: [
          "#6366f1", // Indigo
          "#8b5cf6", // Purple
          "#ec4899", // Pink
          "#ef4444", // Red
          "#f97316", // Orange
          "#f59e0b", // Amber
          "#eab308", // Yellow
          "#84cc16", // Lime
          "#22c55e", // Green
          "#14b8a6", // Teal
          "#06b6d4", // Cyan
          "#3b82f6", // Blue
        ],
      },
      dark: {
        // Background Colors
        bgCanvas: palette.gray[900],
        bgSurface: palette.gray[800],
        bgElevated: palette.gray[700],

        // Icon Colors
        iconPrimary: palette.blue[400],
        iconSecondary: palette.purple[400],
        iconAccent: palette.blue[300],

        // Button Colors (more subtle than primary for dark mode)
        buttonPrimary: palette.blue[600],
        buttonPrimaryHover: palette.blue[500],
        buttonPrimaryActive: palette.blue[400],

        // UI Colors
        primary: palette.blue[400],
        primaryHover: palette.blue[300],
        primaryActive: palette.blue[200],
        accent: palette.purple[400],
        accentHover: palette.purple[300],
        link: palette.blue[400],
        linkHover: palette.blue[300],
        focus: palette.blue[400],
        selection: palette.blue[900],
        selectionBorder: palette.blue[400],
        dndDropTarget: palette.blue[900],
        dndDropTargetBorder: palette.blue[500],
        calendarToday: palette.blue[400],
        calendarSelected: palette.blue[800],

        // Tag Colors (12 colors - brighter for dark mode)
        tagColors: [
          "#818cf8", // Indigo
          "#a78bfa", // Purple
          "#f472b6", // Pink
          "#f87171", // Red
          "#fb923c", // Orange
          "#fbbf24", // Amber
          "#fde047", // Yellow
          "#a3e635", // Lime
          "#4ade80", // Green
          "#2dd4bf", // Teal
          "#22d3ee", // Cyan
          "#60a5fa", // Blue
        ],
      },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      light: {
        // Background Colors - Cool ocean tones
        bgCanvas: "#ecfeff", // cyan.50
        bgSurface: "#ffffff",
        bgElevated: "#f0fdfa", // teal.50

        // Icon Colors - Ocean themed
        iconPrimary: "#0891b2", // cyan.600
        iconSecondary: "#0d9488", // teal.600
        iconAccent: "#06b6d4", // cyan.500

        // Button Colors (more subtle)
        buttonPrimary: "#0e7490", // cyan.700
        buttonPrimaryHover: "#155e75", // cyan.800
        buttonPrimaryActive: "#164e63", // cyan.900

        // UI Colors - Cyan/Teal theme
        primary: "#0891b2", // cyan.600
        primaryHover: "#0e7490", // cyan.700
        primaryActive: "#155e75", // cyan.800
        accent: "#0d9488", // teal.600
        accentHover: "#0f766e", // teal.700
        link: "#0891b2",
        linkHover: "#0e7490",
        focus: "#0891b2",
        selection: "#cffafe", // cyan.100
        selectionBorder: "#0891b2",
        dndDropTarget: "#a5f3fc", // cyan.200
        dndDropTargetBorder: "#22d3ee", // cyan.400
        calendarToday: "#0891b2",
        calendarSelected: "#cffafe",

        // Tag Colors - Ocean palette
        tagColors: [
          "#0891b2", // Cyan
          "#0d9488", // Teal
          "#06b6d4", // Light Cyan
          "#14b8a6", // Teal
          "#2dd4bf", // Bright Teal
          "#5eead4", // Lighter Teal
          "#67e8f9", // Sky
          "#22d3ee", // Cyan
          "#06b6d4", // Cyan
          "#0891b2", // Dark Cyan
          "#0e7490", // Darker Cyan
          "#155e75", // Darkest Cyan
        ],
      },
      dark: {
        // Background Colors - Near black with subtle ocean tint
        bgCanvas: "#0a1419", // almost black with hint of cyan
        bgSurface: "#0f1a1c", // slightly lighter with cyan tint
        bgElevated: "#141f22", // elevated with subtle cyan

        // Icon Colors - Bright ocean themed
        iconPrimary: "#22d3ee", // cyan.400
        iconSecondary: "#2dd4bf", // teal.400
        iconAccent: "#67e8f9", // cyan.300

        // Button Colors (more subtle for dark mode)
        buttonPrimary: "#0891b2", // cyan.600
        buttonPrimaryHover: "#06b6d4", // cyan.500
        buttonPrimaryActive: "#22d3ee", // cyan.400

        // UI Colors
        primary: "#22d3ee", // cyan.400
        primaryHover: "#67e8f9", // cyan.300
        primaryActive: "#a5f3fc", // cyan.200
        accent: "#2dd4bf", // teal.400
        accentHover: "#5eead4", // teal.300
        link: "#22d3ee",
        linkHover: "#67e8f9",
        focus: "#22d3ee",
        selection: "#164e63", // cyan.900
        selectionBorder: "#22d3ee",
        dndDropTarget: "#164e63",
        dndDropTargetBorder: "#06b6d4", // cyan.500
        calendarToday: "#22d3ee",
        calendarSelected: "#155e75", // cyan.800

        // Tag Colors - Brighter ocean palette
        tagColors: [
          "#22d3ee", // Cyan
          "#2dd4bf", // Teal
          "#67e8f9", // Light Cyan
          "#5eead4", // Light Teal
          "#a5f3fc", // Lightest Cyan
          "#99f6e4", // Lightest Teal
          "#7dd3fc", // Sky
          "#38bdf8", // Blue
          "#0ea5e9", // Darker Blue
          "#0284c7", // Dark Blue
          "#0369a1", // Darker Blue
          "#075985", // Darkest Blue
        ],
      },
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      light: {
        // Background Colors - Fresh forest tones
        bgCanvas: "#f0fdf4", // green.50
        bgSurface: "#ffffff",
        bgElevated: "#ecfccb", // lime.50

        // Icon Colors - Forest themed
        iconPrimary: palette.green[600],
        iconSecondary: "#059669", // emerald.600
        iconAccent: "#84cc16", // lime.600

        // Button Colors (more subtle)
        buttonPrimary: palette.green[700],
        buttonPrimaryHover: palette.green[800],
        buttonPrimaryActive: "#22543d", // green.800

        // UI Colors - Green theme
        primary: palette.green[600],
        primaryHover: palette.green[700],
        primaryActive: palette.green[800],
        accent: "#059669", // emerald.600
        accentHover: "#047857", // emerald.700
        link: palette.green[600],
        linkHover: palette.green[700],
        focus: palette.green[600],
        selection: palette.green[50],
        selectionBorder: palette.green[600],
        dndDropTarget: palette.green[100],
        dndDropTargetBorder: palette.green[400],
        calendarToday: palette.green[600],
        calendarSelected: palette.green[100],

        // Tag Colors - Forest/Nature palette
        tagColors: [
          "#059669", // Emerald
          "#10b981", // Green
          "#22c55e", // Bright Green
          "#84cc16", // Lime
          "#a3e635", // Light Lime
          "#bef264", // Lighter Lime
          "#eab308", // Yellow
          "#f59e0b", // Amber
          "#16a34a", // Dark Green
          "#15803d", // Darker Green
          "#166534", // Forest Green
          "#14532d", // Dark Forest
        ],
      },
      dark: {
        // Background Colors - Near black with subtle forest tint
        bgCanvas: "#0a1410", // almost black with hint of green
        bgSurface: "#0f1a12", // slightly lighter with green tint
        bgElevated: "#141f18", // elevated with subtle green

        // Icon Colors - Bright forest themed
        iconPrimary: palette.green[400],
        iconSecondary: "#10b981", // emerald.500
        iconAccent: "#a3e635", // lime.400

        // Button Colors (more subtle for dark mode)
        buttonPrimary: palette.green[600],
        buttonPrimaryHover: palette.green[500],
        buttonPrimaryActive: palette.green[400],

        // UI Colors
        primary: palette.green[400],
        primaryHover: palette.green[300],
        primaryActive: palette.green[200],
        accent: "#10b981", // emerald.500
        accentHover: "#34d399", // emerald.400
        link: palette.green[400],
        linkHover: palette.green[300],
        focus: palette.green[400],
        selection: palette.green[900],
        selectionBorder: palette.green[400],
        dndDropTarget: palette.green[900],
        dndDropTargetBorder: palette.green[500],
        calendarToday: palette.green[400],
        calendarSelected: palette.green[800],

        // Tag Colors - Brighter forest palette
        tagColors: [
          "#34d399", // Emerald
          "#4ade80", // Green
          "#86efac", // Light Green
          "#a3e635", // Lime
          "#bef264", // Light Lime
          "#d9f99d", // Lighter Lime
          "#fde047", // Yellow
          "#fbbf24", // Amber
          "#22c55e", // Bright Green
          "#16a34a", // Medium Green
          "#15803d", // Dark Green
          "#166534", // Darker Green
        ],
      },
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      light: {
        // Background Colors - Warm sunset tones
        bgCanvas: "#fff7ed", // orange.50
        bgSurface: "#ffffff",
        bgElevated: "#fef3c7", // amber.50

        // Icon Colors - Sunset themed
        iconPrimary: palette.orange[500],
        iconSecondary: palette.red[500],
        iconAccent: "#f59e0b", // amber.500

        // Button Colors (more subtle)
        buttonPrimary: palette.orange[600],
        buttonPrimaryHover: palette.orange[700],
        buttonPrimaryActive: "#9c4221", // orange.700

        // UI Colors - Warm Orange/Red theme
        primary: palette.orange[500],
        primaryHover: palette.orange[600],
        primaryActive: palette.orange[700],
        accent: palette.red[500],
        accentHover: palette.red[600],
        link: palette.orange[600],
        linkHover: palette.orange[700],
        focus: palette.orange[500],
        selection: palette.orange[50],
        selectionBorder: palette.orange[500],
        dndDropTarget: palette.orange[100],
        dndDropTargetBorder: palette.orange[400],
        calendarToday: palette.orange[500],
        calendarSelected: palette.orange[100],

        // Tag Colors - Sunset/Warm palette
        tagColors: [
          "#ef4444", // Red
          "#f97316", // Orange
          "#f59e0b", // Amber
          "#eab308", // Yellow
          "#fb923c", // Light Orange
          "#fbbf24", // Light Amber
          "#fde047", // Light Yellow
          "#ec4899", // Pink
          "#f472b6", // Light Pink
          "#dc2626", // Dark Red
          "#ea580c", // Dark Orange
          "#d97706", // Dark Amber
        ],
      },
      dark: {
        // Background Colors - Near black with subtle sunset tint
        bgCanvas: "#14100a", // almost black with hint of orange
        bgSurface: "#1a140f", // slightly lighter with orange tint
        bgElevated: "#1f1814", // elevated with subtle orange

        // Icon Colors - Bright sunset themed
        iconPrimary: palette.orange[400],
        iconSecondary: palette.red[400],
        iconAccent: "#fbbf24", // amber.400

        // Button Colors (more subtle for dark mode)
        buttonPrimary: palette.orange[600],
        buttonPrimaryHover: palette.orange[500],
        buttonPrimaryActive: palette.orange[400],

        // UI Colors
        primary: palette.orange[400],
        primaryHover: palette.orange[300],
        primaryActive: palette.orange[200],
        accent: palette.red[400],
        accentHover: palette.red[300],
        link: palette.orange[400],
        linkHover: palette.orange[300],
        focus: palette.orange[400],
        selection: palette.orange[900],
        selectionBorder: palette.orange[400],
        dndDropTarget: palette.orange[900],
        dndDropTargetBorder: palette.orange[500],
        calendarToday: palette.orange[400],
        calendarSelected: palette.orange[800],

        // Tag Colors - Brighter sunset palette
        tagColors: [
          "#f87171", // Red
          "#fb923c", // Orange
          "#fbbf24", // Amber
          "#fde047", // Yellow
          "#fdba74", // Light Orange
          "#fcd34d", // Light Amber
          "#fef08a", // Light Yellow
          "#f472b6", // Pink
          "#f9a8d4", // Light Pink
          "#ef4444", // Bright Red
          "#f97316", // Bright Orange
          "#f59e0b", // Bright Amber
        ],
      },
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    colors: {
      light: {
        // Background Colors - Soft lavender tones
        bgCanvas: "#faf5ff", // purple.50
        bgSurface: "#ffffff",
        bgElevated: "#fdf4ff", // fuchsia.50

        // Icon Colors - Lavender themed
        iconPrimary: palette.purple[500],
        iconSecondary: "#a855f7", // fuchsia.500
        iconAccent: "#d946ef", // magenta.500

        // Button Colors (more subtle)
        buttonPrimary: palette.purple[600],
        buttonPrimaryHover: palette.purple[700],
        buttonPrimaryActive: "#553C9A", // purple.700

        // UI Colors - Purple/Fuchsia theme
        primary: palette.purple[500],
        primaryHover: palette.purple[600],
        primaryActive: palette.purple[700],
        accent: "#a855f7", // fuchsia.500
        accentHover: "#9333ea", // fuchsia.600
        link: palette.purple[600],
        linkHover: palette.purple[700],
        focus: palette.purple[500],
        selection: palette.purple[50],
        selectionBorder: palette.purple[500],
        dndDropTarget: palette.purple[100],
        dndDropTargetBorder: palette.purple[400],
        calendarToday: palette.purple[500],
        calendarSelected: palette.purple[100],

        // Tag Colors - Purple/Pink palette
        tagColors: [
          "#8b5cf6", // Purple
          "#a855f7", // Fuchsia
          "#d946ef", // Magenta
          "#ec4899", // Pink
          "#f472b6", // Light Pink
          "#c084fc", // Light Purple
          "#e879f9", // Light Fuchsia
          "#f0abfc", // Lighter Fuchsia
          "#7c3aed", // Violet
          "#6d28d9", // Dark Violet
          "#5b21b6", // Darker Violet
          "#4c1d95", // Darkest Violet
        ],
      },
      dark: {
        // Background Colors - Near black with subtle lavender tint
        bgCanvas: "#0f0a14", // almost black with hint of purple
        bgSurface: "#140f1a", // slightly lighter with purple tint
        bgElevated: "#18141f", // elevated with subtle purple

        // Icon Colors - Bright lavender themed
        iconPrimary: palette.purple[400],
        iconSecondary: "#c084fc", // fuchsia.400
        iconAccent: "#e879f9", // magenta.400

        // Button Colors (more subtle for dark mode)
        buttonPrimary: palette.purple[600],
        buttonPrimaryHover: palette.purple[500],
        buttonPrimaryActive: palette.purple[400],

        // UI Colors
        primary: palette.purple[400],
        primaryHover: palette.purple[300],
        primaryActive: palette.purple[200],
        accent: "#c084fc", // fuchsia.400
        accentHover: "#d946ef", // fuchsia.500
        link: palette.purple[400],
        linkHover: palette.purple[300],
        focus: palette.purple[400],
        selection: palette.purple[900],
        selectionBorder: palette.purple[400],
        dndDropTarget: palette.purple[900],
        dndDropTargetBorder: palette.purple[500],
        calendarToday: palette.purple[400],
        calendarSelected: palette.purple[800],

        // Tag Colors - Brighter purple palette
        tagColors: [
          "#a78bfa", // Purple
          "#c084fc", // Fuchsia
          "#e879f9", // Magenta
          "#f472b6", // Pink
          "#f9a8d4", // Light Pink
          "#d8b4fe", // Light Purple
          "#f0abfc", // Light Fuchsia
          "#fae8ff", // Lighter Fuchsia
          "#8b5cf6", // Bright Violet
          "#7c3aed", // Medium Violet
          "#6d28d9", // Dark Violet
          "#5b21b6", // Darker Violet
        ],
      },
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      light: {
        // Background Colors - Clean slate tones
        bgCanvas: palette.gray[50],
        bgSurface: "#ffffff",
        bgElevated: palette.gray[100],

        // Icon Colors - Slate themed
        iconPrimary: palette.gray[600],
        iconSecondary: palette.gray[500],
        iconAccent: palette.gray[700],

        // Button Colors (more subtle)
        buttonPrimary: palette.gray[700],
        buttonPrimaryHover: palette.gray[800],
        buttonPrimaryActive: palette.gray[900],

        // UI Colors - Neutral Gray theme
        primary: palette.gray[600],
        primaryHover: palette.gray[700],
        primaryActive: palette.gray[800],
        accent: palette.gray[500],
        accentHover: palette.gray[600],
        link: palette.gray[700],
        linkHover: palette.gray[800],
        focus: palette.gray[600],
        selection: palette.gray[100],
        selectionBorder: palette.gray[600],
        dndDropTarget: palette.gray[200],
        dndDropTargetBorder: palette.gray[400],
        calendarToday: palette.gray[600],
        calendarSelected: palette.gray[200],

        // Tag Colors - Monochrome palette
        tagColors: [
          "#64748b", // Slate
          "#6b7280", // Gray
          "#71717a", // Zinc
          "#78716c", // Stone
          "#737373", // Neutral
          "#57534e", // Warm Gray
          "#52525b", // Cool Gray
          "#44403c", // Dark Warm
          "#3f3f46", // Dark Cool
          "#27272a", // Darker
          "#1c1917", // Darkest Warm
          "#18181b", // Darkest Cool
        ],
      },
      dark: {
        // Background Colors - Deep slate tones
        bgCanvas: palette.gray[900],
        bgSurface: palette.gray[800],
        bgElevated: palette.gray[700],

        // Icon Colors - Bright slate themed
        iconPrimary: palette.gray[400],
        iconSecondary: palette.gray[300],
        iconAccent: palette.gray[500],

        // Button Colors (more subtle for dark mode)
        buttonPrimary: palette.gray[600],
        buttonPrimaryHover: palette.gray[500],
        buttonPrimaryActive: palette.gray[400],

        // UI Colors
        primary: palette.gray[400],
        primaryHover: palette.gray[300],
        primaryActive: palette.gray[200],
        accent: palette.gray[500],
        accentHover: palette.gray[400],
        link: palette.gray[400],
        linkHover: palette.gray[300],
        focus: palette.gray[400],
        selection: palette.gray[700],
        selectionBorder: palette.gray[400],
        dndDropTarget: palette.gray[700],
        dndDropTargetBorder: palette.gray[500],
        calendarToday: palette.gray[400],
        calendarSelected: palette.gray[600],

        // Tag Colors - Lighter monochrome palette
        tagColors: [
          "#cbd5e1", // Slate
          "#d1d5db", // Gray
          "#d4d4d8", // Zinc
          "#d6d3d1", // Stone
          "#d4d4d4", // Neutral
          "#a8a29e", // Warm Gray
          "#a1a1aa", // Cool Gray
          "#a3a3a3", // Medium Gray
          "#9ca3af", // Medium Slate
          "#94a3b8", // Light Slate
          "#64748b", // Darker Slate
          "#475569", // Darkest Slate
        ],
      },
    },
  },
];

/**
 * Get theme by ID
 * @param {string} id - Theme ID
 * @returns {Object} Theme object or default theme if not found
 */
export function getThemeById(id) {
  return themes.find(t => t.id === id) || themes[0];
}

/**
 * Get all available themes
 * @returns {Array} Array of theme objects
 */
export function getAllThemes() {
  return themes;
}

/**
 * Map a stored tag hex color to the closest color in the current theme's palette
 * This allows tags to change appearance with themes without database changes
 *
 * @param {string} storedColor - Hex color stored in database
 * @param {Array} themePalette - Current theme's tag color palette
 * @returns {string} Mapped color from theme palette
 */
export function mapColorToTheme(storedColor, themePalette) {
  if (!storedColor || !themePalette) return storedColor;

  // Find the index of this color in the default palette
  const defaultIndex = defaultTagColors.findIndex(c => c.toLowerCase() === storedColor.toLowerCase());

  // If found in default palette, use the same index in theme palette
  if (defaultIndex !== -1 && themePalette[defaultIndex]) {
    return themePalette[defaultIndex];
  }

  // If not in default palette, find closest color by hue similarity
  // This handles custom colors users may have created
  const colorDistance = (c1, c2) => {
    const hex1 = c1.replace("#", "");
    const hex2 = c2.replace("#", "");
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
  };

  // Find closest color in default palette
  let closestIndex = 0;
  let minDistance = Infinity;
  defaultTagColors.forEach((color, index) => {
    const distance = colorDistance(storedColor, color);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return themePalette[closestIndex] || storedColor;
}

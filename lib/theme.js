"use client";

import { createTheme } from "@mantine/core";

// Blue-gray palette (matching original design system values)
const blueGray = [
  "#F7FAFC", // 0 - lightest
  "#EDF2F7", // 1
  "#E2E8F0", // 2
  "#CBD5E0", // 3
  "#A0AEC0", // 4
  "#718096", // 5
  "#4A5568", // 6
  "#2D3748", // 7
  "#1A202C", // 8 - dark mode surface
  "#171923", // 9 - dark mode background
];

// Primary blue palette (matching original design system values)
const primary = [
  "#EBF8FF", // 0
  "#BEE3F8", // 1
  "#90CDF4", // 2
  "#63B3ED", // 3
  "#4299E1", // 4
  "#3182CE", // 5 - primary
  "#2B6CB0", // 6
  "#2C5282", // 7
  "#2A4365", // 8
  "#1A365D", // 9
];

// Red palette
const red = [
  "#FFF5F5",
  "#FED7D7",
  "#FEB2B2",
  "#FC8181",
  "#F56565",
  "#E53E3E",
  "#C53030",
  "#9B2C2C",
  "#822727",
  "#63171B",
];

// Orange palette
const orange = [
  "#FFFAF0",
  "#FEEBC8",
  "#FBD38D",
  "#F6AD55",
  "#ED8936",
  "#DD6B20",
  "#C05621",
  "#9C4221",
  "#7B341E",
  "#652B19",
];

// Green palette
const green = [
  "#F0FFF4",
  "#C6F6D5",
  "#9AE6B4",
  "#68D391",
  "#48BB78",
  "#38A169",
  "#2F855A",
  "#276749",
  "#22543D",
  "#1C4532",
];

// Purple palette
const purple = [
  "#FAF5FF",
  "#E9D8FD",
  "#D6BCFA",
  "#B794F4",
  "#9F7AEA",
  "#805AD5",
  "#6B46C1",
  "#553C9A",
  "#44337A",
  "#322659",
];

export const theme = createTheme({
  // Colors
  colors: {
    blueGray,
    primary,
    red,
    orange,
    green,
    purple,
    // Add gray as alias for blueGray for easier usage
    gray: blueGray,
    // Add blue as alias for primary
    blue: primary,
  },
  primaryColor: "primary",
  primaryShade: { light: 5, dark: 4 },

  // Typography
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
  fontFamilyMonospace: "Monaco, Courier, monospace",
  fontSizes: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    md: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
  },
  lineHeights: {
    xs: 1.5,
    sm: 1.5,
    md: 1.5,
    lg: 1.5,
    xl: 1.5,
  },

  // Border radius
  radius: {
    xs: "0.125rem", // 2px
    sm: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
  },

  // Spacing
  spacing: {
    xs: "0.5rem", // 8px
    sm: "0.75rem", // 12px
    md: "1rem", // 16px
    lg: "1.25rem", // 20px
    xl: "1.5rem", // 24px
  },

  // Shadows
  shadows: {
    xs: "0 0 0 1px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    lg: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    xl: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },

  // Default props for components
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: "all 0.2s",
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        input: {
          transition: "all 0.2s",
        },
      },
    },
    Textarea: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        input: {
          transition: "all 0.2s",
        },
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        input: {
          transition: "all 0.2s",
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
        withBorder: true,
      },
      styles: {
        root: {
          transition: "all 0.2s",
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: "md",
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 0,
        },
      },
      styles: {
        content: {
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
      },
    },
    Drawer: {
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.6,
          blur: 0,
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Notification: {
      defaultProps: {
        radius: "md",
      },
    },
    Menu: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        dropdown: {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    Popover: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        dropdown: {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    Tabs: {
      defaultProps: {
        radius: "md",
      },
    },
    Checkbox: {
      defaultProps: {
        radius: "xs",
      },
    },
  },

  // Other theme options
  cursorType: "pointer",
  focusRing: "auto",
  respectReducedMotion: true,

  // Headings
  headings: {
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "2.25rem", lineHeight: 1.2 },
      h2: { fontSize: "1.875rem", lineHeight: 1.3 },
      h3: { fontSize: "1.5rem", lineHeight: 1.4 },
      h4: { fontSize: "1.25rem", lineHeight: 1.5 },
      h5: { fontSize: "1.125rem", lineHeight: 1.5 },
      h6: { fontSize: "1rem", lineHeight: 1.5 },
    },
  },

  // Default color scheme
  defaultColorScheme: "dark",

  // White and black colors for better contrast
  white: "#FFFFFF",
  black: "#000000",
});

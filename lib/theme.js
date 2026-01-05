"use client";

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Blue-gray palette matching the current dark mode aesthetic
const blueGrayPalette = {
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
};

// Tag colors for both modes
const tagColors = {
  light: [
    "#4F46E5",
    "#7C3AED",
    "#DB2777",
    "#DC2626",
    "#EA580C",
    "#D97706",
    "#CA8A04",
    "#65A30D",
    "#16A34A",
    "#0D9488",
    "#0891B2",
    "#2563EB",
  ],
  dark: [
    "#818cf8",
    "#a78bfa",
    "#f472b6",
    "#f87171",
    "#fb923c",
    "#fbbf24",
    "#fde047",
    "#a3e635",
    "#4ade80",
    "#2dd4bf",
    "#22d3ee",
    "#60a5fa",
  ],
};

// Create base dark theme
const createAppTheme = mode => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#3182CE",
        light: "#4299E1",
        dark: "#2B6CB0",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#805AD5",
        light: "#9F7AEA",
        dark: "#6B46C1",
      },
      error: {
        main: "#E53E3E",
        light: "#FC8181",
        dark: "#C53030",
      },
      warning: {
        main: "#DD6B20",
        light: "#F6AD55",
        dark: "#C05621",
      },
      success: {
        main: "#38A169",
        light: "#68D391",
        dark: "#2F855A",
      },
      info: {
        main: "#3182CE",
        light: "#63B3ED",
        dark: "#2B6CB0",
      },
      grey: blueGrayPalette,
      background: {
        default: isDark ? blueGrayPalette[900] : blueGrayPalette[50],
        paper: isDark ? blueGrayPalette[800] : "#ffffff",
        elevated: isDark ? blueGrayPalette[700] : blueGrayPalette[50],
      },
      text: {
        primary: isDark ? blueGrayPalette[100] : blueGrayPalette[900],
        secondary: isDark ? blueGrayPalette[400] : blueGrayPalette[600],
        disabled: isDark ? blueGrayPalette[600] : blueGrayPalette[400],
      },
      divider: isDark ? blueGrayPalette[700] : blueGrayPalette[200],
      action: {
        active: isDark ? blueGrayPalette[100] : blueGrayPalette[900],
        hover: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
        selected: isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)",
        disabled: isDark ? blueGrayPalette[600] : blueGrayPalette[400],
        disabledBackground: isDark ? blueGrayPalette[800] : blueGrayPalette[100],
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: "2.5rem", fontWeight: 600 },
      h2: { fontSize: "2rem", fontWeight: 600 },
      h3: { fontSize: "1.75rem", fontWeight: 600 },
      h4: { fontSize: "1.5rem", fontWeight: 600 },
      h5: { fontSize: "1.25rem", fontWeight: 600 },
      h6: { fontSize: "1rem", fontWeight: 600 },
      body1: { fontSize: "1rem" },
      body2: { fontSize: "0.875rem" },
      caption: { fontSize: "0.75rem" },
      button: { textTransform: "none", fontWeight: 500 },
    },
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: isDark ? blueGrayPalette[600] : blueGrayPalette[300],
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: "6px 16px",
          },
          sizeSmall: {
            padding: "4px 12px",
            fontSize: "0.8125rem",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
          sizeSmall: {
            padding: 4,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: "small",
          variant: "outlined",
        },
      },
      MuiSelect: {
        defaultProps: {
          size: "small",
        },
      },
      MuiDialog: {
        defaultProps: {
          PaperProps: {
            elevation: 8,
          },
        },
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
          sizeSmall: {
            height: 24,
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            minWidth: "auto",
            padding: "12px 16px",
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
            boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.5)" : "0 4px 20px rgba(0, 0, 0, 0.15)",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: "0.875rem",
            minHeight: 36,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: "none",
          },
        },
      },
      MuiCheckbox: {
        defaultProps: {
          size: "small",
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          label: {
            fontSize: "0.875rem",
          },
        },
      },
    },
  });
};

// Export themed instances
export const darkTheme = responsiveFontSizes(createAppTheme("dark"));
export const lightTheme = responsiveFontSizes(createAppTheme("light"));

// Export tag colors for components that need them
export const getTagColors = mode => tagColors[mode] || tagColors.dark;

// Export palette for direct access
export { blueGrayPalette };

export default darkTheme;

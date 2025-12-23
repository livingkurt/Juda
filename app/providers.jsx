"use client";

import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";

// Create a custom system that matches Chakra v2 colors and styling
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        // Override gray palette to match v2's blue-gray tones for dark mode
        gray: {
          50: { value: "#F7FAFC" },
          100: { value: "#EDF2F7" },
          200: { value: "#E2E8F0" },
          300: { value: "#CBD5E0" },
          400: { value: "#A0AEC0" },
          500: { value: "#718096" },
          600: { value: "#4A5568" },
          700: { value: "#2D3748" },
          800: { value: "#1A202C" }, // Dark mode card background (v2 style)
          900: { value: "#171923" }, // Dark mode main background (v2 style)
        },
        // Blue palette (Chakra v2 values)
        blue: {
          50: { value: "#EBF8FF" },
          100: { value: "#BEE3F8" },
          200: { value: "#90CDF4" },
          300: { value: "#63B3ED" },
          400: { value: "#4299E1" },
          500: { value: "#3182CE" },
          600: { value: "#2B6CB0" },
          700: { value: "#2C5282" },
          800: { value: "#2A4365" },
          900: { value: "#1A365D" },
        },
        // Red palette (Chakra v2 values)
        red: {
          50: { value: "#FFF5F5" },
          100: { value: "#FED7D7" },
          200: { value: "#FEB2B2" },
          300: { value: "#FC8181" },
          400: { value: "#F56565" },
          500: { value: "#E53E3E" },
          600: { value: "#C53030" },
          700: { value: "#9B2C2C" },
          800: { value: "#822727" },
          900: { value: "#63171B" },
        },
        // Orange palette (Chakra v2 values)
        orange: {
          50: { value: "#FFFAF0" },
          100: { value: "#FEEBC8" },
          200: { value: "#FBD38D" },
          300: { value: "#F6AD55" },
          400: { value: "#ED8936" },
          500: { value: "#DD6B20" },
          600: { value: "#C05621" },
          700: { value: "#9C4221" },
          800: { value: "#7C2D12" },
          900: { value: "#5A1F0D" },
        },
        // Purple palette (Chakra v2 values)
        purple: {
          50: { value: "#FAF5FF" },
          100: { value: "#E9D8FD" },
          200: { value: "#D6BCFA" },
          300: { value: "#B794F4" },
          400: { value: "#9F7AEA" },
          500: { value: "#805AD5" },
          600: { value: "#6B46C1" },
          700: { value: "#553C9A" },
          800: { value: "#44337A" },
          900: { value: "#322659" },
        },
        // Green palette (Chakra v2 values)
        green: {
          50: { value: "#F0FFF4" },
          100: { value: "#C6F6D5" },
          200: { value: "#9AE6B4" },
          300: { value: "#68D391" },
          400: { value: "#48BB78" },
          500: { value: "#38A169" },
          600: { value: "#2F855A" },
          700: { value: "#276749" },
          800: { value: "#22543D" },
          900: { value: "#1C4532" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Background colors
        "bg.canvas": {
          value: { _light: "{colors.gray.50}", _dark: "{colors.gray.900}" },
        },
        "bg.surface": {
          value: { _light: "{colors.white}", _dark: "{colors.gray.800}" },
        },
        "bg.subtle": {
          value: { _light: "{colors.gray.100}", _dark: "{colors.gray.700}" },
        },
        // Text colors
        "fg.default": {
          value: { _light: "{colors.gray.900}", _dark: "{colors.gray.100}" },
        },
        "fg.muted": {
          value: { _light: "{colors.gray.500}", _dark: "{colors.gray.400}" },
        },
        // Border colors
        "border.default": {
          value: { _light: "{colors.gray.200}", _dark: "{colors.gray.600}" },
        },
        "border.emphasized": {
          value: { _light: "{colors.gray.300}", _dark: "{colors.gray.500}" },
        },
      },
    },
    recipes: {
      badge: {
        base: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "xs",
          px: "2",
          borderRadius: "md",
          textTransform: "uppercase",
          letterSpacing: "wider",
        },
        variants: {
          colorPalette: {
            blue: {
              bg: { _light: "blue.100", _dark: "blue.800" },
              color: { _light: "blue.800", _dark: "blue.100" },
            },
            red: {
              bg: { _light: "red.100", _dark: "red.800" },
              color: { _light: "red.800", _dark: "red.100" },
            },
            orange: {
              bg: { _light: "orange.100", _dark: "orange.800" },
              color: { _light: "orange.800", _dark: "orange.100" },
            },
            purple: {
              bg: { _light: "purple.100", _dark: "purple.800" },
              color: { _light: "purple.800", _dark: "purple.100" },
            },
            green: {
              bg: { _light: "green.100", _dark: "green.800" },
              color: { _light: "green.800", _dark: "green.100" },
            },
          },
        },
        defaultVariants: {
          colorPalette: "blue",
        },
      },
      button: {
        base: {
          fontWeight: "semibold",
          borderRadius: "md",
          transition: "all 0.2s",
        },
        variants: {
          variant: {
            solid: {
              bg: { _light: "blue.500", _dark: "blue.600" },
              color: "white",
              _hover: {
                bg: { _light: "blue.600", _dark: "blue.700" },
              },
              _active: {
                bg: { _light: "blue.700", _dark: "blue.800" },
              },
            },
            outline: {
              bg: "transparent",
              borderWidth: "1px",
              borderColor: { _light: "gray.300", _dark: "gray.600" },
              color: { _light: "gray.700", _dark: "gray.200" },
              _hover: {
                bg: { _light: "gray.100", _dark: "gray.700" },
              },
            },
            ghost: {
              bg: "transparent",
              color: { _light: "gray.700", _dark: "gray.200" },
              _hover: {
                bg: { _light: "gray.100", _dark: "gray.700" },
              },
            },
          },
        },
        defaultVariants: {
          variant: "solid",
        },
      },
      iconButton: {
        base: {
          borderRadius: "md",
          transition: "all 0.2s",
        },
        variants: {
          variant: {
            solid: {
              bg: { _light: "blue.500", _dark: "blue.600" },
              color: "white",
              _hover: {
                bg: { _light: "blue.600", _dark: "blue.700" },
              },
            },
            outline: {
              bg: "transparent",
              borderWidth: "1px",
              borderColor: { _light: "gray.300", _dark: "gray.600" },
              color: { _light: "gray.700", _dark: "gray.200" },
              _hover: {
                bg: { _light: "gray.100", _dark: "gray.700" },
              },
            },
            ghost: {
              bg: "transparent",
              color: { _light: "gray.700", _dark: "gray.200" },
              _hover: {
                bg: { _light: "gray.100", _dark: "gray.700" },
              },
            },
          },
        },
        defaultVariants: {
          variant: "ghost",
        },
      },
    },
    slotRecipes: {
      input: {
        slots: ["root", "field", "addon"],
        base: {
          field: {
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: { _light: "gray.200", _dark: "gray.600" },
            borderRadius: "md",
            _focus: {
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              outline: "none",
            },
          },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: { _light: "gray.50", _dark: "gray.900" },
      color: { _light: "gray.900", _dark: "gray.100" },
    },
    // Force fixed dimensions for drag previews
    "[data-drag-preview='true']": {
      width: "180px !important",
      height: "40px !important",
      minWidth: "180px !important",
      maxWidth: "180px !important",
      minHeight: "40px !important",
      maxHeight: "40px !important",
    },
    // Select.Trigger border styling
    "[data-part='trigger']": {
      borderWidth: "1px !important",
      borderColor: {
        _light: "var(--chakra-colors-gray-200) !important",
        _dark: "var(--chakra-colors-gray-600) !important",
      },
    },
    "[data-part='trigger']:focus, [data-part='trigger']:focus-visible": {
      borderColor: "var(--chakra-colors-blue-400) !important",
      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400) !important",
      outline: "none",
    },
  },
});

export function Providers({ children }) {
  return (
    <ChakraProvider value={system}>
      <AuthProvider>
        <PreferencesProvider>{children}</PreferencesProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

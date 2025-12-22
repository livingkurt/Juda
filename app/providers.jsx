"use client";

import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";

// Create a custom system that matches Chakra v2 colors
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

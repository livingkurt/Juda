"use client";

import { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ToastContainer } from "@/components/ToastContainer";
import { store } from "@/lib/store";
import { initDB } from "@/lib/db/indexedDB";
import { syncManager } from "@/lib/sync/syncManager";
import { ThemeInitializer } from "@/hooks/useTheme";

// Create a custom system that matches Chakra v2 colors and styling
const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fontSizes: {
        "3xs": { value: "0.625rem" }, // 10px - extra small for mobile badges
      },
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
        // Note: Button recipes use CSS variables for theme support
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
              bg: { _light: "var(--theme-buttonPrimary, blue.600)", _dark: "var(--theme-buttonPrimary, blue.600)" },
              color: "white",
              _hover: {
                bg: {
                  _light: "var(--theme-buttonPrimaryHover, blue.700)",
                  _dark: "var(--theme-buttonPrimaryHover, blue.500)",
                },
              },
              _active: {
                bg: {
                  _light: "var(--theme-buttonPrimaryActive, blue.800)",
                  _dark: "var(--theme-buttonPrimaryActive, blue.400)",
                },
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
              bg: { _light: "var(--theme-buttonPrimary, blue.600)", _dark: "var(--theme-buttonPrimary, blue.600)" },
              color: "white",
              _hover: {
                bg: {
                  _light: "var(--theme-buttonPrimaryHover, blue.700)",
                  _dark: "var(--theme-buttonPrimaryHover, blue.500)",
                },
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
            bg: "transparent",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: { _light: "gray.200", _dark: "gray.600" },
            borderRadius: "md",
            // Use smaller font size on mobile to match overall design
            fontSize: { base: "14px", md: "inherit" },
            _focus: {
              bg: "transparent",
              borderColor: "var(--theme-focus, blue.400)",
              boxShadow: "0 0 0 1px var(--theme-focus, var(--chakra-colors-blue-400))",
              outline: "none",
            },
            _focusVisible: {
              bg: "transparent",
            },
          },
        },
        variants: {
          variant: {
            unstyled: {
              field: {
                bg: "transparent",
                borderWidth: "0",
                borderColor: "transparent",
                borderRadius: "0",
                _focus: {
                  bg: "transparent",
                  borderWidth: "0",
                  borderColor: "transparent",
                  boxShadow: "none",
                },
                _focusVisible: {
                  bg: "transparent",
                },
              },
            },
          },
        },
      },
    },
  },
  globalCss: {
    "html, body": {
      bg: "var(--chakra-colors-bg-canvas)",
      color: { _light: "gray.900", _dark: "gray.100" },
      // Mobile viewport optimization
      "@media (max-width: 768px)": {
        fontSize: "14px", // Reduce base font size on mobile
      },
    },
    /* Mobile font sizes for form inputs - use 16px to prevent auto-zoom on mobile browsers */
    "@media (max-width: 768px)": {
      // Chakra UI Input field
      "[data-part='field']": {
        fontSize: "16px !important",
      },
      // Chakra UI Select trigger (excluding tabs)
      "[data-part='trigger']:not([data-scope='tabs'])": {
        fontSize: "16px !important",
      },
      // Native HTML form elements
      "input[type='text'], input[type='email'], input[type='password'], input[type='number'], input[type='tel'], input[type='url'], input[type='search'], input[type='date'], input[type='time'], input[type='datetime-local'], input:not([type])":
        {
          fontSize: "16px !important",
        },
      "textarea": {
        fontSize: "16px !important",
      },
      "select": {
        fontSize: "16px !important",
      },
      // ProseMirror contenteditable (for notes editor)
      ".ProseMirror[contenteditable='true']": {
        fontSize: "16px !important",
      },
    },
    /* TipTap/ProseMirror Editor Styles - Must be global to override resets */
    ".ProseMirror": {
      outline: "none !important",
      border: "none !important",
      boxShadow: "none !important",
      "&:focus, &:focus-visible": {
        outline: "none !important",
        border: "none !important",
        boxShadow: "none !important",
      },
    },
    /* Headings in ProseMirror - Notion style */
    ".ProseMirror h1": {
      fontSize: "1.875em !important",
      fontWeight: "700 !important",
      lineHeight: "1.3 !important",
      marginTop: "2em",
      marginBottom: "0.5em",
      "&:first-of-type": {
        marginTop: 0,
      },
    },
    ".ProseMirror h2": {
      fontSize: "1.5em !important",
      fontWeight: "600 !important",
      lineHeight: "1.35 !important",
      marginTop: "1.75em",
      marginBottom: "0.5em",
    },
    ".ProseMirror h3": {
      fontSize: "1.25em !important",
      fontWeight: "600 !important",
      lineHeight: "1.4 !important",
      marginTop: "1.5em",
      marginBottom: "0.5em",
    },
    /* Paragraphs in ProseMirror */
    ".ProseMirror p": {
      marginBottom: "0.75em",
      marginTop: 0,
    },
    /* Bullet Lists in ProseMirror */
    ".ProseMirror ul:not([data-type='taskList'])": {
      listStyle: "disc outside !important",
      paddingLeft: "1.5em !important",
      marginBottom: "0.75em",
      marginLeft: "0.5em",
    },
    ".ProseMirror ul:not([data-type='taskList']) li": {
      display: "list-item !important",
      listStyleType: "disc !important",
    },
    ".ProseMirror ul:not([data-type='taskList']) li p": {
      marginBottom: "0.25em",
      display: "inline",
    },
    /* Nested bullet lists */
    ".ProseMirror ul:not([data-type='taskList']) ul": {
      listStyleType: "circle !important",
    },
    ".ProseMirror ul:not([data-type='taskList']) ul ul": {
      listStyleType: "square !important",
    },
    /* Ordered Lists in ProseMirror */
    ".ProseMirror ol": {
      listStyle: "decimal outside !important",
      paddingLeft: "1.5em !important",
      marginBottom: "0.75em",
      marginLeft: "0.5em",
    },
    ".ProseMirror ol li": {
      display: "list-item !important",
      listStyleType: "decimal !important",
    },
    ".ProseMirror ol li p": {
      marginBottom: "0.25em",
      display: "inline",
    },
    /* Nested ordered lists */
    ".ProseMirror ol ol": {
      listStyleType: "lower-alpha !important",
    },
    ".ProseMirror ol ol ol": {
      listStyleType: "lower-roman !important",
    },
    /* Task lists in ProseMirror */
    ".ProseMirror ul[data-type='taskList']": {
      listStyle: "none !important",
      paddingLeft: "0 !important",
      marginLeft: "0 !important",
    },
    ".ProseMirror ul[data-type='taskList'] li": {
      display: "flex !important",
      listStyleType: "none !important",
      alignItems: "flex-start",
      marginBottom: "0.5em",
    },
    ".ProseMirror ul[data-type='taskList'] li > label": {
      marginRight: "0.5em",
      marginTop: "0.15em",
      cursor: "pointer",
    },
    ".ProseMirror ul[data-type='taskList'] li > label input[type='checkbox']": {
      width: "16px",
      height: "16px",
      cursor: "pointer",
    },
    ".ProseMirror ul[data-type='taskList'] li > div": {
      flex: 1,
    },
    ".ProseMirror ul[data-type='taskList'] li[data-checked='true'] > div": {
      textDecoration: "line-through",
      opacity: 0.6,
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
    // Select.Trigger border styling (exclude tabs)
    "[data-part='trigger']:not([data-scope='tabs'])": {
      borderWidth: "1px !important",
      borderColor: {
        _light: "var(--chakra-colors-gray-200) !important",
        _dark: "var(--chakra-colors-gray-600) !important",
      },
      "@media (max-width: 768px)": {
        fontSize: "16px !important",
      },
    },
    "[data-part='trigger']:not([data-scope='tabs']):focus, [data-part='trigger']:not([data-scope='tabs']):focus-visible":
      {
        borderColor: "var(--theme-focus, var(--chakra-colors-blue-400)) !important",
        boxShadow: "0 0 0 1px var(--theme-focus, var(--chakra-colors-blue-400)) !important",
        outline: "none",
      },
    // Remove borders from Tabs components
    "[data-part='list'][data-scope='tabs']": {
      borderWidth: "0 !important",
      borderColor: "transparent !important",
    },
    "[data-part='trigger'][data-scope='tabs']": {
      borderWidth: "0 !important",
      borderColor: "transparent !important",
      _focus: {
        borderWidth: "0 !important",
        borderColor: "transparent !important",
        boxShadow: "none !important",
        outline: "none !important",
      },
      _focusVisible: {
        borderWidth: "0 !important",
        borderColor: "transparent !important",
        boxShadow: "none !important",
        outline: "none !important",
      },
    },
    // Ensure consistent underline thickness for active tabs
    "[data-part='trigger'][data-scope='tabs'][data-state='active'], [data-part='trigger'][data-scope='tabs'][aria-selected='true']":
      {
        borderBottomWidth: "2px !important",
        borderBottomStyle: "solid !important",
      },
  },
});

// Initialize offline database
function OfflineInitializer({ children }) {
  useEffect(() => {
    // Initialize IndexedDB
    initDB().catch(console.error);

    // Register for background sync
    syncManager.registerBackgroundSync();

    // Register service worker update handler
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          const handleStateChange = () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New service worker available - auto-reload after a short delay
              setTimeout(() => {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }, 1000);
            }
          };
          newWorker?.addEventListener("statechange", handleStateChange);
        });
      });
    }
  }, []);

  return children;
}

export function Providers({ children }) {
  return (
    <ReduxProvider store={store}>
      <ChakraProvider value={system}>
        <AuthProvider>
          <PreferencesProvider>
            <ThemeInitializer />
            <OfflineInitializer>
              {children}
              <ToastContainer />
            </OfflineInitializer>
          </PreferencesProvider>
        </AuthProvider>
      </ChakraProvider>
    </ReduxProvider>
  );
}

"use client";

import { useMemo, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/lib/store";
import { darkTheme, lightTheme } from "@/lib/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { ColorModeContext } from "@/contexts/ColorModeContext";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";
import { initDB } from "@/lib/db/indexedDB";
import { syncManager } from "@/lib/sync/syncManager";
import { useSSESync } from "@/hooks/useSSESync";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import Notification from "@/components/Notification";
import { UrlStateProvider } from "@/components/UrlStateProvider";

// Inner component that has access to preferences
function ThemeWrapper({ children }) {
  const { preferences, updatePreference, initialized } = usePreferencesContext();

  // Derive mode directly from preferences, with fallback
  const mode = useMemo(() => {
    if (initialized && preferences?.colorMode) {
      return preferences.colorMode;
    }
    // Fallback to localStorage for SSR/hydration
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("juda-preferences");
        if (stored) {
          const prefs = JSON.parse(stored);
          return prefs.colorMode || "dark";
        }
      } catch {
        // Ignore errors
      }
    }
    return "dark";
  }, [initialized, preferences?.colorMode]);

  // Sync to DOM for any CSS that needs it
  useEffect(() => {
    document.documentElement.setAttribute("data-color-mode", mode);
    document.documentElement.style.colorScheme = mode;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        const newMode = mode === "dark" ? "light" : "dark";
        updatePreference("colorMode", newMode);
      },
      setColorMode: newMode => {
        updatePreference("colorMode", newMode);
      },
    }),
    [mode, updatePreference]
  );

  const theme = useMemo(() => (mode === "dark" ? darkTheme : lightTheme), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {children}
          <Notification />
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

// Initialize offline database
function OfflineInitializer({ children }) {
  useEffect(() => {
    // Suppress browser extension errors that we can't control
    // This filters out "Unchecked runtime.lastError" messages from browser extensions
    // These errors occur when browser extensions try to communicate but the receiving end doesn't exist
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const message = String(args[0] || "");
      // Only filter out specific browser extension runtime errors
      // These are harmless and we can't fix them (they're from browser extensions)
      if (
        message.includes("runtime.lastError") ||
        message.includes("Could not establish connection") ||
        message.includes("Receiving end does not exist")
      ) {
        return; // Suppress this specific browser extension error
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = String(args[0] || "");
      // Also filter warnings about runtime.lastError
      if (
        message.includes("runtime.lastError") ||
        message.includes("Could not establish connection") ||
        message.includes("Receiving end does not exist")
      ) {
        return; // Suppress this specific browser extension warning
      }
      originalWarn.apply(console, args);
    };

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

    // Cleanup: restore original console methods on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return children;
}

function SSESyncProvider({ children }) {
  useSSESync();
  return (
    <>
      {children}
      <SyncStatusIndicator />
    </>
  );
}

export function Providers({ children }) {
  return (
    <ReduxProvider store={store}>
      <UrlStateProvider>
        <AuthProvider>
          <PreferencesProvider>
            <ThemeWrapper>
              <OfflineInitializer>
                <SSESyncProvider>{children}</SSESyncProvider>
              </OfflineInitializer>
            </ThemeWrapper>
          </PreferencesProvider>
        </AuthProvider>
      </UrlStateProvider>
    </ReduxProvider>
  );
}

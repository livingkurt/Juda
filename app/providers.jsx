"use client";

import { useEffect } from "react";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/lib/store";
import { theme } from "@/lib/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { MantineColorModeSync } from "@/components/MantineColorModeSync";
import { ThemeInitializer } from "@/hooks/useTheme";
import { initDB } from "@/lib/db/indexedDB";
import { syncManager } from "@/lib/sync/syncManager";
import { useSSESync } from "@/hooks/useSSESync";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";

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
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-center" />
      <ReduxProvider store={store}>
        <AuthProvider>
          <PreferencesProvider>
            <MantineColorModeSync />
            <ThemeInitializer />
            <OfflineInitializer>
              <SSESyncProvider>{children}</SSESyncProvider>
            </OfflineInitializer>
          </PreferencesProvider>
        </AuthProvider>
      </ReduxProvider>
    </MantineProvider>
  );
}

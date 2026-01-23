"use client";

import { useEffect, useCallback, useRef } from "react";
import { useStore, useDispatch, useSelector } from "react-redux";
import { sseManager } from "@/lib/sse/sseManager";
import { initializeSSESync, setOnSyncStatusChange, clearTimestampTracking } from "@/lib/store/sseSyncMiddleware";
import { useAuth } from "@/hooks/useAuth";
import {
  setConnectionStatus,
  addRecentSync,
  selectConnectionStatus,
  selectRecentSyncs,
  selectIsConnected,
} from "@/lib/store/slices/syncSlice";
import { tasksApi } from "@/lib/store/api/tasksApi";
import { sectionsApi } from "@/lib/store/api/sectionsApi";
import { tagsApi } from "@/lib/store/api/tagsApi";
import { completionsApi } from "@/lib/store/api/completionsApi";
import { foldersApi } from "@/lib/store/api/foldersApi";
import { smartFoldersApi } from "@/lib/store/api/smartFoldersApi";
import { preferencesApi } from "@/lib/store/api/preferencesApi";

// Minimum time in background before we trigger a full refresh (in ms)
// This prevents unnecessary refetches for quick tab switches
const STALE_THRESHOLD_MS = 5000; // 5 seconds

export function useSSESync() {
  const store = useStore();
  const dispatch = useDispatch();
  const { getAccessToken, isAuthenticated } = useAuth();

  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);
  const isConnected = useSelector(selectIsConnected);

  // Track when we last had an active connection
  const lastActiveTimestampRef = useRef(null);
  const wasHiddenRef = useRef(false);

  // Initialize timestamp in effect to avoid calling impure function during render
  useEffect(() => {
    if (lastActiveTimestampRef.current === null) {
      lastActiveTimestampRef.current = Date.now();
    }
  }, []);

  // Handle sync status changes
  const handleSyncStatusChange = useCallback(
    event => {
      if (event.type === "connection") {
        dispatch(
          setConnectionStatus({
            status: event.status,
            attempt: event.attempt,
          })
        );
        // Update last active timestamp when we successfully connect
        if (event.status === "connected") {
          lastActiveTimestampRef.current = Date.now();
        }
      } else if (event.type === "sync") {
        dispatch(
          addRecentSync({
            entityType: event.entityType,
            operation: event.operation,
            id: event.id,
          })
        );
        // Update timestamp on every successful sync
        lastActiveTimestampRef.current = Date.now();
      } else if (event.type === "offlineSync") {
        dispatch(
          addRecentSync({
            entityType: "all",
            operation: "offlineSync",
            message: "Offline changes synced",
          })
        );
      }
    },
    [dispatch]
  );

  // Invalidate all caches to force refetch
  const invalidateAllCaches = useCallback(() => {
    console.log("SSE: Invalidating all caches for catch-up sync");
    dispatch(tasksApi.util.invalidateTags(["Task"]));
    dispatch(sectionsApi.util.invalidateTags(["Section"]));
    dispatch(tagsApi.util.invalidateTags(["Tag"]));
    dispatch(completionsApi.util.invalidateTags(["Completion"]));
    dispatch(foldersApi.util.invalidateTags(["Folder"]));
    dispatch(smartFoldersApi.util.invalidateTags(["SmartFolder"]));
    dispatch(preferencesApi.util.invalidateTags(["Preferences"]));
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      sseManager.disconnect();
      clearTimestampTracking();
      dispatch(setConnectionStatus({ status: "disconnected" }));
      return;
    }

    // Set auth function
    sseManager.setAuthFunction(getAccessToken);

    // Set up sync status callback
    setOnSyncStatusChange(handleSyncStatusChange);

    // Initialize sync handler
    const unsubscribe = initializeSSESync(store);

    // Connect to SSE
    sseManager.connect();

    // Handle visibility change - this is the KEY fix
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Mark when we went into background
        wasHiddenRef.current = true;
        lastActiveTimestampRef.current = Date.now();
      } else if (document.visibilityState === "visible" && isAuthenticated) {
        // Coming back from background
        const timeInBackground = Date.now() - lastActiveTimestampRef.current;

        // Reconnect SSE
        sseManager.connect();

        // If we were hidden for more than the threshold, invalidate caches
        // This catches up on any changes we missed while backgrounded
        if (wasHiddenRef.current && timeInBackground > STALE_THRESHOLD_MS) {
          console.log(`SSE: Was hidden for ${timeInBackground}ms, triggering catch-up sync`);
          // Small delay to let SSE reconnect first
          setTimeout(() => {
            invalidateAllCaches();
          }, 500);
        }

        wasHiddenRef.current = false;
        lastActiveTimestampRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Reconnect on online
    const handleOnline = () => {
      if (isAuthenticated) {
        sseManager.connect();
        // Also invalidate caches when coming back online
        // since we might have missed updates while offline
        invalidateAllCaches();
      }
    };

    window.addEventListener("online", handleOnline);

    // Handle page focus (additional catch for iOS PWA behavior)
    const handleFocus = () => {
      if (isAuthenticated && wasHiddenRef.current) {
        const timeInBackground = Date.now() - lastActiveTimestampRef.current;
        if (timeInBackground > STALE_THRESHOLD_MS) {
          sseManager.connect();
          setTimeout(() => {
            invalidateAllCaches();
          }, 500);
        }
        wasHiddenRef.current = false;
      }
    };

    window.addEventListener("focus", handleFocus);

    // iOS-specific: Handle pageshow event for bfcache restoration
    const handlePageShow = event => {
      if (event.persisted && isAuthenticated) {
        // Page was restored from bfcache
        console.log("SSE: Page restored from bfcache, triggering catch-up sync");
        sseManager.connect();
        invalidateAllCaches();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      sseManager.disconnect();
      unsubscribe?.();
      setOnSyncStatusChange(null);
    };
  }, [isAuthenticated, getAccessToken, store, dispatch, handleSyncStatusChange, invalidateAllCaches]);

  return {
    connectionStatus,
    recentSyncs,
    isConnected,
    clientId: sseManager.getClientId(),
  };
}

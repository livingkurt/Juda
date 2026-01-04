"use client";

import { useEffect, useCallback } from "react";
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

export function useSSESync() {
  const store = useStore();
  const dispatch = useDispatch();
  const { getAccessToken, isAuthenticated } = useAuth();

  const connectionStatus = useSelector(selectConnectionStatus);
  const recentSyncs = useSelector(selectRecentSyncs);
  const isConnected = useSelector(selectIsConnected);

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
      } else if (event.type === "sync") {
        dispatch(
          addRecentSync({
            entityType: event.entityType,
            operation: event.operation,
            id: event.id,
          })
        );
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

    // Reconnect on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        sseManager.connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Reconnect on online
    const handleOnline = () => {
      if (isAuthenticated) {
        sseManager.connect();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      sseManager.disconnect();
      unsubscribe?.();
      setOnSyncStatusChange(null);
    };
  }, [isAuthenticated, getAccessToken, store, dispatch, handleSyncStatusChange]);

  return {
    connectionStatus,
    recentSyncs,
    isConnected,
    clientId: sseManager.getClientId(),
  };
}

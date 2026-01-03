"use client";

import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOnlineStatus, setPendingSyncCount } from "@/lib/store/slices/offlineSlice";
import { getSyncQueueCount } from "@/lib/db/syncQueue";
import { syncManager } from "@/lib/sync/syncManager";
import { useAuth } from "@/hooks/useAuth";

export function useOfflineStatus() {
  const dispatch = useDispatch();
  const { getAccessToken } = useAuth();

  const isOnline = useSelector(state => state.offline.isOnline);
  const pendingSyncCount = useSelector(state => state.offline.pendingSyncCount);
  const syncInProgress = useSelector(state => state.offline.syncInProgress);
  const syncError = useSelector(state => state.offline.syncError);
  const lastSyncTimestamp = useSelector(state => state.offline.lastSyncTimestamp);

  // Initialize sync manager with auth function
  useEffect(() => {
    if (getAccessToken) {
      syncManager.setAuthFunction(getAccessToken);
    }
  }, [getAccessToken]);

  // Update online status
  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial status
    dispatch(setOnlineStatus(navigator.onLine));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch]);

  // Update pending sync count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getSyncQueueCount();
      dispatch(setPendingSyncCount(count));
    };

    updateCount();
    const interval = setInterval(updateCount, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [dispatch]);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      syncManager.sync();
    }
  }, [isOnline, pendingSyncCount]);

  // Manual sync trigger
  const triggerSync = useCallback(() => {
    if (isOnline) {
      syncManager.sync();
    }
  }, [isOnline]);

  return {
    isOnline,
    pendingSyncCount,
    syncInProgress,
    syncError,
    lastSyncTimestamp,
    triggerSync,
  };
}

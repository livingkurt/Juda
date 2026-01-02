"use client";

import { useState, useEffect, useCallback } from "react";
import { syncQueueService } from "@/lib/store/services/syncQueue.js";

/**
 * Hook to track offline status and sync queue
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isActuallyOnline, setIsActuallyOnline] = useState(true);
  const [syncQueueStats, setSyncQueueStats] = useState({
    total: 0,
    pending: 0,
    failed: 0,
    completed: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check actual network availability by pinging an endpoint
  useEffect(() => {
    let intervalId;

    const checkNetwork = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/auth/me", {
          method: "GET",
          signal: controller.signal,
          credentials: "include",
        });

        clearTimeout(timeoutId);
        setIsActuallyOnline(response.ok);
      } catch (_err) {
        setIsActuallyOnline(false);
      }
    };

    // Check immediately
    checkNetwork();

    // Check every 30 seconds
    intervalId = setInterval(checkNetwork, 30000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Update sync queue stats
  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = await syncQueueService.getStats();
        setSyncQueueStats(stats);
      } catch (_err) {
        console.error("Failed to get sync queue stats:", _err);
      }
    };

    updateStats();

    // Update stats every 5 seconds
    const intervalId = setInterval(updateStats, 5000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Retry failed syncs
  const retryFailedSyncs = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      const failed = await syncQueueService.getFailed();
      if (failed.length === 0) {
        return { success: true, message: "No failed syncs to retry" };
      }

      // Reset failed mutations to pending
      for (const mutation of failed) {
        await syncQueueService.add({
          type: mutation.type,
          payload: mutation.payload,
        });
        await syncQueueService.markFailed(mutation.id, "Retrying");
      }

      // Trigger sync processing
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("online"));
      }

      return { success: true, message: `Retrying ${failed.length} failed syncs` };
    } catch (err) {
      console.error("Failed to retry syncs:", err);
      return { success: false, error: err.message };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Clear sync queue
  const clearSyncQueue = useCallback(async () => {
    try {
      await syncQueueService.clear();
      const stats = await syncQueueService.getStats();
      setSyncQueueStats(stats);
      return { success: true };
    } catch (err) {
      console.error("Failed to clear sync queue:", err);
      return { success: false, error: err.message };
    }
  }, []);

  return {
    isOnline: isOnline && isActuallyOnline,
    isActuallyOnline,
    syncQueueStats,
    isSyncing,
    retryFailedSyncs,
    clearSyncQueue,
  };
}

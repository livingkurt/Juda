"use client";

import {
  getPendingSyncOperations,
  updateSyncStatus,
  removeSyncOperation,
  optimizeSyncQueue,
  getSyncQueueCount,
  SYNC_STATUS,
} from "@/lib/db/syncQueue";
import { store } from "@/lib/store";
import {
  setSyncInProgress,
  setSyncError,
  setLastSyncTimestamp,
  setPendingSyncCount,
} from "@/lib/store/slices/offlineSlice";
import { broadcastOfflineSync } from "@/lib/sse/broadcast";
import { sseManager } from "@/lib/sse/sseManager";

// Helper to decode JWT token payload (client-side only, no verification)
function decodeTokenPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.getAccessToken = null;
  }

  // Set auth function (called from AuthContext)
  setAuthFunction(getAccessTokenFn) {
    this.getAccessToken = getAccessTokenFn;
  }

  // Main sync function
  async sync() {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    if (!this.getAccessToken) {
      console.warn("SyncManager: getAccessToken not set");
      return;
    }

    this.isSyncing = true;
    store.dispatch(setSyncInProgress(true));
    store.dispatch(setSyncError(null));

    try {
      // Optimize queue before syncing
      await optimizeSyncQueue();

      // Get pending operations
      const operations = await getPendingSyncOperations();

      if (operations.length === 0) {
        return;
      }

      // Sort by timestamp (FIFO)
      operations.sort((a, b) => a.timestamp - b.timestamp);

      // Process each operation
      let syncedCount = 0;
      for (const op of operations) {
        await this.processOperation(op);
        syncedCount++;
      }

      // Update last sync timestamp
      store.dispatch(setLastSyncTimestamp(Date.now()));

      // Broadcast offline sync completion to other clients
      if (syncedCount > 0 && this.getAccessToken) {
        await this.broadcastSyncCompletion();
      }
    } catch (error) {
      console.error("Sync error:", error);
      store.dispatch(setSyncError(error.message));
    } finally {
      this.isSyncing = false;
      store.dispatch(setSyncInProgress(false));

      // Update pending count
      const count = await getSyncQueueCount();
      store.dispatch(setPendingSyncCount(count));
    }
  }

  // Process single sync operation
  async processOperation(operation) {
    await updateSyncStatus(operation.id, SYNC_STATUS.IN_PROGRESS);

    try {
      const token = await this.getAccessToken();

      if (!token) {
        throw new Error("No access token available");
      }

      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: operation.method !== "DELETE" ? JSON.stringify(operation.payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - remove from queue
      await removeSyncOperation(operation.id);

      // If this was a CREATE with offline ID, we need to update local references
      if (operation.payload?._isOffline) {
        const serverData = await response.json();
        await this.updateOfflineReferences(operation, serverData);
      }
    } catch (error) {
      console.error(`Sync operation failed:`, error);

      if (operation.retryCount >= MAX_RETRIES) {
        await updateSyncStatus(operation.id, SYNC_STATUS.FAILED, error.message);
      } else {
        await updateSyncStatus(operation.id, SYNC_STATUS.PENDING, error.message);
        // Retry after delay
        await new Promise(r => setTimeout(r, RETRY_DELAY * (operation.retryCount + 1)));
      }
    }
  }

  // Update local references when offline ID is replaced with server ID
  async updateOfflineReferences(operation, serverData) {
    const offlineId = operation.entityId;
    const serverId = serverData.id;

    if (offlineId === serverId) return;

    // Update IndexedDB
    const { putInStore, deleteFromStore, getAllFromStore, STORES } = await import("@/lib/db/indexedDB");

    // Entity-specific reference updates
    if (operation.entityType === "task") {
      // Update task in store
      await deleteFromStore(STORES.TASKS, offlineId);
      await putInStore(STORES.TASKS, { ...serverData, _isOffline: false });

      // Update parent references in subtasks
      const allTasks = await getAllFromStore(STORES.TASKS);
      for (const task of allTasks) {
        if (task.parentId === offlineId) {
          await putInStore(STORES.TASKS, { ...task, parentId: serverId });
        }
      }

      // Update completions referencing this task
      const completions = await getAllFromStore(STORES.COMPLETIONS);
      for (const comp of completions) {
        if (comp.taskId === offlineId) {
          await deleteFromStore(STORES.COMPLETIONS, comp.id);
          await putInStore(STORES.COMPLETIONS, { ...comp, taskId: serverId });
        }
      }
    }

    // Trigger RTK Query cache invalidation
    // This will refetch data with correct IDs
    store.dispatch({ type: "api/invalidateTags", payload: [operation.entityType] });
  }

  // Broadcast sync completion to other clients
  async broadcastSyncCompletion() {
    const token = await this.getAccessToken();
    if (!token) return;

    const payload = decodeTokenPayload(token);
    if (payload?.userId) {
      broadcastOfflineSync(payload.userId, sseManager.getClientId());
    }
  }

  // Register Background Sync
  async registerBackgroundSync() {
    if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register("sync-pending-changes");
      } catch (error) {
        console.warn("Background Sync registration failed:", error);
      }
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Initialize sync on online event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncManager.sync();
  });

  // Listen for service worker messages
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "SYNC_REQUIRED") {
        syncManager.sync();
      }
    });
  }
}

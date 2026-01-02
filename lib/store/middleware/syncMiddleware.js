import { syncQueueDB } from "../indexeddb.js";

/**
 * Sync middleware that intercepts mutations when offline
 * Queues them for later sync when connection is restored
 */
export const syncMiddleware = store => next => action => {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  // Check if this is a mutation (not a query)
  const isMutation = action.type?.includes("/executeMutation") || action.type?.includes("/pending");

  // If offline and this is a mutation, queue it
  if (!isOnline && isMutation && action.meta?.arg?.type === "mutation") {
    const { endpointName, originalArgs } = action.meta?.arg || {};

    // Queue the mutation
    syncQueueDB
      .add({
        type: endpointName,
        payload: originalArgs,
        timestamp: Date.now(),
      })
      .catch(err => {
        console.error("Failed to queue mutation:", err);
      });

    // Still allow the optimistic update to proceed
    return next(action);
  }

  // If online and there are queued mutations, process them
  if (isOnline && action.type === "sync/processQueue") {
    processSyncQueue(store);
  }

  return next(action);
};

/**
 * Process queued mutations when connection is restored
 */
async function processSyncQueue(store) {
  try {
    const pendingMutations = await syncQueueDB.getAll("pending");

    for (const mutation of pendingMutations) {
      try {
        // Retry the mutation
        const result = await retryMutation(mutation, store);

        if (result.success) {
          // Remove from queue
          await syncQueueDB.delete(mutation.id);
          continue;
        }

        // Handle failed mutation
        const retries = (mutation.retries || 0) + 1;
        const updateData = {
          retries,
          lastError: result.error,
        };

        if (retries >= 5) {
          updateData.status = "failed";
        }

        await syncQueueDB.update(mutation.id, updateData);
      } catch (err) {
        console.error(`Failed to process mutation ${mutation.id}:`, err);
        const retries = (mutation.retries || 0) + 1;
        const updateData = {
          retries,
          lastError: err.message,
        };

        if (retries >= 5) {
          updateData.status = "failed";
        }

        await syncQueueDB.update(mutation.id, updateData);
      }
    }
  } catch (err) {
    console.error("Failed to process sync queue:", err);
  }
}

/**
 * Retry a queued mutation with exponential backoff
 */
async function retryMutation(mutation, store) {
  const maxRetries = 5;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);

      // Wait before retrying (except first attempt)
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Dispatch the mutation through RTK Query
      // This will be handled by the base API slice
      const dispatch = store.dispatch;

      // Reconstruct the mutation action based on mutation type
      // This is a simplified version - in production, you'd map mutation.type to the actual endpoint
      const result = await dispatch({
        type: `api/executeMutation`,
        payload: {
          type: mutation.type,
          originalArgs: mutation.payload,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Mutation failed");
      }

      return { success: true };
    } catch (err) {
      if (attempt === maxRetries - 1) {
        return { success: false, error: err.message };
      }
      // Continue to next retry
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// Listen for online events
if (typeof window !== "undefined") {
  // Store reference will be set when middleware is initialized
  let storeRef = null;
  window.addEventListener("online", () => {
    if (storeRef) {
      storeRef.dispatch({ type: "sync/processQueue" });
    }
  });

  // Export function to set store reference
  if (typeof window !== "undefined") {
    window.__setSyncStore = store => {
      storeRef = store;
    };
  }
}

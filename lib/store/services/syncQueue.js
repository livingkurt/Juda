import { syncQueueDB } from "../indexeddb.js";

/**
 * Sync queue service for managing offline mutations
 */
export const syncQueueService = {
  /**
   * Add a mutation to the sync queue
   */
  async add(mutation) {
    return syncQueueDB.add({
      type: mutation.type,
      payload: mutation.payload,
      timestamp: Date.now(),
      status: "pending",
      retries: 0,
    });
  },

  /**
   * Get all pending mutations
   */
  async getPending() {
    return syncQueueDB.getAll("pending");
  },

  /**
   * Get all failed mutations
   */
  async getFailed() {
    return syncQueueDB.getAll("failed");
  },

  /**
   * Get all mutations (for debugging)
   */
  async getAll() {
    return syncQueueDB.getAll();
  },

  /**
   * Mark a mutation as completed
   */
  async markCompleted(id) {
    return syncQueueDB.delete(id);
  },

  /**
   * Mark a mutation as failed
   */
  async markFailed(id, error) {
    const existing = await syncQueueDB.getAll();
    const mutation = existing.find(m => m.id === id);
    if (mutation) {
      return syncQueueDB.update(id, {
        status: "failed",
        lastError: error?.message || String(error),
        retries: (mutation.retries || 0) + 1,
      });
    }
  },

  /**
   * Increment retry count for a mutation
   */
  async incrementRetry(id) {
    const existing = await syncQueueDB.getAll();
    const mutation = existing.find(m => m.id === id);
    if (mutation) {
      return syncQueueDB.update(id, {
        retries: (mutation.retries || 0) + 1,
      });
    }
  },

  /**
   * Clear all completed mutations (keep pending and failed)
   */
  async clearCompleted() {
    const all = await syncQueueDB.getAll();
    const completed = all.filter(m => m.status === "completed");
    await Promise.all(completed.map(m => syncQueueDB.delete(m.id)));
  },

  /**
   * Clear all mutations
   */
  async clear() {
    return syncQueueDB.clear();
  },

  /**
   * Get queue statistics
   */
  async getStats() {
    const all = await syncQueueDB.getAll();
    return {
      total: all.length,
      pending: all.filter(m => m.status === "pending").length,
      failed: all.filter(m => m.status === "failed").length,
      completed: all.filter(m => m.status === "completed").length,
    };
  },
};

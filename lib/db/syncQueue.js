import { getDB, STORES } from "./indexedDB.js";

// Generate unique IDs for offline-created items
export function generateOfflineId() {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Sync operation types
export const SYNC_OPERATIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
};

// Entity types matching API endpoints
export const ENTITY_TYPES = {
  TASK: "task",
  SECTION: "section",
  TAG: "tag",
  COMPLETION: "completion",
  FOLDER: "folder",
  SMART_FOLDER: "smartFolder",
  PREFERENCES: "preferences",
  TASK_TAGS: "taskTags",
  WORKOUT_PROGRAM: "workoutProgram",
};

// Sync statuses
export const SYNC_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
  FAILED: "failed",
  CONFLICT: "conflict",
};

// Add operation to sync queue
export async function addToSyncQueue({ operation, entityType, entityId, payload, endpoint, method }) {
  const db = await getDB();

  const queueItem = {
    operation,
    entityType,
    entityId,
    payload,
    endpoint,
    method,
    timestamp: Date.now(),
    status: SYNC_STATUS.PENDING,
    retryCount: 0,
    lastError: null,
  };

  return db.add(STORES.SYNC_QUEUE, queueItem);
}

// Get all pending sync operations
export async function getPendingSyncOperations() {
  const db = await getDB();
  const index = db.transaction(STORES.SYNC_QUEUE).store.index("status");
  return index.getAll(SYNC_STATUS.PENDING);
}

// Update sync operation status
export async function updateSyncStatus(id, status, error = null) {
  const db = await getDB();
  const item = await db.get(STORES.SYNC_QUEUE, id);

  if (item) {
    item.status = status;
    item.lastError = error;
    if (status === SYNC_STATUS.FAILED) {
      item.retryCount += 1;
    }
    await db.put(STORES.SYNC_QUEUE, item);
  }
}

// Remove completed sync operation
export async function removeSyncOperation(id) {
  const db = await getDB();
  return db.delete(STORES.SYNC_QUEUE, id);
}

// Clear all completed operations
export async function clearCompletedSyncOperations() {
  const db = await getDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
  const index = tx.store.index("status");

  let cursor = await index.openCursor(SYNC_STATUS.COMPLETED);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// Get sync queue count
export async function getSyncQueueCount() {
  const db = await getDB();
  const index = db.transaction(STORES.SYNC_QUEUE).store.index("status");
  return index.count(SYNC_STATUS.PENDING);
}

// Merge duplicate operations (optimization)
// e.g., multiple updates to same entity = keep only latest
export async function optimizeSyncQueue() {
  const db = await getDB();
  const pending = await getPendingSyncOperations();

  // Group by entityType + entityId
  const grouped = {};
  const toRemove = [];

  pending.forEach(item => {
    const key = `${item.entityType}_${item.entityId}`;

    if (item.operation === SYNC_OPERATIONS.DELETE) {
      // DELETE supersedes all previous operations for this entity
      if (grouped[key]) {
        toRemove.push(...grouped[key].map(i => i.id));
      }
      grouped[key] = [item];
    } else if (item.operation === SYNC_OPERATIONS.UPDATE) {
      // Later UPDATE supersedes earlier UPDATE
      if (grouped[key]) {
        const lastOp = grouped[key][grouped[key].length - 1];
        if (lastOp.operation === SYNC_OPERATIONS.UPDATE) {
          toRemove.push(lastOp.id);
          grouped[key][grouped[key].length - 1] = item;
        } else {
          grouped[key].push(item);
        }
      } else {
        grouped[key] = [item];
      }
    } else {
      // CREATE - keep as is
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }
  });

  // Remove superseded operations
  const tx = db.transaction(STORES.SYNC_QUEUE, "readwrite");
  await Promise.all(toRemove.map(id => tx.store.delete(id)));
  await tx.done;

  return toRemove.length;
}

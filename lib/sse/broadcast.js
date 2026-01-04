import { broadcastToUser } from "./sseClients.js";

// Entity types matching your RTK Query tags
export const ENTITY_TYPES = {
  TASK: "Task",
  SECTION: "Section",
  TAG: "Tag",
  COMPLETION: "Completion",
  FOLDER: "Folder",
  SMART_FOLDER: "SmartFolder",
  PREFERENCES: "Preferences",
  WORKOUT_PROGRAM: "WorkoutProgram",
  WORKOUT_SET_COMPLETION: "WorkoutSetCompletion",
};

// Operation types
export const OPERATIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  BATCH_CREATE: "batchCreate",
  BATCH_DELETE: "batchDelete",
  BATCH_UPDATE: "batchUpdate",
  REORDER: "reorder",
};

/**
 * Broadcast a data change to all connected clients for a user
 * @param {string} userId - The user ID
 * @param {string} entityType - Type of entity (Task, Section, etc.)
 * @param {string} operation - Operation type (create, update, delete)
 * @param {object} data - The entity data
 * @param {string|null} excludeClientId - Client ID to exclude from broadcast (prevents double-apply)
 */
export function broadcastChange(userId, entityType, operation, data, excludeClientId = null) {
  const message = {
    type: "sync",
    entityType,
    operation,
    data,
    timestamp: Date.now(),
    // Include server timestamp for conflict resolution
    serverTimestamp: new Date().toISOString(),
  };

  broadcastToUser(userId, message, excludeClientId);
}

/**
 * Broadcast that offline queue has synced (for other tabs to know data is fresh)
 * @param {string} userId - The user ID
 * @param {string} excludeClientId - Client ID to exclude
 */
export function broadcastOfflineSync(userId, excludeClientId = null) {
  const message = {
    type: "offlineSync",
    timestamp: Date.now(),
    serverTimestamp: new Date().toISOString(),
  };

  broadcastToUser(userId, message, excludeClientId);
}

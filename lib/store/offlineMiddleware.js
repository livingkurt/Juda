"use client";

import { isRejectedWithValue } from "@reduxjs/toolkit";
import { addToSyncQueue, SYNC_OPERATIONS, ENTITY_TYPES, generateOfflineId } from "@/lib/db/syncQueue";
import { putInStore, deleteFromStore, STORES } from "@/lib/db/indexedDB";

// Map RTK Query endpoints to entity types
const ENDPOINT_TO_ENTITY = {
  createTask: ENTITY_TYPES.TASK,
  updateTask: ENTITY_TYPES.TASK,
  deleteTask: ENTITY_TYPES.TASK,
  batchReorderTasks: ENTITY_TYPES.TASK,
  batchUpdateTasks: ENTITY_TYPES.TASK,
  batchSaveTasks: ENTITY_TYPES.TASK,
  batchDeleteTasks: ENTITY_TYPES.TASK,
  createSection: ENTITY_TYPES.SECTION,
  updateSection: ENTITY_TYPES.SECTION,
  deleteSection: ENTITY_TYPES.SECTION,
  createTag: ENTITY_TYPES.TAG,
  updateTag: ENTITY_TYPES.TAG,
  deleteTag: ENTITY_TYPES.TAG,
  createCompletion: ENTITY_TYPES.COMPLETION,
  deleteCompletion: ENTITY_TYPES.COMPLETION,
  updateCompletion: ENTITY_TYPES.COMPLETION,
  createFolder: ENTITY_TYPES.FOLDER,
  updateFolder: ENTITY_TYPES.FOLDER,
  deleteFolder: ENTITY_TYPES.FOLDER,
  updatePreferences: ENTITY_TYPES.PREFERENCES,
  updateTaskTags: ENTITY_TYPES.TASK_TAGS,
};

// Map endpoints to IndexedDB stores
const ENDPOINT_TO_STORE = {
  createTask: STORES.TASKS,
  updateTask: STORES.TASKS,
  deleteTask: STORES.TASKS,
  batchReorderTasks: STORES.TASKS,
  batchUpdateTasks: STORES.TASKS,
  batchSaveTasks: STORES.TASKS,
  batchDeleteTasks: STORES.TASKS,
  createSection: STORES.SECTIONS,
  updateSection: STORES.SECTIONS,
  deleteSection: STORES.SECTIONS,
  createTag: STORES.TAGS,
  updateTag: STORES.TAGS,
  deleteTag: STORES.TAGS,
  createCompletion: STORES.COMPLETIONS,
  deleteCompletion: STORES.COMPLETIONS,
  updateCompletion: STORES.COMPLETIONS,
  createFolder: STORES.FOLDERS,
  updateFolder: STORES.FOLDERS,
  deleteFolder: STORES.FOLDERS,
  updatePreferences: STORES.PREFERENCES,
};

// Determine operation type from endpoint name
function getOperationType(endpointName) {
  if (endpointName.startsWith("create")) return SYNC_OPERATIONS.CREATE;
  if (endpointName.startsWith("update")) return SYNC_OPERATIONS.UPDATE;
  if (endpointName.startsWith("delete")) return SYNC_OPERATIONS.DELETE;
  if (endpointName.startsWith("batch")) return SYNC_OPERATIONS.UPDATE;
  return SYNC_OPERATIONS.UPDATE;
}

// Offline middleware for RTK Query
export const offlineMiddleware = () => next => async action => {
  // Only handle RTK Query mutation actions
  if (!action.type?.includes("/executeMutation")) {
    return next(action);
  }

  // Check if we're online
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  // Get endpoint name from action
  const endpointName = action.meta?.arg?.endpointName;
  const originalArgs = action.meta?.arg?.originalArgs;

  if (!endpointName || !ENDPOINT_TO_ENTITY[endpointName]) {
    return next(action);
  }

  // If online, let the request proceed normally
  if (isOnline) {
    const result = await next(action);

    // On success, update IndexedDB cache
    if (!isRejectedWithValue(result)) {
      await updateOfflineCache(endpointName, originalArgs, result.payload);
    }

    return result;
  }

  // === OFFLINE HANDLING ===

  const entityType = ENDPOINT_TO_ENTITY[endpointName];
  const operation = getOperationType(endpointName);
  const store = ENDPOINT_TO_STORE[endpointName];

  try {
    // Generate offline ID for new items
    let entityId = originalArgs?.id;
    let offlinePayload = { ...originalArgs };

    if (operation === SYNC_OPERATIONS.CREATE && !entityId) {
      entityId = generateOfflineId();
      offlinePayload.id = entityId;
      offlinePayload._isOffline = true;
      offlinePayload.createdAt = new Date().toISOString();
      offlinePayload.updatedAt = new Date().toISOString();
    }

    // Update IndexedDB immediately for optimistic UI
    if (store) {
      if (operation === SYNC_OPERATIONS.DELETE) {
        await deleteFromStore(store, entityId);
      } else {
        await putInStore(store, offlinePayload);
      }
    }

    // Add to sync queue
    await addToSyncQueue({
      operation,
      entityType,
      entityId,
      payload: offlinePayload,
      endpoint: getEndpointUrl(endpointName, originalArgs),
      method: getHttpMethod(operation),
    });

    // Return optimistic response
    return {
      ...action,
      payload: offlinePayload,
      meta: {
        ...action.meta,
        offline: true,
      },
    };
  } catch (error) {
    console.error("Offline handling error:", error);
    // Return error action
    return {
      ...action,
      error: { message: "Failed to save offline" },
      meta: {
        ...action.meta,
        offline: true,
        offlineError: true,
      },
    };
  }
};

// Helper to get API endpoint URL
function getEndpointUrl(endpointName, args) {
  const endpoints = {
    createTask: "/api/tasks",
    updateTask: "/api/tasks",
    deleteTask: `/api/tasks?id=${args?.id}`,
    batchReorderTasks: "/api/tasks/batch-reorder",
    batchUpdateTasks: "/api/tasks/batch-update",
    batchSaveTasks: "/api/tasks/batch-save",
    batchDeleteTasks: "/api/tasks/batch-save",
    createSection: "/api/sections",
    updateSection: "/api/sections",
    deleteSection: `/api/sections?id=${args?.id}`,
    createTag: "/api/tags",
    updateTag: "/api/tags",
    deleteTag: `/api/tags?id=${args}`,
    createCompletion: "/api/completions",
    deleteCompletion: `/api/completions?taskId=${args?.taskId}&date=${args?.date}`,
    updateCompletion: "/api/completions",
    createFolder: "/api/folders",
    updateFolder: "/api/folders",
    deleteFolder: `/api/folders?id=${args}`,
    updatePreferences: "/api/preferences",
    updateTaskTags: "/api/task-tags/batch",
  };
  return endpoints[endpointName] || "";
}

// Helper to get HTTP method
function getHttpMethod(operation) {
  const methods = {
    [SYNC_OPERATIONS.CREATE]: "POST",
    [SYNC_OPERATIONS.UPDATE]: "PUT",
    [SYNC_OPERATIONS.DELETE]: "DELETE",
  };
  return methods[operation] || "POST";
}

// Update offline cache on successful API response
async function updateOfflineCache(endpointName, args, response) {
  const store = ENDPOINT_TO_STORE[endpointName];
  const operation = getOperationType(endpointName);

  if (!store) return;

  try {
    if (operation === SYNC_OPERATIONS.DELETE) {
      await deleteFromStore(store, args?.id || args);
    } else if (response) {
      await putInStore(store, response);
    }
  } catch (error) {
    console.error("Failed to update offline cache:", error);
  }
}

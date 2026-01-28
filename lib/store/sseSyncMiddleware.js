"use client";

import { sseManager } from "@/lib/sse/sseManager";
import { tasksApi } from "./api/tasksApi.js";
import { sectionsApi } from "./api/sectionsApi.js";
import { tagsApi } from "./api/tagsApi.js";
import { completionsApi } from "./api/completionsApi.js";
import { foldersApi } from "./api/foldersApi.js";
import { smartFoldersApi } from "./api/smartFoldersApi.js";
import { preferencesApi } from "./api/preferencesApi.js";

// Track last update timestamps for conflict resolution
const lastUpdateTimestamps = new Map(); // entityType:id -> timestamp

/**
 * Check if incoming update is newer than what we have
 * @param {string} entityType - The entity type
 * @param {string} id - The entity ID
 * @param {string} serverTimestamp - ISO timestamp from server
 * @returns {boolean} - True if we should apply this update
 */
function shouldApplyUpdate(entityType, id, serverTimestamp) {
  const key = `${entityType}:${id}`;
  const lastTimestamp = lastUpdateTimestamps.get(key);

  if (!lastTimestamp) {
    lastUpdateTimestamps.set(key, serverTimestamp);
    return true;
  }

  const incoming = new Date(serverTimestamp).getTime();
  const existing = new Date(lastTimestamp).getTime();

  if (incoming > existing) {
    lastUpdateTimestamps.set(key, serverTimestamp);
    return true;
  }

  return false;
}

/**
 * Record a local update timestamp (called when user makes local changes)
 * @param {string} entityType - The entity type
 * @param {string} id - The entity ID
 */
export function recordLocalUpdate(entityType, id) {
  const key = `${entityType}:${id}`;
  lastUpdateTimestamps.set(key, new Date().toISOString());
}

/**
 * Clear timestamp tracking (e.g., on logout)
 */
export function clearTimestampTracking() {
  lastUpdateTimestamps.clear();
}

// Map entity types to their RTK Query APIs and update functions
const entityHandlers = {
  Task: {
    api: tasksApi,
    queryName: "getTasks",
    handlers: {
      create: (draft, data) => {
        if (data.parentId) {
          // Find parent and add as subtask
          const addToParent = tasks => {
            for (let i = 0; i < tasks.length; i++) {
              const task = tasks[i];
              if (task.id === data.parentId) {
                const subtasks = task.subtasks || [];
                // Check if already exists (prevent duplicates)
                if (!subtasks.find(s => s.id === data.id)) {
                  const updatedTask = { ...task, subtasks: [...subtasks, { ...data, subtasks: [] }] };
                  tasks.splice(i, 1, updatedTask);
                }
                return true;
              }
              if (task.subtasks?.length && addToParent(task.subtasks)) {
                return true;
              }
            }
            return false;
          };
          addToParent(draft);
        } else {
          // Check if already exists
          if (!draft.find(t => t.id === data.id)) {
            draft.push({ ...data, subtasks: [] });
          }
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Task", data.id, serverTimestamp)) {
          return;
        }
        const updateInTree = tasks => {
          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === data.id) {
              const updatedTask = { ...tasks[i], ...data, subtasks: tasks[i].subtasks };
              tasks.splice(i, 1, updatedTask);
              return true;
            }
            if (tasks[i].subtasks?.length && updateInTree(tasks[i].subtasks)) {
              return true;
            }
          }
          return false;
        };
        updateInTree(draft);
      },
      delete: (draft, data) => {
        const removeFromTree = tasks => {
          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === data.id) {
              tasks.splice(i, 1);
              return true;
            }
            if (tasks[i].subtasks?.length && removeFromTree(tasks[i].subtasks)) {
              return true;
            }
          }
          return false;
        };
        removeFromTree(draft);
        // Clean up timestamp tracking
        lastUpdateTimestamps.delete(`Task:${data.id}`);
      },
      reorder: (draft, data) => {
        // data.items contains array of { id, order } or { id, order, sectionId }
        const orderMap = new Map(data.items.map(item => [item.id, item]));
        const updateOrder = tasks => {
          for (const task of tasks) {
            const update = orderMap.get(task.id);
            if (update) {
              task.order = update.order;
              if (update.sectionId !== undefined) {
                task.sectionId = update.sectionId;
              }
            }
            if (task.subtasks?.length) {
              updateOrder(task.subtasks);
            }
          }
        };
        updateOrder(draft);
      },
    },
  },
  Section: {
    api: sectionsApi,
    queryName: "getSections",
    handlers: {
      create: (draft, data) => {
        if (!draft.find(s => s.id === data.id)) {
          draft.push(data);
          draft.sort((a, b) => a.order - b.order);
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Section", data.id, serverTimestamp)) {
          return;
        }
        const index = draft.findIndex(s => s.id === data.id);
        if (index !== -1) {
          draft[index] = { ...draft[index], ...data };
        }
      },
      delete: (draft, data) => {
        const index = draft.findIndex(s => s.id === data.id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
        lastUpdateTimestamps.delete(`Section:${data.id}`);
      },
      reorder: (draft, data) => {
        const orderMap = new Map(data.items.map(item => [item.id, item.order]));
        for (let i = 0; i < draft.length; i++) {
          if (orderMap.has(draft[i].id)) {
            draft[i] = { ...draft[i], order: orderMap.get(draft[i].id) };
          }
        }
        draft.sort((a, b) => a.order - b.order);
      },
    },
  },
  Tag: {
    api: tagsApi,
    queryName: "getTags",
    handlers: {
      create: (draft, data) => {
        if (!draft.find(t => t.id === data.id)) {
          draft.push(data);
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Tag", data.id, serverTimestamp)) {
          return;
        }
        const index = draft.findIndex(t => t.id === data.id);
        if (index !== -1) {
          draft[index] = { ...draft[index], ...data };
        }
      },
      delete: (draft, data) => {
        const index = draft.findIndex(t => t.id === data.id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
        lastUpdateTimestamps.delete(`Tag:${data.id}`);
      },
    },
  },
  Completion: {
    api: completionsApi,
    queryName: "getCompletions",
    handlers: {
      create: (draft, data) => {
        // Handle both array format (old) and object format (new)
        const completions = Array.isArray(draft) ? draft : draft.completions;
        if (!completions.find(c => c.id === data.id)) {
          completions.unshift(data);
          if (!Array.isArray(draft) && draft.pagination) {
            const totalCount = (draft.pagination.totalCount || 0) + 1;
            const limit = draft.pagination.limit || completions.length;
            draft.pagination.totalCount = totalCount;
            draft.pagination.totalPages = Math.ceil(totalCount / limit);
            draft.pagination.hasMore = completions.length < totalCount;
            if (completions.length > limit) {
              completions.splice(limit);
            }
          }
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Completion", data.id, serverTimestamp)) {
          return;
        }
        // Handle both array format (old) and object format (new)
        const completions = Array.isArray(draft) ? draft : draft.completions;
        const index = completions.findIndex(c => c.id === data.id);
        if (index !== -1) {
          completions[index] = { ...completions[index], ...data };
        }
      },
      delete: (draft, data) => {
        // Handle both array format (old) and object format (new)
        const completions = Array.isArray(draft) ? draft : draft.completions;
        const index = completions.findIndex(c => c.id === data.id);
        if (index !== -1) {
          completions.splice(index, 1);
          if (!Array.isArray(draft) && draft.pagination) {
            const totalCount = Math.max((draft.pagination.totalCount || 1) - 1, 0);
            const limit = draft.pagination.limit || completions.length || 1;
            draft.pagination.totalCount = totalCount;
            draft.pagination.totalPages = Math.ceil(totalCount / limit);
            draft.pagination.hasMore = completions.length < totalCount;
          }
        }
        lastUpdateTimestamps.delete(`Completion:${data.id}`);
      },
      batchCreate: (draft, data) => {
        // Handle both array format (old) and object format (new)
        const completions = Array.isArray(draft) ? draft : draft.completions;
        const newItems = data.items.filter(item => !completions.find(c => c.id === item.id));
        if (newItems.length > 0) {
          completions.unshift(...newItems);
          if (!Array.isArray(draft) && draft.pagination) {
            const totalCount = (draft.pagination.totalCount || 0) + newItems.length;
            const limit = draft.pagination.limit || completions.length;
            draft.pagination.totalCount = totalCount;
            draft.pagination.totalPages = Math.ceil(totalCount / limit);
            draft.pagination.hasMore = completions.length < totalCount;
            if (completions.length > limit) {
              completions.splice(limit);
            }
          }
        }
      },
      batchDelete: (draft, data) => {
        // Handle both array format (old) and object format (new)
        const completions = Array.isArray(draft) ? draft : draft.completions;
        let removedCount = 0;
        data.ids.forEach(id => {
          const index = completions.findIndex(c => c.id === id);
          if (index !== -1) {
            completions.splice(index, 1);
            removedCount += 1;
          }
          lastUpdateTimestamps.delete(`Completion:${id}`);
        });
        if (!Array.isArray(draft) && draft.pagination && removedCount > 0) {
          const totalCount = Math.max((draft.pagination.totalCount || removedCount) - removedCount, 0);
          const limit = draft.pagination.limit || completions.length || 1;
          draft.pagination.totalCount = totalCount;
          draft.pagination.totalPages = Math.ceil(totalCount / limit);
          draft.pagination.hasMore = completions.length < totalCount;
        }
      },
    },
  },
  Folder: {
    api: foldersApi,
    queryName: "getFolders",
    handlers: {
      create: (draft, data) => {
        if (!draft.find(f => f.id === data.id)) {
          draft.push(data);
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Folder", data.id, serverTimestamp)) {
          return;
        }
        const index = draft.findIndex(f => f.id === data.id);
        if (index !== -1) {
          draft[index] = { ...draft[index], ...data };
        }
      },
      delete: (draft, data) => {
        const index = draft.findIndex(f => f.id === data.id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
        lastUpdateTimestamps.delete(`Folder:${data.id}`);
      },
    },
  },
  SmartFolder: {
    api: smartFoldersApi,
    queryName: "getSmartFolders",
    handlers: {
      create: (draft, data) => {
        if (!draft.find(f => f.id === data.id)) {
          draft.push(data);
        }
      },
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("SmartFolder", data.id, serverTimestamp)) {
          return;
        }
        const index = draft.findIndex(f => f.id === data.id);
        if (index !== -1) {
          draft[index] = { ...draft[index], ...data };
        }
      },
      delete: (draft, data) => {
        const index = draft.findIndex(f => f.id === data.id);
        if (index !== -1) {
          draft.splice(index, 1);
        }
        lastUpdateTimestamps.delete(`SmartFolder:${data.id}`);
      },
    },
  },
  Preferences: {
    api: preferencesApi,
    queryName: "getPreferences",
    handlers: {
      update: (draft, data, serverTimestamp) => {
        if (!shouldApplyUpdate("Preferences", "user", serverTimestamp)) {
          return;
        }
        // Handle case where draft might be an array (when auth isn't initialized)
        // or null/undefined (when query hasn't run yet)
        if (!draft || Array.isArray(draft)) {
          // If draft is invalid, skip update - the query will fetch fresh data when auth is ready
          return;
        }
        Object.assign(draft, data);
      },
    },
  },
};

// Callbacks for sync status updates
let onSyncStatusChange = null;

export function setOnSyncStatusChange(callback) {
  onSyncStatusChange = callback;
}

export function initializeSSESync(store) {
  // Subscribe to SSE messages
  const unsubscribe = sseManager.subscribe(message => {
    // Handle connection status changes
    if (message.type === "connection") {
      if (onSyncStatusChange) {
        onSyncStatusChange({ type: "connection", status: message.status });
      }
      return;
    }

    // Handle offline sync completion notification
    if (message.type === "offlineSync") {
      if (onSyncStatusChange) {
        onSyncStatusChange({ type: "offlineSync", timestamp: message.timestamp });
      }
      // Invalidate all caches to get fresh data
      store.dispatch(tasksApi.util.invalidateTags(["Task"]));
      store.dispatch(sectionsApi.util.invalidateTags(["Section"]));
      store.dispatch(tagsApi.util.invalidateTags(["Tag"]));
      store.dispatch(completionsApi.util.invalidateTags(["Completion"]));
      store.dispatch(foldersApi.util.invalidateTags(["Folder"]));
      store.dispatch(smartFoldersApi.util.invalidateTags(["SmartFolder"]));
      return;
    }

    // Handle sync messages
    if (message.type !== "sync") return;

    const { entityType, operation, data, serverTimestamp } = message;
    const handler = entityHandlers[entityType];

    if (!handler) {
      console.warn(`SSE: Unknown entity type: ${entityType}`);
      return;
    }

    const operationHandler = handler.handlers[operation];
    if (!operationHandler) {
      console.warn(`SSE: Unknown operation ${operation} for ${entityType}`);
      return;
    }

    // Skip preferences updates if we don't have valid query data yet (auth might not be initialized)
    // This prevents Immer errors when trying to update array data
    if (entityType === "Preferences") {
      const state = store.getState();
      const preferencesData = handler.api.endpoints.getPreferences.select(undefined)(state);
      // If preferences data is an array (invalid), skip this update - it will be fetched when auth is ready
      if (!preferencesData?.data || Array.isArray(preferencesData.data)) {
        return;
      }
    }

    // Notify about incoming sync
    if (onSyncStatusChange) {
      onSyncStatusChange({
        type: "sync",
        entityType,
        operation,
        id: data?.id || data?.ids?.[0],
      });
    }

    const state = store.getState();
    const taggedQueries = handler.api.util.selectInvalidatedBy(state, [
      { type: entityType, id: "LIST" },
      { type: entityType, id: "PAGINATED" },
    ]);
    const matchingQueries = taggedQueries.filter(query => query.endpointName === handler.queryName);

    try {
      if (matchingQueries.length > 0) {
        matchingQueries.forEach(query => {
          store.dispatch(
            handler.api.util.updateQueryData(handler.queryName, query.originalArgs, draft => {
              operationHandler(draft, data, serverTimestamp);
            })
          );
        });
      } else {
        store.dispatch(
          handler.api.util.updateQueryData(handler.queryName, undefined, draft => {
            operationHandler(draft, data, serverTimestamp);
          })
        );
      }
    } catch (error) {
      // Log error but don't crash - invalidate tags to force refetch instead
      console.error(`SSE: Failed to parse message`, error);
      store.dispatch(handler.api.util.invalidateTags([{ type: entityType, id: "LIST" }]));
    }

    // Sync applied successfully
  });

  return unsubscribe;
}

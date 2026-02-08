"use client";

import { sseManager } from "@/lib/sse/sseManager";
import { tasksApi } from "./api/tasksApi.js";
import { sectionsApi } from "./api/sectionsApi.js";
import { tagsApi } from "./api/tagsApi.js";
import { completionsApi } from "./api/completionsApi.js";
import { foldersApi } from "./api/foldersApi.js";
import { smartFoldersApi } from "./api/smartFoldersApi.js";
import { preferencesApi } from "./api/preferencesApi.js";
import { shouldShowOnDate, hasFutureDateTime } from "@/lib/utils";

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

const parseLocalDate = dateStr => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const upsertTaskInTree = (tasks, data) => {
  const mergeTask = existing => ({
    ...existing,
    ...data,
    subtasks: data.subtasks ?? existing.subtasks ?? [],
  });

  if (data.parentId) {
    for (const task of tasks) {
      if (task.id === data.parentId) {
        const subtasks = task.subtasks || [];
        const idx = subtasks.findIndex(st => st.id === data.id);
        if (idx === -1) {
          subtasks.push({ ...data, subtasks: data.subtasks ?? [] });
        } else {
          subtasks[idx] = mergeTask(subtasks[idx]);
        }
        task.subtasks = subtasks;
        return true;
      }
      if (task.subtasks?.length && upsertTaskInTree(task.subtasks, data)) {
        return true;
      }
    }
    return false;
  }

  const index = tasks.findIndex(t => t.id === data.id);
  if (index === -1) {
    tasks.push({ ...data, subtasks: data.subtasks ?? [] });
  } else {
    tasks[index] = mergeTask(tasks[index]);
  }
  return true;
};

const removeTaskFromTree = (tasks, id) => {
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    tasks.splice(index, 1);
    return true;
  }
  for (const task of tasks) {
    if (task.subtasks?.length && removeTaskFromTree(task.subtasks, id)) {
      return true;
    }
  }
  return false;
};

const applyReorder = (tasks, items) => {
  const orderMap = new Map(items.map(item => [item.id, item]));
  const updateOrder = list => {
    for (const task of list) {
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
  updateOrder(tasks);
};

const isBacklogTask = task => {
  if (task.sectionId) return false;
  if (task.parentId) return false;
  if (task.completionType === "note" || task.completionType === "goal") return false;
  if (task.recurrence?.type && task.recurrence.type !== "none") return false;
  if (hasFutureDateTime(task)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (shouldShowOnDate(task, today)) return false;
  return true;
};

const isTaskForDate = (task, dateStr) => {
  if (!dateStr) return false;
  if (task.completionType === "note" || task.completionType === "goal") return false;
  if (task.parentId) return false;
  const date = parseLocalDate(dateStr);
  if (!date) return false;
  return shouldShowOnDate(task, date);
};

const isTaskForCalendarRange = (task, startStr, endStr) => {
  if (task.completionType === "note" || task.completionType === "goal") return false;
  if (!task.recurrence) return false;
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!start || !end) return false;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (shouldShowOnDate(task, cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
};

const shouldIncludeInEndpoint = (endpointName, args, task) => {
  switch (endpointName) {
    case "getBacklogTasks":
      return isBacklogTask(task);
    case "getTasksForDate":
      return isTaskForDate(task, args);
    case "getNoteTasks":
      return task.completionType === "note" && !task.parentId;
    case "getWorkoutTasks":
      return task.completionType === "workout" && !task.parentId;
    case "getRecurringTasks":
      return Boolean(task.recurrence?.type && task.recurrence.type !== "none") && !task.parentId;
    case "getCalendarTasks":
      return isTaskForCalendarRange(task, args?.start, args?.end) && !task.parentId;
    default:
      return false;
  }
};

const applyTaskOperation = (draft, operation, data, serverTimestamp) => {
  if (operation === "delete") {
    removeTaskFromTree(draft, data.id);
    lastUpdateTimestamps.delete(`Task:${data.id}`);
    return;
  }

  if (operation === "reorder") {
    applyReorder(draft, data.items || []);
    return;
  }

  if (operation === "update") {
    if (!shouldApplyUpdate("Task", data.id, serverTimestamp)) {
      return;
    }
  }

  upsertTaskInTree(draft, data);
};

// Map entity types to their RTK Query APIs and update functions
const entityHandlers = {
  Task: {
    api: tasksApi,
    queryNames: [
      "getBacklogTasks",
      "getTasksForDate",
      "getNoteTasks",
      "getWorkoutTasks",
      "getRecurringTasks",
      "getCalendarTasks",
    ],
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

    // Notify about incoming sync
    if (onSyncStatusChange) {
      onSyncStatusChange({
        type: "sync",
        entityType,
        operation,
        id: data?.id || data?.ids?.[0],
      });
    }

    if (entityType === "Task") {
      const state = store.getState();
      const taskQueries = Object.values(state.api.queries).filter(query =>
        handler.queryNames?.includes(query.endpointName)
      );

      taskQueries.forEach(query => {
        const shouldInclude = shouldIncludeInEndpoint(query.endpointName, query.originalArgs, data);

        store.dispatch(
          handler.api.util.updateQueryData(query.endpointName, query.originalArgs, draft => {
            const exists =
              draft && Array.isArray(draft)
                ? draft.some(t => t.id === data.id || t.subtasks?.some(st => st.id === data.id))
                : false;

            if (!shouldInclude) {
              if (exists) {
                removeTaskFromTree(draft, data.id);
              }
              return;
            }

            if (!exists && operation === "delete") return;

            applyTaskOperation(draft, operation, data, serverTimestamp);
          })
        );
      });

      return;
    }

    // For other entities, use the direct cache update approach
    const operationHandler = handler.handlers[operation];
    if (!operationHandler) {
      console.warn(`SSE: Unknown operation ${operation} for ${entityType}`);
      return;
    }

    const state = store.getState();
    const taggedQueries = handler.api.util.selectInvalidatedBy(state, [
      { type: entityType, id: "LIST" },
      { type: entityType, id: "PAGINATED" },
    ]);
    const matchingQueries = taggedQueries.filter(query => query.endpointName === handler.queryName);

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

    // Sync applied successfully
  });

  return unsubscribe;
}

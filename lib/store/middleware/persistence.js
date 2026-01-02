import { taskDB, tagDB, sectionDB } from "../indexeddb.js";

/**
 * Persistence middleware that syncs RTK Query cache to IndexedDB
 * Listens for successful mutations and queries, then persists to IndexedDB
 */
export const persistenceMiddleware = () => next => action => {
  const result = next(action);

  // Only persist in browser environment
  if (typeof window === "undefined") {
    return result;
  }

  // Handle successful queries/mutations
  if (action.type?.endsWith("/fulfilled")) {
    const { meta } = action;
    const endpointName = meta?.arg?.endpointName;
    const originalArgs = meta?.arg?.originalArgs;

    // Persist tasks
    if (endpointName === "getTasks" && action.payload) {
      const tasks = Array.isArray(action.payload) ? action.payload : [action.payload];
      taskDB.putAll(tasks).catch(err => {
        console.error("Failed to persist tasks:", err);
      });
    }

    if (endpointName === "getTaskById" && action.payload) {
      taskDB.put(action.payload).catch(err => {
        console.error("Failed to persist task:", err);
      });
    }

    if (endpointName === "createTask" && action.payload) {
      taskDB.put(action.payload).catch(err => {
        console.error("Failed to persist created task:", err);
      });
    }

    if (endpointName === "updateTask" && action.payload) {
      taskDB.put(action.payload).catch(err => {
        console.error("Failed to persist updated task:", err);
      });
    }

    if (endpointName === "deleteTask" && originalArgs?.id) {
      taskDB.delete(originalArgs.id).catch(err => {
        console.error("Failed to delete task from IndexedDB:", err);
      });
    }

    // Persist tags
    if (endpointName === "getTags" && action.payload) {
      const tags = Array.isArray(action.payload) ? action.payload : [action.payload];
      tagDB.putAll(tags).catch(err => {
        console.error("Failed to persist tags:", err);
      });
    }

    if (endpointName === "createTag" && action.payload) {
      tagDB.put(action.payload).catch(err => {
        console.error("Failed to persist created tag:", err);
      });
    }

    if (endpointName === "updateTag" && action.payload) {
      tagDB.put(action.payload).catch(err => {
        console.error("Failed to persist updated tag:", err);
      });
    }

    if (endpointName === "deleteTag" && originalArgs?.id) {
      tagDB.delete(originalArgs.id).catch(err => {
        console.error("Failed to delete tag from IndexedDB:", err);
      });
    }

    // Persist sections
    if (endpointName === "getSections" && action.payload) {
      const sections = Array.isArray(action.payload) ? action.payload : [action.payload];
      sectionDB.putAll(sections).catch(err => {
        console.error("Failed to persist sections:", err);
      });
    }

    if (endpointName === "createSection" && action.payload) {
      sectionDB.put(action.payload).catch(err => {
        console.error("Failed to persist created section:", err);
      });
    }

    if (endpointName === "updateSection" && action.payload) {
      sectionDB.put(action.payload).catch(err => {
        console.error("Failed to persist updated section:", err);
      });
    }

    if (endpointName === "deleteSection" && originalArgs?.id) {
      sectionDB.delete(originalArgs.id).catch(err => {
        console.error("Failed to delete section from IndexedDB:", err);
      });
    }
  }

  return result;
};

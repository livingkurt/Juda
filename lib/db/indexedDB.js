import { openDB } from "idb";

const DB_NAME = "juda-offline";
const DB_VERSION = 1;

// Store names
export const STORES = {
  TASKS: "tasks",
  SECTIONS: "sections",
  TAGS: "tags",
  COMPLETIONS: "completions",
  FOLDERS: "folders",
  SMART_FOLDERS: "smartFolders",
  PREFERENCES: "preferences",
  WORKOUT_PROGRAMS: "workoutPrograms",
  SYNC_QUEUE: "syncQueue",
  META: "meta",
};

// Initialize database
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Tasks store
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: "id" });
        taskStore.createIndex("sectionId", "sectionId");
        taskStore.createIndex("parentId", "parentId");
        taskStore.createIndex("folderId", "folderId");
        taskStore.createIndex("updatedAt", "updatedAt");
      }

      // Sections store
      if (!db.objectStoreNames.contains(STORES.SECTIONS)) {
        const sectionStore = db.createObjectStore(STORES.SECTIONS, { keyPath: "id" });
        sectionStore.createIndex("order", "order");
      }

      // Tags store
      if (!db.objectStoreNames.contains(STORES.TAGS)) {
        db.createObjectStore(STORES.TAGS, { keyPath: "id" });
      }

      // Completions store
      if (!db.objectStoreNames.contains(STORES.COMPLETIONS)) {
        const completionStore = db.createObjectStore(STORES.COMPLETIONS, { keyPath: "id" });
        completionStore.createIndex("taskId", "taskId");
        completionStore.createIndex("date", "date");
        completionStore.createIndex("taskId_date", ["taskId", "date"]);
      }

      // Folders store
      if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
        const folderStore = db.createObjectStore(STORES.FOLDERS, { keyPath: "id" });
        folderStore.createIndex("parentId", "parentId");
      }

      // Smart Folders store
      if (!db.objectStoreNames.contains(STORES.SMART_FOLDERS)) {
        db.createObjectStore(STORES.SMART_FOLDERS, { keyPath: "id" });
      }

      // Preferences store (single record per user)
      if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
        db.createObjectStore(STORES.PREFERENCES, { keyPath: "userId" });
      }

      // Workout Programs store
      if (!db.objectStoreNames.contains(STORES.WORKOUT_PROGRAMS)) {
        const workoutStore = db.createObjectStore(STORES.WORKOUT_PROGRAMS, { keyPath: "id" });
        workoutStore.createIndex("taskId", "taskId");
      }

      // Sync Queue - stores pending offline mutations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: "id",
          autoIncrement: true,
        });
        syncStore.createIndex("timestamp", "timestamp");
        syncStore.createIndex("entityType", "entityType");
        syncStore.createIndex("status", "status");
      }

      // Meta store - for sync timestamps, user info, etc.
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
    },
  });
}

// Get database instance (singleton pattern)
let dbInstance = null;

export async function getDB() {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
}

// Generic CRUD operations
export async function getAllFromStore(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function getFromStore(storeName, key) {
  const db = await getDB();
  return db.get(storeName, key);
}

export async function putInStore(storeName, value) {
  const db = await getDB();
  return db.put(storeName, value);
}

export async function deleteFromStore(storeName, key) {
  const db = await getDB();
  return db.delete(storeName, key);
}

export async function clearStore(storeName) {
  const db = await getDB();
  return db.clear(storeName);
}

// Bulk operations
export async function bulkPutInStore(storeName, items) {
  const db = await getDB();
  const tx = db.transaction(storeName, "readwrite");
  await Promise.all([...items.map(item => tx.store.put(item)), tx.done]);
}

// Query by index
export async function getByIndex(storeName, indexName, value) {
  const db = await getDB();
  return db.getAllFromIndex(storeName, indexName, value);
}

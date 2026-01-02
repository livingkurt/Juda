import { openDB } from "idb";

const DB_NAME = "juda-db";
const DB_VERSION = 1;

// Database schema matching Drizzle tables
const STORES = {
  TASKS: "tasks",
  TAGS: "tags",
  SECTIONS: "sections",
  TASK_TAGS: "taskTags",
  QUERY_CACHE: "queryCache",
  SYNC_QUEUE: "syncQueue",
};

/**
 * Initialize IndexedDB database
 */
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Tasks store
      if (!db.objectStoreNames.contains(STORES.TASKS)) {
        const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: "id" });
        taskStore.createIndex("userId", "userId", { unique: false });
        taskStore.createIndex("sectionId", "sectionId", { unique: false });
        taskStore.createIndex("parentId", "parentId", { unique: false });
        taskStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Tags store
      if (!db.objectStoreNames.contains(STORES.TAGS)) {
        const tagStore = db.createObjectStore(STORES.TAGS, { keyPath: "id" });
        tagStore.createIndex("userId", "userId", { unique: false });
        tagStore.createIndex("name", "name", { unique: false });
      }

      // Sections store
      if (!db.objectStoreNames.contains(STORES.SECTIONS)) {
        const sectionStore = db.createObjectStore(STORES.SECTIONS, { keyPath: "id" });
        sectionStore.createIndex("userId", "userId", { unique: false });
        sectionStore.createIndex("order", "order", { unique: false });
      }

      // TaskTags junction store
      if (!db.objectStoreNames.contains(STORES.TASK_TAGS)) {
        const taskTagStore = db.createObjectStore(STORES.TASK_TAGS, { keyPath: "id" });
        taskTagStore.createIndex("taskId", "taskId", { unique: false });
        taskTagStore.createIndex("tagId", "tagId", { unique: false });
        taskTagStore.createIndex("composite", ["taskId", "tagId"], { unique: true });
      }

      // Query cache store (for caching RTK Query results)
      if (!db.objectStoreNames.contains(STORES.QUERY_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.QUERY_CACHE, { keyPath: "key" });
        cacheStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Sync queue store (for offline mutations)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id", autoIncrement: true });
        syncStore.createIndex("timestamp", "timestamp", { unique: false });
        syncStore.createIndex("type", "type", { unique: false });
        syncStore.createIndex("status", "status", { unique: false });
      }
    },
  });

  return db;
}

/**
 * Get database instance
 */
let dbInstance = null;
export async function getDB() {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
}

/**
 * Tasks CRUD operations
 */
export const taskDB = {
  async getAll(userId) {
    const db = await getDB();
    const index = db.transaction(STORES.TASKS, "readonly").store.index("userId");
    return index.getAll(userId);
  },

  async get(id) {
    const db = await getDB();
    return db.get(STORES.TASKS, id);
  },

  async put(task) {
    const db = await getDB();
    return db.put(STORES.TASKS, task);
  },

  async putAll(tasks) {
    const db = await getDB();
    const tx = db.transaction(STORES.TASKS, "readwrite");
    await Promise.all(tasks.map(task => tx.store.put(task)));
    return tx.done;
  },

  async delete(id) {
    const db = await getDB();
    return db.delete(STORES.TASKS, id);
  },

  async clear() {
    const db = await getDB();
    return db.clear(STORES.TASKS);
  },
};

/**
 * Tags CRUD operations
 */
export const tagDB = {
  async getAll(userId) {
    const db = await getDB();
    const index = db.transaction(STORES.TAGS, "readonly").store.index("userId");
    return index.getAll(userId);
  },

  async get(id) {
    const db = await getDB();
    return db.get(STORES.TAGS, id);
  },

  async put(tag) {
    const db = await getDB();
    return db.put(STORES.TAGS, tag);
  },

  async putAll(tags) {
    const db = await getDB();
    const tx = db.transaction(STORES.TAGS, "readwrite");
    await Promise.all(tags.map(tag => tx.store.put(tag)));
    return tx.done;
  },

  async delete(id) {
    const db = await getDB();
    return db.delete(STORES.TAGS, id);
  },

  async clear() {
    const db = await getDB();
    return db.clear(STORES.TAGS);
  },
};

/**
 * Sections CRUD operations
 */
export const sectionDB = {
  async getAll(userId) {
    const db = await getDB();
    const index = db.transaction(STORES.SECTIONS, "readonly").store.index("userId");
    return index.getAll(userId);
  },

  async get(id) {
    const db = await getDB();
    return db.get(STORES.SECTIONS, id);
  },

  async put(section) {
    const db = await getDB();
    return db.put(STORES.SECTIONS, section);
  },

  async putAll(sections) {
    const db = await getDB();
    const tx = db.transaction(STORES.SECTIONS, "readwrite");
    await Promise.all(sections.map(section => tx.store.put(section)));
    return tx.done;
  },

  async delete(id) {
    const db = await getDB();
    return db.delete(STORES.SECTIONS, id);
  },

  async clear() {
    const db = await getDB();
    return db.clear(STORES.SECTIONS);
  },
};

/**
 * Query cache operations
 */
export const queryCacheDB = {
  async get(key) {
    const db = await getDB();
    const cached = await db.get(STORES.QUERY_CACHE, key);
    if (!cached) return null;

    // Check if cache is expired (default: 5 minutes)
    const maxAge = 5 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      await this.delete(key);
      return null;
    }

    return cached.data;
  },

  async set(key, data) {
    const db = await getDB();
    return db.put(STORES.QUERY_CACHE, {
      key,
      data,
      timestamp: Date.now(),
    });
  },

  async delete(key) {
    const db = await getDB();
    return db.delete(STORES.QUERY_CACHE, key);
  },

  async clear() {
    const db = await getDB();
    return db.clear(STORES.QUERY_CACHE);
  },
};

/**
 * Sync queue operations
 */
export const syncQueueDB = {
  async getAll(status = null) {
    const db = await getDB();
    const store = db.transaction(STORES.SYNC_QUEUE, "readonly").store;

    if (status) {
      const index = store.index("status");
      return index.getAll(status);
    }

    return store.getAll();
  },

  async add(mutation) {
    const db = await getDB();
    return db.add(STORES.SYNC_QUEUE, {
      ...mutation,
      timestamp: Date.now(),
      status: "pending",
      retries: 0,
    });
  },

  async update(id, updates) {
    const db = await getDB();
    const existing = await db.get(STORES.SYNC_QUEUE, id);
    if (!existing) return;

    return db.put(STORES.SYNC_QUEUE, {
      ...existing,
      ...updates,
    });
  },

  async delete(id) {
    const db = await getDB();
    return db.delete(STORES.SYNC_QUEUE, id);
  },

  async clear() {
    const db = await getDB();
    return db.clear(STORES.SYNC_QUEUE);
  },
};

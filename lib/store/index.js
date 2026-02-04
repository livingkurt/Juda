"use client";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi.js";
import uiReducer from "./slices/uiSlice.js";
import offlineReducer from "./slices/offlineSlice.js";
import sectionExpansionReducer from "./slices/sectionExpansionSlice.js";
import syncReducer from "./slices/syncSlice.js";
import snackbarReducer from "./slices/snackbarSlice.js";
import { offlineMiddleware } from "./offlineMiddleware.js";

// Middleware to normalize Date objects in actions to ISO strings
const dateNormalizationMiddleware = () => next => action => {
  // Normalize Date objects in action payload to ISO strings
  if (action.payload instanceof Date) {
    return next({
      ...action,
      payload: action.payload.toISOString(),
    });
  }
  return next(action);
};

// Helper to sanitize large arrays/objects for DevTools
const sanitizeLargeData = (data, maxSize = 100) => {
  if (Array.isArray(data)) {
    if (data.length > maxSize) {
      return {
        __sanitized: true,
        length: data.length,
        preview: data.slice(0, 10),
        message: `Array with ${data.length} items (showing first 10)`,
      };
    }
    return data.map(item => sanitizeLargeData(item, maxSize));
  }
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length > maxSize) {
      const preview = {};
      let count = 0;
      for (const key of keys) {
        if (count >= 10) break;
        preview[key] = sanitizeLargeData(data[key], maxSize);
        count++;
      }
      return {
        __sanitized: true,
        keyCount: keys.length,
        preview,
        message: `Object with ${keys.length} keys (showing first 10)`,
      };
    }
    const sanitized = {};
    for (const key of keys) {
      sanitized[key] = sanitizeLargeData(data[key], maxSize);
    }
    return sanitized;
  }
  return data;
};

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
    offline: offlineReducer,
    sectionExpansion: sectionExpansionReducer,
    sync: syncReducer,
    snackbar: snackbarReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // DISABLED for performance - these checks are very slow with large state
      serializableCheck: false,
      immutableCheck: false,
    })
      .concat(dateNormalizationMiddleware)
      .concat(baseApi.middleware)
      .concat(offlineMiddleware),
  devTools: {
    // Sanitize actions to prevent large payloads from being serialized
    actionSanitizer: (action, _id) => {
      // Sanitize RTK Query actions that might contain large data
      if (action.type?.startsWith("api/executeQuery") || action.type?.startsWith("api/executeMutation")) {
        if (action.payload && typeof action.payload === "object") {
          return {
            ...action,
            payload: sanitizeLargeData(action.payload, 50),
          };
        }
      }
      // Sanitize any action with large arrays/objects
      if (action.payload && typeof action.payload === "object") {
        const serialized = JSON.stringify(action.payload);
        if (serialized.length > 10000) {
          return {
            ...action,
            payload: sanitizeLargeData(action.payload, 50),
          };
        }
      }
      return action;
    },
    // Sanitize state to prevent large cache entries from being serialized
    stateSanitizer: (state, _action) => {
      if (!state) return state;
      const sanitized = { ...state };
      // Sanitize RTK Query cache (often contains large datasets)
      if (sanitized.api && sanitized.api.queries) {
        const queries = {};
        for (const [key, value] of Object.entries(sanitized.api.queries)) {
          if (value?.data) {
            queries[key] = {
              ...value,
              data: sanitizeLargeData(value.data, 100),
            };
          } else {
            queries[key] = value;
          }
        }
        sanitized.api = {
          ...sanitized.api,
          queries,
        };
      }
      // Sanitize RTK Query mutations cache
      if (sanitized.api && sanitized.api.mutations) {
        const mutations = {};
        for (const [key, value] of Object.entries(sanitized.api.mutations)) {
          if (value?.data) {
            mutations[key] = {
              ...value,
              data: sanitizeLargeData(value.data, 50),
            };
          } else {
            mutations[key] = value;
          }
        }
        sanitized.api = {
          ...sanitized.api,
          mutations,
        };
      }
      return sanitized;
    },
    // Limit the number of actions stored in history
    maxAge: 50,
    // Only serialize state in development
    serialize: process.env.NODE_ENV === "development",
  },
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

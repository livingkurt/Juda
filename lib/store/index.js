"use client";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi.js";
import uiReducer from "./slices/uiSlice.js";
import offlineReducer from "./slices/offlineSlice.js";
import sectionExpansionReducer from "./slices/sectionExpansionSlice.js";
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

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: uiReducer,
    offline: offlineReducer,
    sectionExpansion: sectionExpansionReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Date objects in actions (they're normalized by middleware)
        ignoredActions: ["ui/setJournalSelectedDate", "ui/setSelectedDate", "ui/setTodayViewDate"],
      },
    })
      .concat(dateNormalizationMiddleware)
      .concat(baseApi.middleware)
      .concat(offlineMiddleware),
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

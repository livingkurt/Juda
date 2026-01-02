import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./api/baseApi.js";
import { persistenceMiddleware } from "./middleware/persistence.js";
import { syncMiddleware } from "./middleware/syncMiddleware.js";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ["persist/REHYDRATE", "persist/PERSIST"],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["meta.arg", "meta.baseQueryMeta"],
        // Ignore these paths in the state
        ignoredPaths: ["api"],
      },
    })
      .concat(baseApi.middleware)
      .concat(persistenceMiddleware)
      .concat(syncMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

// Enable refetchOnFocus and refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Set store reference for sync middleware
if (typeof window !== "undefined" && window.__setSyncStore) {
  window.__setSyncStore(store);
}

// Note: For proper TypeScript support, use these hooks:
// import { useDispatch, useSelector } from 'react-redux';
// const dispatch = useDispatch();
// const tasks = useSelector(state => state.api.queries['getTasks(undefined)']?.data);

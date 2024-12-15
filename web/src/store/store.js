import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import reminderReducer from "./slices/reminderSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    reminders: reminderReducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ["auth/setUser"],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["payload.user"],
        // Ignore these paths in the state
        ignoredPaths: ["auth.user"],
      },
    }),
});

export default store;

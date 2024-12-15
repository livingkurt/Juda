import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import reminderReducer from "./reminderSlice";
import uiReducer from "./uiSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    reminders: reminderReducer,
    ui: uiReducer,
  },
});

export default store;

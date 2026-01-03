"use client";

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingSyncCount: 0,
  lastSyncTimestamp: null,
  syncInProgress: false,
  syncError: null,
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },
    setPendingSyncCount: (state, action) => {
      state.pendingSyncCount = action.payload;
    },
    setSyncInProgress: (state, action) => {
      state.syncInProgress = action.payload;
    },
    setSyncError: (state, action) => {
      state.syncError = action.payload;
    },
    setLastSyncTimestamp: (state, action) => {
      state.lastSyncTimestamp = action.payload;
    },
    incrementPendingSync: state => {
      state.pendingSyncCount += 1;
    },
    decrementPendingSync: state => {
      state.pendingSyncCount = Math.max(0, state.pendingSyncCount - 1);
    },
  },
});

export const {
  setOnlineStatus,
  setPendingSyncCount,
  setSyncInProgress,
  setSyncError,
  setLastSyncTimestamp,
  incrementPendingSync,
  decrementPendingSync,
} = offlineSlice.actions;

export default offlineSlice.reducer;

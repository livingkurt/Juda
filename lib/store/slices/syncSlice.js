"use client";

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connectionStatus: "disconnected", // "connected" | "disconnected" | "reconnecting" | "failed"
  reconnectAttempt: 0,
  lastSyncTimestamp: null,
  recentSyncs: [], // Array of recent sync events for UI feedback
  syncingCount: 0, // Number of items currently being synced
};

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload.status;
      if (action.payload.attempt !== undefined) {
        state.reconnectAttempt = action.payload.attempt;
      }
    },
    addRecentSync: (state, action) => {
      const sync = {
        id: Date.now(),
        ...action.payload,
        timestamp: Date.now(),
      };
      // Keep only last 5 syncs
      state.recentSyncs = [sync, ...state.recentSyncs.slice(0, 4)];
      state.lastSyncTimestamp = sync.timestamp;
    },
    clearRecentSync: (state, action) => {
      state.recentSyncs = state.recentSyncs.filter(s => s.id !== action.payload);
    },
    clearAllSyncs: state => {
      state.recentSyncs = [];
    },
    incrementSyncingCount: state => {
      state.syncingCount += 1;
    },
    decrementSyncingCount: state => {
      state.syncingCount = Math.max(0, state.syncingCount - 1);
    },
  },
});

export const {
  setConnectionStatus,
  addRecentSync,
  clearRecentSync,
  clearAllSyncs,
  incrementSyncingCount,
  decrementSyncingCount,
} = syncSlice.actions;

export default syncSlice.reducer;

// Selectors
export const selectConnectionStatus = state => state.sync.connectionStatus;
export const selectRecentSyncs = state => state.sync.recentSyncs;
export const selectLastSyncTimestamp = state => state.sync.lastSyncTimestamp;
export const selectSyncingCount = state => state.sync.syncingCount;
export const selectIsConnected = state => state.sync.connectionStatus === "connected";

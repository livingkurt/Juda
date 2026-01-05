"use client";

import { createSlice } from "@reduxjs/toolkit";

const snackbarSlice = createSlice({
  name: "snackbar",
  initialState: {
    open: false,
    message: "",
    severity: "success", // "success" | "info" | "warning" | "error"
    horizontal: "center",
    vertical: "top",
    duration: 4000,
  },
  reducers: {
    showSuccess: (state, { payload }) => {
      state.open = true;
      state.message = payload.message;
      state.severity = "success";
      state.duration = payload.duration || 4000;
      state.horizontal = payload.horizontal || "center";
      state.vertical = payload.vertical || "top";
    },
    showInfo: (state, { payload }) => {
      state.open = true;
      state.message = payload.message;
      state.severity = "info";
      state.duration = payload.duration || 4000;
      state.horizontal = payload.horizontal || "center";
      state.vertical = payload.vertical || "top";
    },
    showWarning: (state, { payload }) => {
      state.open = true;
      state.message = payload.message;
      state.severity = "warning";
      state.duration = payload.duration || 4000;
      state.horizontal = payload.horizontal || "center";
      state.vertical = payload.vertical || "top";
    },
    showError: (state, { payload }) => {
      state.open = true;
      state.message = payload.message;
      state.severity = "error";
      state.duration = payload.duration || 4000;
      state.horizontal = payload.horizontal || "center";
      state.vertical = payload.vertical || "top";
    },
    hideSnackbar: state => {
      state.open = false;
      state.message = "";
    },
  },
});

export const { showSuccess, showInfo, showWarning, showError, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;

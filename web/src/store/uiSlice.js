import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  theme: "light",
  sidebarOpen: true,
  dialogs: {
    createReminder: false,
    editReminder: false,
    deleteReminder: false,
    settings: false,
  },
  snackbar: {
    open: false,
    message: "",
    severity: "info", // success, error, warning, info
  },
  view: {
    type: "list", // list, grid, calendar
    groupBy: "none", // none, date, status
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleTheme: state => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    toggleSidebar: state => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    setDialog: (state, action) => {
      const { dialog, open } = action.payload;
      state.dialogs[dialog] = open;
    },
    setSnackbar: (state, action) => {
      state.snackbar = { ...state.snackbar, ...action.payload };
    },
    closeSnackbar: state => {
      state.snackbar.open = false;
    },
    setView: (state, action) => {
      state.view = { ...state.view, ...action.payload };
    },
  },
});

export const {
  toggleTheme,
  toggleSidebar,
  setSidebarOpen,
  setDialog,
  setSnackbar,
  closeSnackbar,
  setView,
} = uiSlice.actions;

export default uiSlice.reducer;

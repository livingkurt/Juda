import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  reminders: [],
  selectedReminder: null,
  loading: false,
  error: null,
  filters: {
    status: "all", // all, completed, pending
    date: "today", // today, week, month, all
    search: "",
  },
  sort: {
    field: "start_time",
    direction: "asc",
  },
  stats: {
    total: 0,
    completed: 0,
    completion_rate: 0,
    current_streak: 0,
    longest_streak: 0,
  },
};

const reminderSlice = createSlice({
  name: "reminders",
  initialState,
  reducers: {
    setReminders: (state, action) => {
      state.reminders = action.payload;
      state.loading = false;
      state.error = null;
    },
    addReminder: (state, action) => {
      state.reminders.push(action.payload);
    },
    updateReminder: (state, action) => {
      const index = state.reminders.findIndex(
        r => r._id === action.payload._id
      );
      if (index !== -1) {
        state.reminders[index] = action.payload;
      }
    },
    deleteReminder: (state, action) => {
      state.reminders = state.reminders.filter(r => r._id !== action.payload);
    },
    setSelectedReminder: (state, action) => {
      state.selectedReminder = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: state => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setSort: (state, action) => {
      state.sort = action.payload;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
    },
    toggleCompletion: (state, action) => {
      const reminder = state.reminders.find(
        r => r._id === action.payload.reminderId
      );
      if (reminder) {
        reminder.completion_status = action.payload.status;
        reminder.completion_time = action.payload.time;
      }
    },
    clearReminders: state => {
      state.reminders = [];
      state.selectedReminder = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  setSelectedReminder,
  setLoading,
  setError,
  clearError,
  setFilters,
  setSort,
  setStats,
  toggleCompletion,
  clearReminders,
} = reminderSlice.actions;

export default reminderSlice.reducer;

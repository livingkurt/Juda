"use client";

import { createSlice } from "@reduxjs/toolkit";

// Helper to get initial date (avoids hydration mismatch)
const getInitialDate = () => {
  if (typeof window === "undefined") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

const initialState = {
  // Dialog states
  taskDialogOpen: false,
  sectionDialogOpen: false,
  tagEditorOpen: false,
  workoutModalOpen: false,
  bulkEditDialogOpen: false,

  // Editing state
  editingTask: null,
  editingSection: null,
  workoutModalTask: null,
  editingWorkoutTask: null,

  // Default values for new items
  defaultSectionId: null,
  defaultTime: null,
  defaultDate: null,

  // Selection state
  selectedTaskIds: [],

  // View state - Tabs
  mainTabIndex: 0, // 0 = Tasks, 1 = Kanban, 2 = Journal, 3 = Notes, 4 = History
  mobileActiveView: "today", // "backlog" | "today" | "calendar"

  // View state - Dates (stored as ISO strings for serialization)
  selectedDate: getInitialDate(),
  todayViewDate: getInitialDate(),

  // View state - Calendar
  calendarView: "day", // "day" | "week" | "month" | "year"

  // View state - Journal
  journalView: "day", // "day" | "week" | "month" | "year"
  journalSelectedDate: getInitialDate(),

  // View state - Search/Filter
  todaySearchTerm: "",
  todaySelectedTagIds: [],
  backlogSearchTerm: "",
  backlogSelectedTagIds: [],
  calendarSearchTerm: "",
  calendarSelectedTagIds: [],

  // Panel visibility
  backlogOpen: false,
  showDashboard: true,
  showCalendar: true,
  notesSidebarOpen: true,
  notesListOpen: true,

  // Panel widths (in pixels)
  backlogWidth: 400,
  todayViewWidth: 600,
  notesSidebarWidth: 300,
  notesListWidth: 300,

  // Recently completed tasks (for delayed hiding)
  recentlyCompletedTasks: [],

  // Kanban view search/filter
  kanbanSearchTerm: "",
  kanbanSelectedTagIds: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Dialog actions
    openTaskDialog: state => {
      state.taskDialogOpen = true;
    },
    closeTaskDialog: state => {
      state.taskDialogOpen = false;
      state.editingTask = null;
      state.defaultSectionId = null;
      state.defaultTime = null;
      state.defaultDate = null;
    },
    openSectionDialog: state => {
      state.sectionDialogOpen = true;
    },
    closeSectionDialog: state => {
      state.sectionDialogOpen = false;
      state.editingSection = null;
    },
    setTagEditorOpen: (state, action) => {
      state.tagEditorOpen = action.payload;
    },
    openBulkEditDialog: state => {
      state.bulkEditDialogOpen = true;
    },
    closeBulkEditDialog: state => {
      state.bulkEditDialogOpen = false;
    },

    // Workout modal
    openWorkoutModal: (state, action) => {
      state.workoutModalOpen = true;
      state.workoutModalTask = action.payload;
    },
    closeWorkoutModal: state => {
      state.workoutModalOpen = false;
      state.workoutModalTask = null;
    },

    // Editing state
    setEditingTask: (state, action) => {
      state.editingTask = action.payload;
    },
    setEditingSection: (state, action) => {
      state.editingSection = action.payload;
    },
    setEditingWorkoutTask: (state, action) => {
      state.editingWorkoutTask = action.payload;
    },
    setDefaultSectionId: (state, action) => {
      state.defaultSectionId = action.payload;
    },
    setDefaultTime: (state, action) => {
      state.defaultTime = action.payload;
    },
    setDefaultDate: (state, action) => {
      state.defaultDate = action.payload;
    },

    // Selection
    setSelectedTaskIds: (state, action) => {
      state.selectedTaskIds = action.payload;
    },
    toggleTaskSelection: (state, action) => {
      const taskId = action.payload;
      const index = state.selectedTaskIds.indexOf(taskId);
      if (index === -1) {
        state.selectedTaskIds.push(taskId);
      } else {
        state.selectedTaskIds.splice(index, 1);
      }
    },
    clearSelection: state => {
      state.selectedTaskIds = [];
    },

    // Tab state
    setMainTabIndex: (state, action) => {
      state.mainTabIndex = action.payload;
    },
    setMobileActiveView: (state, action) => {
      state.mobileActiveView = action.payload;
    },

    // Date state (accepts Date objects or ISO strings)
    setSelectedDate: (state, action) => {
      const date = action.payload;
      state.selectedDate = date instanceof Date ? date.toISOString() : date;
    },
    setTodayViewDate: (state, action) => {
      const date = action.payload;
      state.todayViewDate = date instanceof Date ? date.toISOString() : date;
    },

    // Calendar view
    setCalendarView: (state, action) => {
      state.calendarView = action.payload;
    },

    // Journal view
    setJournalView: (state, action) => {
      state.journalView = action.payload;
    },
    setJournalSelectedDate: (state, action) => {
      const date = action.payload;
      // Convert Date objects to ISO strings for serialization
      state.journalSelectedDate = date instanceof Date ? date.toISOString() : date;
    },

    // Search/filter
    setTodaySearchTerm: (state, action) => {
      state.todaySearchTerm = action.payload;
    },
    setTodaySelectedTagIds: (state, action) => {
      state.todaySelectedTagIds = action.payload;
    },
    addTodaySelectedTag: (state, action) => {
      if (!state.todaySelectedTagIds.includes(action.payload)) {
        state.todaySelectedTagIds.push(action.payload);
      }
    },
    removeTodaySelectedTag: (state, action) => {
      state.todaySelectedTagIds = state.todaySelectedTagIds.filter(id => id !== action.payload);
    },
    setBacklogSearchTerm: (state, action) => {
      state.backlogSearchTerm = action.payload;
    },
    setBacklogSelectedTagIds: (state, action) => {
      state.backlogSelectedTagIds = action.payload;
    },
    setCalendarSearchTerm: (state, action) => {
      state.calendarSearchTerm = action.payload;
    },
    setCalendarSelectedTagIds: (state, action) => {
      state.calendarSelectedTagIds = action.payload;
    },
    addCalendarSelectedTag: (state, action) => {
      if (!state.calendarSelectedTagIds.includes(action.payload)) {
        state.calendarSelectedTagIds.push(action.payload);
      }
    },
    removeCalendarSelectedTag: (state, action) => {
      state.calendarSelectedTagIds = state.calendarSelectedTagIds.filter(id => id !== action.payload);
    },

    // Panel visibility
    setBacklogOpen: (state, action) => {
      state.backlogOpen = action.payload;
    },
    toggleBacklogOpen: state => {
      state.backlogOpen = !state.backlogOpen;
    },
    setShowDashboard: (state, action) => {
      state.showDashboard = action.payload;
    },
    toggleShowDashboard: state => {
      state.showDashboard = !state.showDashboard;
    },
    setShowCalendar: (state, action) => {
      state.showCalendar = action.payload;
    },
    toggleShowCalendar: state => {
      state.showCalendar = !state.showCalendar;
    },
    setNotesSidebarOpen: (state, action) => {
      state.notesSidebarOpen = action.payload;
    },
    toggleNotesSidebarOpen: state => {
      state.notesSidebarOpen = !state.notesSidebarOpen;
    },
    setNotesListOpen: (state, action) => {
      state.notesListOpen = action.payload;
    },
    toggleNotesListOpen: state => {
      state.notesListOpen = !state.notesListOpen;
    },

    // Panel widths
    setBacklogWidth: (state, action) => {
      state.backlogWidth = action.payload;
    },
    setTodayViewWidth: (state, action) => {
      state.todayViewWidth = action.payload;
    },
    setNotesSidebarWidth: (state, action) => {
      state.notesSidebarWidth = action.payload;
    },
    setNotesListWidth: (state, action) => {
      state.notesListWidth = action.payload;
    },

    // Recently completed tasks
    addRecentlyCompletedTask: (state, action) => {
      if (!state.recentlyCompletedTasks.includes(action.payload)) {
        state.recentlyCompletedTasks.push(action.payload);
      }
    },
    removeRecentlyCompletedTask: (state, action) => {
      state.recentlyCompletedTasks = state.recentlyCompletedTasks.filter(id => id !== action.payload);
    },
    clearRecentlyCompletedTasks: state => {
      state.recentlyCompletedTasks = [];
    },

    // Kanban search/filter
    setKanbanSearchTerm: (state, action) => {
      state.kanbanSearchTerm = action.payload;
    },
    setKanbanSelectedTagIds: (state, action) => {
      state.kanbanSelectedTagIds = action.payload;
    },
    addKanbanSelectedTag: (state, action) => {
      if (!state.kanbanSelectedTagIds.includes(action.payload)) {
        state.kanbanSelectedTagIds.push(action.payload);
      }
    },
    removeKanbanSelectedTag: (state, action) => {
      state.kanbanSelectedTagIds = state.kanbanSelectedTagIds.filter(id => id !== action.payload);
    },
  },
});

export const {
  // Dialogs
  openTaskDialog,
  closeTaskDialog,
  openSectionDialog,
  closeSectionDialog,
  setTagEditorOpen,
  openBulkEditDialog,
  closeBulkEditDialog,
  openWorkoutModal,
  closeWorkoutModal,

  // Editing state
  setEditingTask,
  setEditingSection,
  setEditingWorkoutTask,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,

  // Selection
  setSelectedTaskIds,
  toggleTaskSelection,
  clearSelection,

  // Tabs
  setMainTabIndex,
  setMobileActiveView,

  // Dates
  setSelectedDate,
  setTodayViewDate,

  // Calendar view
  setCalendarView,

  // Journal view
  setJournalView,
  setJournalSelectedDate,

  // Search/filter
  setTodaySearchTerm,
  setTodaySelectedTagIds,
  addTodaySelectedTag,
  removeTodaySelectedTag,
  setBacklogSearchTerm,
  setBacklogSelectedTagIds,
  setCalendarSearchTerm,
  setCalendarSelectedTagIds,
  addCalendarSelectedTag,
  removeCalendarSelectedTag,

  // Panel visibility
  setBacklogOpen,
  toggleBacklogOpen,
  setShowDashboard,
  toggleShowDashboard,
  setShowCalendar,
  toggleShowCalendar,
  setNotesSidebarOpen,
  toggleNotesSidebarOpen,
  setNotesListOpen,
  toggleNotesListOpen,

  // Panel widths
  setBacklogWidth,
  setTodayViewWidth,
  setNotesSidebarWidth,
  setNotesListWidth,

  // Recently completed tasks
  addRecentlyCompletedTask,
  removeRecentlyCompletedTask,
  clearRecentlyCompletedTasks,

  // Kanban search/filter
  setKanbanSearchTerm,
  setKanbanSelectedTagIds,
  addKanbanSelectedTag,
  removeKanbanSelectedTag,
} = uiSlice.actions;

export default uiSlice.reducer;

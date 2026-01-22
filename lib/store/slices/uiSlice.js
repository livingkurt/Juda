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
  clickedRecurringDate: null, // For recurring task edits - the date that was clicked

  // Selection state
  selectedTaskIds: [],

  // View state - Tabs
  mainTabIndex: 0, // 0 = Tasks, 1 = Kanban, 2 = Journal, 3 = Notes, 4 = Workout, 5 = History
  mobileActiveView: "today", // "backlog" | "today" | "calendar"
  notesActiveMobileView: "notes", // "folders" | "notes" | "editor"

  // View state - Notes
  selectedNoteId: null,
  selectedFolderId: null,
  selectedSmartFolderId: null,

  // View state - Dates (stored as ISO strings for serialization)
  selectedDate: getInitialDate(),
  todayViewDate: getInitialDate(),

  // View state - Calendar
  calendarView: "day", // "day" | "week" | "month" | "year"

  // View state - Journal
  journalView: "day", // "day" | "week" | "month" | "year"
  journalSelectedDate: getInitialDate(),

  // View state - History
  historyRange: "month",
  historyPage: 0,
  historySearchTerm: "",

  // View state - Workout
  selectedWorkoutTaskId: null,
  workoutViewMode: "calendar", // "calendar" | "exercises"
  workoutDateRange: { start: null, end: null },

  // View state - Search/Filter
  todaySearchTerm: "",
  todaySelectedTagIds: [],
  backlogSearchTerm: "",
  backlogSelectedTagIds: [],
  backlogSelectedPriorities: [],
  backlogSortByPriority: true,
  calendarSearchTerm: "",
  calendarSelectedTagIds: [],

  // Panel visibility
  backlogOpen: false,
  backlogTagSidebarOpen: true,
  mainContentView: "today", // "today" | "calendar"
  notesSidebarOpen: true,
  notesListOpen: true,

  // Panel widths (in pixels)
  backlogWidth: 400,
  notesSidebarWidth: 300,
  notesListWidth: 300,

  // Recently completed tasks (for delayed hiding)
  recentlyCompletedTasks: [],

  // Kanban view search/filter
  kanbanSearchTerm: "",
  kanbanSelectedTagIds: [],
  kanbanSelectedPriorities: [],
  kanbanViewDate: null, // Off by default - user must enable date filter
  kanbanShowTodayComplete: true,
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
      state.clickedRecurringDate = null;
    },
    // Combined action for editing a task - sets all state and opens dialog atomically
    // This prevents race conditions where the dialog opens before all state is set
    openEditTaskDialog: (state, action) => {
      const { task, defaultDate, clickedRecurringDate } = action.payload;
      state.editingTask = task;
      state.defaultSectionId = null;
      state.defaultTime = null;
      state.defaultDate = defaultDate || null;
      state.clickedRecurringDate = clickedRecurringDate || null;
      state.taskDialogOpen = true;
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
    setClickedRecurringDate: (state, action) => {
      state.clickedRecurringDate = action.payload;
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
    setNotesActiveMobileView: (state, action) => {
      state.notesActiveMobileView = action.payload;
    },
    setSelectedNoteId: (state, action) => {
      state.selectedNoteId = action.payload;
    },
    setSelectedFolderId: (state, action) => {
      state.selectedFolderId = action.payload;
    },
    setSelectedSmartFolderId: (state, action) => {
      state.selectedSmartFolderId = action.payload;
    },
    clearNotesSelection: state => {
      state.selectedNoteId = null;
      state.selectedFolderId = null;
      state.selectedSmartFolderId = null;
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

    // History view
    setHistoryRange: (state, action) => {
      state.historyRange = action.payload;
    },
    setHistoryPage: (state, action) => {
      state.historyPage = action.payload;
    },
    setHistorySearchTerm: (state, action) => {
      state.historySearchTerm = action.payload;
    },

    // Workout view
    setSelectedWorkoutTaskId: (state, action) => {
      state.selectedWorkoutTaskId = action.payload;
    },
    setWorkoutViewMode: (state, action) => {
      state.workoutViewMode = action.payload;
    },
    setWorkoutDateRange: (state, action) => {
      state.workoutDateRange = action.payload;
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
    setBacklogSelectedPriorities: (state, action) => {
      state.backlogSelectedPriorities = action.payload;
    },
    toggleBacklogSortByPriority: state => {
      state.backlogSortByPriority = !state.backlogSortByPriority;
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
    setBacklogTagSidebarOpen: (state, action) => {
      state.backlogTagSidebarOpen = action.payload;
    },
    toggleBacklogTagSidebarOpen: state => {
      state.backlogTagSidebarOpen = !state.backlogTagSidebarOpen;
    },
    setMainContentView: (state, action) => {
      state.mainContentView = action.payload;
    },
    // Backward-compatible setters (computed) during migration
    setShowDashboard: (state, action) => {
      state.mainContentView = action.payload ? "today" : "calendar";
    },
    setShowCalendar: (state, action) => {
      state.mainContentView = action.payload ? "calendar" : "today";
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
    setKanbanSelectedPriorities: (state, action) => {
      state.kanbanSelectedPriorities = action.payload;
    },
    addKanbanSelectedTag: (state, action) => {
      if (!state.kanbanSelectedTagIds.includes(action.payload)) {
        state.kanbanSelectedTagIds.push(action.payload);
      }
    },
    removeKanbanSelectedTag: (state, action) => {
      state.kanbanSelectedTagIds = state.kanbanSelectedTagIds.filter(id => id !== action.payload);
    },
    setKanbanViewDate: (state, action) => {
      const date = action.payload;
      state.kanbanViewDate = date instanceof Date ? date.toISOString() : date;
    },
    setKanbanShowTodayComplete: (state, action) => {
      state.kanbanShowTodayComplete = action.payload;
    },
  },
});

export const {
  // Dialogs
  openTaskDialog,
  closeTaskDialog,
  openEditTaskDialog,
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
  setClickedRecurringDate,

  // Selection
  setSelectedTaskIds,
  toggleTaskSelection,
  clearSelection,

  // Tabs
  setMainTabIndex,
  setMobileActiveView,
  setNotesActiveMobileView,
  setSelectedNoteId,
  setSelectedFolderId,
  setSelectedSmartFolderId,
  clearNotesSelection,

  // Dates
  setSelectedDate,
  setTodayViewDate,

  // Calendar view
  setCalendarView,

  // Journal view
  setJournalView,
  setJournalSelectedDate,
  setHistoryRange,
  setHistoryPage,
  setHistorySearchTerm,
  setSelectedWorkoutTaskId,
  setWorkoutViewMode,
  setWorkoutDateRange,

  // Search/filter
  setTodaySearchTerm,
  setTodaySelectedTagIds,
  addTodaySelectedTag,
  removeTodaySelectedTag,
  setBacklogSearchTerm,
  setBacklogSelectedTagIds,
  setBacklogSelectedPriorities,
  toggleBacklogSortByPriority,
  setCalendarSearchTerm,
  setCalendarSelectedTagIds,
  addCalendarSelectedTag,
  removeCalendarSelectedTag,

  // Panel visibility
  setBacklogOpen,
  toggleBacklogOpen,
  setBacklogTagSidebarOpen,
  toggleBacklogTagSidebarOpen,
  setMainContentView,
  setShowDashboard,
  setShowCalendar,
  setNotesSidebarOpen,
  toggleNotesSidebarOpen,
  setNotesListOpen,
  toggleNotesListOpen,

  // Panel widths
  setBacklogWidth,
  setNotesSidebarWidth,
  setNotesListWidth,

  // Recently completed tasks
  addRecentlyCompletedTask,
  removeRecentlyCompletedTask,
  clearRecentlyCompletedTasks,

  // Kanban search/filter
  setKanbanSearchTerm,
  setKanbanSelectedTagIds,
  setKanbanSelectedPriorities,
  addKanbanSelectedTag,
  removeKanbanSelectedTag,
  setKanbanViewDate,
  setKanbanShowTodayComplete,
} = uiSlice.actions;

export default uiSlice.reducer;

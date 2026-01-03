"use client";

import { createSlice } from "@reduxjs/toolkit";

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

  // Default values for new items
  defaultSectionId: null,
  defaultTime: null,
  defaultDate: null,

  // Selection state
  selectedTaskIds: [],

  // View state (search/filter)
  todaySearchTerm: "",
  todaySelectedTagIds: [],
  backlogSearchTerm: "",
  backlogSelectedTagIds: [],
  calendarSearchTerm: "",
  calendarSelectedTagIds: [],
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

    // Search/filter
    setTodaySearchTerm: (state, action) => {
      state.todaySearchTerm = action.payload;
    },
    setTodaySelectedTagIds: (state, action) => {
      state.todaySelectedTagIds = action.payload;
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
  },
});

export const {
  openTaskDialog,
  closeTaskDialog,
  openSectionDialog,
  closeSectionDialog,
  setTagEditorOpen,
  openBulkEditDialog,
  closeBulkEditDialog,
  openWorkoutModal,
  closeWorkoutModal,
  setEditingTask,
  setEditingSection,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,
  setSelectedTaskIds,
  toggleTaskSelection,
  clearSelection,
  setTodaySearchTerm,
  setTodaySelectedTagIds,
  setBacklogSearchTerm,
  setBacklogSelectedTagIds,
  setCalendarSearchTerm,
  setCalendarSelectedTagIds,
} = uiSlice.actions;

export default uiSlice.reducer;

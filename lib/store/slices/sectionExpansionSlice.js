"use client";

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Sections that are auto-collapsed (not manually collapsed by user)
  autoCollapsedSections: [],
  // Sections that were manually expanded after being auto-collapsed
  manuallyExpandedSections: [],
  // Sections that were manually collapsed by user (overrides auto-collapse)
  manuallyCollapsedSections: [],
};

const sectionExpansionSlice = createSlice({
  name: "sectionExpansion",
  initialState,
  reducers: {
    addAutoCollapsedSection: (state, action) => {
      if (!state.autoCollapsedSections.includes(action.payload)) {
        state.autoCollapsedSections.push(action.payload);
      }
    },
    removeAutoCollapsedSection: (state, action) => {
      state.autoCollapsedSections = state.autoCollapsedSections.filter(id => id !== action.payload);
    },
    setAutoCollapsedSections: (state, action) => {
      state.autoCollapsedSections = action.payload;
    },
    addManuallyExpandedSection: (state, action) => {
      if (!state.manuallyExpandedSections.includes(action.payload)) {
        state.manuallyExpandedSections.push(action.payload);
      }
    },
    removeManuallyExpandedSection: (state, action) => {
      state.manuallyExpandedSections = state.manuallyExpandedSections.filter(id => id !== action.payload);
    },
    setManuallyExpandedSections: (state, action) => {
      state.manuallyExpandedSections = action.payload;
    },
    addManuallyCollapsedSection: (state, action) => {
      if (!state.manuallyCollapsedSections.includes(action.payload)) {
        state.manuallyCollapsedSections.push(action.payload);
      }
      // Remove from manually expanded if it was there
      state.manuallyExpandedSections = state.manuallyExpandedSections.filter(id => id !== action.payload);
    },
    removeManuallyCollapsedSection: (state, action) => {
      state.manuallyCollapsedSections = state.manuallyCollapsedSections.filter(id => id !== action.payload);
    },
    setManuallyCollapsedSections: (state, action) => {
      state.manuallyCollapsedSections = action.payload;
    },
    clearSectionExpansion: state => {
      state.autoCollapsedSections = [];
      state.manuallyExpandedSections = [];
      state.manuallyCollapsedSections = [];
    },
  },
});

export const {
  addAutoCollapsedSection,
  removeAutoCollapsedSection,
  setAutoCollapsedSections,
  addManuallyExpandedSection,
  removeManuallyExpandedSection,
  setManuallyExpandedSections,
  addManuallyCollapsedSection,
  removeManuallyCollapsedSection,
  setManuallyCollapsedSections,
  clearSectionExpansion,
} = sectionExpansionSlice.actions;

export default sectionExpansionSlice.reducer;

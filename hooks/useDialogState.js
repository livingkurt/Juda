"use client";

import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  openTaskDialog as openTaskDialogAction,
  closeTaskDialog as closeTaskDialogAction,
  openSectionDialog as openSectionDialogAction,
  closeSectionDialog as closeSectionDialogAction,
  setTagEditorOpen,
  openWorkoutModal,
  closeWorkoutModal,
  setEditingTask,
  setEditingSection,
  setEditingWorkoutTask,
  setDefaultSectionId,
  setDefaultTime,
  setDefaultDate,
} from "@/lib/store/slices/uiSlice";

/**
 * Dialog state management using Redux directly
 */
export function useDialogState() {
  const dispatch = useDispatch();

  // Get state from Redux
  const taskDialogOpen = useSelector(state => state.ui.taskDialogOpen);
  const sectionDialogOpen = useSelector(state => state.ui.sectionDialogOpen);
  const tagEditorOpen = useSelector(state => state.ui.tagEditorOpen);
  const workoutModalOpen = useSelector(state => state.ui.workoutModalOpen);
  const workoutModalTask = useSelector(state => state.ui.workoutModalTask);
  const editingTask = useSelector(state => state.ui.editingTask);
  const editingSection = useSelector(state => state.ui.editingSection);
  const editingWorkoutTask = useSelector(state => state.ui.editingWorkoutTask);
  const defaultSectionId = useSelector(state => state.ui.defaultSectionId);
  const defaultTime = useSelector(state => state.ui.defaultTime);
  const defaultDate = useSelector(state => state.ui.defaultDate);

  // Task dialog actions
  const openTaskDialog = useCallback(() => dispatch(openTaskDialogAction()), [dispatch]);
  const closeTaskDialog = useCallback(() => dispatch(closeTaskDialogAction()), [dispatch]);

  // Section dialog actions
  const openSectionDialog = useCallback(() => dispatch(openSectionDialogAction()), [dispatch]);
  const closeSectionDialog = useCallback(() => dispatch(closeSectionDialogAction()), [dispatch]);

  // Workout modal actions
  const handleBeginWorkout = useCallback(
    task => {
      dispatch(openWorkoutModal(task));
    },
    [dispatch]
  );

  const handleCloseWorkoutModal = useCallback(() => {
    dispatch(closeWorkoutModal());
  }, [dispatch]);

  // Setter wrappers for dispatch
  const handleSetTagEditorOpen = useCallback(value => dispatch(setTagEditorOpen(value)), [dispatch]);
  const handleSetEditingTask = useCallback(task => dispatch(setEditingTask(task)), [dispatch]);
  const handleSetEditingSection = useCallback(section => dispatch(setEditingSection(section)), [dispatch]);
  const handleSetEditingWorkoutTask = useCallback(task => dispatch(setEditingWorkoutTask(task)), [dispatch]);
  const handleSetDefaultSectionId = useCallback(id => dispatch(setDefaultSectionId(id)), [dispatch]);
  const handleSetDefaultTime = useCallback(time => dispatch(setDefaultTime(time)), [dispatch]);
  const handleSetDefaultDate = useCallback(date => dispatch(setDefaultDate(date)), [dispatch]);

  // Memoize inline functions that were creating new references
  const handleSetWorkoutModalOpen = useCallback(
    value => dispatch(value ? openWorkoutModal(null) : closeWorkoutModal()),
    [dispatch]
  );
  const handleSetWorkoutModalTask = useCallback(task => dispatch(openWorkoutModal(task)), [dispatch]);

  return useMemo(
    () => ({
      // Task dialog
      taskDialogOpen,
      openTaskDialog,
      closeTaskDialog,

      // Section dialog
      sectionDialogOpen,
      openSectionDialog,
      closeSectionDialog,

      // Tag editor
      tagEditorOpen,
      setTagEditorOpen: handleSetTagEditorOpen,

      // Workout modal
      workoutModalOpen,
      workoutModalTask,
      handleBeginWorkout,
      closeWorkoutModal: handleCloseWorkoutModal,
      setWorkoutModalOpen: handleSetWorkoutModalOpen,
      setWorkoutModalTask: handleSetWorkoutModalTask,

      // Task editing state
      editingTask,
      setEditingTask: handleSetEditingTask,
      editingSection,
      setEditingSection: handleSetEditingSection,
      editingWorkoutTask,
      setEditingWorkoutTask: handleSetEditingWorkoutTask,
      defaultSectionId,
      setDefaultSectionId: handleSetDefaultSectionId,
      defaultTime,
      setDefaultTime: handleSetDefaultTime,
      defaultDate,
      setDefaultDate: handleSetDefaultDate,
    }),
    [
      taskDialogOpen,
      openTaskDialog,
      closeTaskDialog,
      sectionDialogOpen,
      openSectionDialog,
      closeSectionDialog,
      tagEditorOpen,
      handleSetTagEditorOpen,
      workoutModalOpen,
      workoutModalTask,
      handleBeginWorkout,
      handleCloseWorkoutModal,
      handleSetWorkoutModalOpen,
      handleSetWorkoutModalTask,
      editingTask,
      handleSetEditingTask,
      editingSection,
      handleSetEditingSection,
      editingWorkoutTask,
      handleSetEditingWorkoutTask,
      defaultSectionId,
      handleSetDefaultSectionId,
      defaultTime,
      handleSetDefaultTime,
      defaultDate,
      handleSetDefaultDate,
    ]
  );
}

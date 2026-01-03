import { useState, useCallback } from "react";

export function useDialogState() {
  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const openTaskDialog = useCallback(() => setTaskDialogOpen(true), []);
  const closeTaskDialog = useCallback(() => setTaskDialogOpen(false), []);

  // Section dialog state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const openSectionDialog = useCallback(() => setSectionDialogOpen(true), []);
  const closeSectionDialog = useCallback(() => setSectionDialogOpen(false), []);

  // Tag editor state
  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  // Workout modal state
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [workoutModalTask, setWorkoutModalTask] = useState(null);

  // Task editing state
  const [editingTask, setEditingTask] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [defaultSectionId, setDefaultSectionId] = useState(null);
  const [defaultTime, setDefaultTime] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [editingWorkoutTask, setEditingWorkoutTask] = useState(null);

  // Workout handler
  const handleBeginWorkout = useCallback(task => {
    setWorkoutModalTask(task);
    setWorkoutModalOpen(true);
  }, []);

  return {
    // Task dialog
    taskDialogOpen,
    setTaskDialogOpen,
    openTaskDialog,
    closeTaskDialog,

    // Section dialog
    sectionDialogOpen,
    setSectionDialogOpen,
    openSectionDialog,
    closeSectionDialog,

    // Tag editor
    tagEditorOpen,
    setTagEditorOpen,

    // Workout modal
    workoutModalOpen,
    setWorkoutModalOpen,
    workoutModalTask,
    setWorkoutModalTask,
    handleBeginWorkout,

    // Task editing state
    editingTask,
    setEditingTask,
    editingSection,
    setEditingSection,
    defaultSectionId,
    setDefaultSectionId,
    defaultTime,
    setDefaultTime,
    defaultDate,
    setDefaultDate,
    editingWorkoutTask,
    setEditingWorkoutTask,
  };
}

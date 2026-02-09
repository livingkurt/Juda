"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  Button,
  Chip,
  Collapse,
  Paper,
  Autocomplete,
} from "@mui/material";
import { Draggable } from "@hello-pangea/dnd";
import {
  ExpandMore,
  ChevronRight,
  AccessTime,
  MoreVert,
  Close,
  RadioButtonUnchecked,
  PlayCircle,
  CheckCircle,
  FitnessCenter,
} from "@mui/icons-material";
import { formatTime, getTaskDisplayColor } from "@/lib/utils";
import { TagChip } from "./TagChip";
import { TagSelectorBase } from "./TagSelector";
import { PriorityChip } from "./PriorityChip";
import { TaskBadges } from "./shared/TaskBadges";
import { TaskContextMenuBase } from "./TaskContextMenu";
import { OutcomeCheckbox } from "./OutcomeCheckbox";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTheme } from "@/hooks/useTheme";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { ReflectionEntry } from "./ReflectionEntry";
import { PRIORITY_LEVELS } from "@/lib/constants";
import { RichTextEditor } from "@/components/RichTextEditor";
import { GoalReflectionsModal } from "./GoalReflectionsModal";

// Small component to handle text input with state that resets on date change
const TextInputTask = ({ taskId, savedNote, isNotCompleted, onCompleteWithNote }) => {
  const [noteInput, setNoteInput] = useState(savedNote || "");
  const [prevSavedNote, setPrevSavedNote] = useState(savedNote);
  const [isFocused, setIsFocused] = useState(false);
  const noteInputRef = useRef(null);

  // Sync with savedNote when it changes (e.g., after save or date change)
  // Use "adjusting state during render" pattern
  if (prevSavedNote !== savedNote && !isFocused) {
    setPrevSavedNote(savedNote);
    setNoteInput(savedNote || "");
  }

  // Adjust height when content or focus changes
  useEffect(() => {
    if (noteInputRef.current) {
      const textarea = noteInputRef.current;
      textarea.style.height = "auto";
      // Always show all content, expand infinitely
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [noteInput, isFocused]);

  // Save function wrapper
  const saveNote = value => {
    if (value.trim() && value.trim() !== savedNote) {
      onCompleteWithNote?.(taskId, value.trim());
    }
  };

  const { debouncedSave, immediateSave } = useDebouncedSave(saveNote, 500);

  const handleChange = e => {
    const newValue = e.target.value;
    setNoteInput(newValue);
    debouncedSave(newValue);
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <TextField
        inputRef={noteInputRef}
        fullWidth
        multiline
        value={noteInput}
        onChange={handleChange}
        onInput={e => {
          // Auto-expand textarea when typing - expand infinitely
          const textarea = e.target;
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Update state to track current savedNote
          setPrevSavedNote(savedNote);
          // Save immediately on blur
          immediateSave(noteInput);
          // If cleared, reset to saved note
          if (!noteInput.trim() && savedNote) {
            setNoteInput(savedNote);
          }
        }}
        placeholder="Enter response to complete..."
        size="small"
        variant="standard"
        disabled={isNotCompleted}
        rows={1}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            // Cmd/Ctrl+Enter to save
            e.preventDefault();
            if (noteInput.trim()) {
              onCompleteWithNote?.(taskId, noteInput.trim());
              noteInputRef.current?.blur();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            // Reset to saved note if editing was cancelled
            setNoteInput(savedNote);
            noteInputRef.current?.blur();
          }
          e.stopPropagation();
        }}
        InputProps={{
          disableUnderline: true,
          sx: {
            fontSize: "0.875rem",
            px: 0,
            py: 0.5,
            "& .MuiInputBase-input.Mui-disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
          },
        }}
      />
      {isNotCompleted && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Not Completed
        </Typography>
      )}
    </Box>
  );
};

// Component to handle selection input with autocomplete dropdown
const SelectionInputTask = ({ taskId, savedNote, savedOptions, isNotCompleted, onCompleteWithNote, options = [] }) => {
  // Parse saved selections - support both old single-value (savedNote) and new multi-value (savedOptions)
  const parseInitialValue = useCallback(() => {
    if (savedOptions && Array.isArray(savedOptions) && savedOptions.length > 0) {
      return savedOptions;
    }
    if (savedNote && savedNote.trim()) {
      return [savedNote.trim()];
    }
    return [];
  }, [savedNote, savedOptions]);

  const [selectedValues, setSelectedValues] = useState(parseInitialValue);
  const [isFocused, setIsFocused] = useState(false);
  const prevSavedRef = useRef({ savedNote, savedOptions });

  // Sync with saved data when it changes (e.g., after save or date change)
  useEffect(() => {
    const hasChanged =
      prevSavedRef.current.savedNote !== savedNote ||
      JSON.stringify(prevSavedRef.current.savedOptions) !== JSON.stringify(savedOptions);

    if (hasChanged && !isFocused) {
      prevSavedRef.current = { savedNote, savedOptions };
      const timeoutId = setTimeout(() => {
        setSelectedValues(parseInitialValue());
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [savedNote, savedOptions, isFocused, parseInitialValue]);

  // Save function wrapper - now saves array
  const saveSelection = useCallback(
    values => {
      const valuesArray = Array.isArray(values) ? values : [];
      const currentArray = parseInitialValue();

      // Only save if changed
      if (JSON.stringify(valuesArray) !== JSON.stringify(currentArray)) {
        onCompleteWithNote?.(taskId, valuesArray);
      }
    },
    [parseInitialValue, onCompleteWithNote, taskId]
  );

  const { immediateSave } = useDebouncedSave(saveSelection, 300);

  const handleChange = (event, newValues) => {
    setSelectedValues(newValues);
    immediateSave(newValues);
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Autocomplete
        multiple
        options={options}
        value={selectedValues}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          prevSavedRef.current = { savedNote, savedOptions };
          immediateSave(selectedValues);
        }}
        disabled={isNotCompleted}
        size="small"
        renderInput={params => (
          <TextField
            {...params}
            variant="standard"
            placeholder="Select options..."
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            InputProps={{
              ...params.InputProps,
              disableUnderline: true,
              sx: {
                fontSize: "0.875rem",
                px: 0,
                py: 0.5,
                "& .MuiInputBase-input.Mui-disabled": {
                  opacity: 0.5,
                  cursor: "not-allowed",
                },
              },
            }}
          />
        )}
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            padding: "0 !important",
          },
        }}
        onKeyDown={e => {
          e.stopPropagation();
        }}
      />
      {isNotCompleted && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Not Completed
        </Typography>
      )}
    </Box>
  );
};

export const TaskItem = ({
  task,
  variant = "today", // "today", "backlog", "subtask", or "kanban"
  containerId, // Container ID for sortable context
  draggableId,
  index = 0, // Index for draggable items
  textColor: textColorProp, // Optional override
  mutedTextColor: mutedTextColorProp, // Optional override
  gripColor: gripColorProp, // Optional override
  viewDate, // Date being viewed (for overdue calculation)
  parentTaskId, // For subtask variant
  isSelected, // Whether this task is selected for bulk edit
  onRemoveFromParent, // Optional handler for removing subtask from parent (used in dialog)
  allTasksOverride: _allTasksOverride, // Optional: provide tasks to avoid full fetch
  shared,
  meta,
}) => {
  const sharedState = shared || {};
  const taskMeta = meta || {};
  const taskOps = sharedState.taskActions;
  const completionHandlers = sharedState.completionHandlers;
  const selectionState = sharedState.selectionState;
  const dialogState = sharedState.dialogState;
  const statusHandlers = sharedState.statusHandlers;
  const priorityHandlers = sharedState.priorityHandlers;
  const tagOptions = sharedState.tags || [];
  const tagsForTask = sharedState.tagsForTask;
  const onCreateTag = sharedState.onCreateTag;
  const removeFromParentHandler = onRemoveFromParent || sharedState.removeFromParent;

  const isBacklog = variant === "backlog";
  const isToday = variant === "today";
  const isSubtask = variant === "subtask";

  // Extract handlers from hooks
  const onToggle = isSubtask ? completionHandlers?.handleToggleSubtask : completionHandlers?.handleToggleTask;
  const onToggleSubtask = completionHandlers?.handleToggleSubtask;
  const onToggleExpand = taskOps?.handleToggleExpand;
  const onEdit = taskOps?.handleEditTask;
  const onEditWorkout = taskOps?.handleEditWorkout;
  const onUpdateTitle = taskOps?.handleUpdateTaskTitle;
  const onDelete = taskOps?.handleDeleteTask;
  const onDuplicate = taskOps?.handleDuplicateTask;
  const onOutcomeChange = completionHandlers?.handleOutcomeChange;
  const onSubtaskOutcomeChange = completionHandlers?.handleSubtaskOutcomeChange;
  const onCompleteWithNote = completionHandlers?.handleCompleteWithNote;
  const onSelect = selectionState?.handleTaskSelect;
  const onBeginWorkout = dialogState?.handleBeginWorkout;
  const onCreateSubtask = taskOps?.handleCreateSubtask;

  // Compute selection state from Redux (use props if provided, otherwise use Redux)
  const isSelectedComputed =
    isSelected !== undefined ? isSelected : selectionState?.selectedTaskIds?.has(task.id) || false;

  // For subtasks, inherit parent's tags if subtask has no tags (precomputed by parent)
  const displayTags = taskMeta.displayTags || tagsForTask?.get(task.id) || task.tags || [];

  const { mode, colorMode } = useSemanticColors();
  const { theme } = useTheme();

  const textColorDefault = mode.text.primary;
  const mutedTextDefault = mode.text.secondary;
  const gripColorDefault = mode.text.muted;

  const textColor = textColorProp || textColorDefault;
  const mutedText = mutedTextColorProp || mutedTextDefault;
  const gripColor = gripColorProp || gripColorDefault;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title || "");
  const titleInputRef = useRef(null);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState("");
  const noteInputRef = useRef(null);
  const noteEditorRef = useRef(null);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const newSubtaskInputRef = useRef(null);

  // Dropdown menu states for status, priority, and tags
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [priorityMenuAnchor, setPriorityMenuAnchor] = useState(null);
  const [reflectionsModalOpen, setReflectionsModalOpen] = useState(false);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      // Auto-expand textarea to fit content
      titleInputRef.current.style.height = "auto";
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, [isEditingTitle]);

  // Auto-expand textarea when content changes
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.style.height = "auto";
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, [editedTitle, isEditingTitle]);

  const handleTitleClick = e => {
    e.stopPropagation();
    if (!isEditingTitle) {
      // Sync with current task title when starting edit
      setEditedTitle(task.title || "");
      setIsEditingTitle(true);
    }
  };

  // Save function wrapper for title
  const saveTitle = value => {
    if (value.trim() && value.trim() !== task.title && onUpdateTitle) {
      onUpdateTitle(task.id, value);
    }
  };

  const {
    debouncedSave: debouncedTitleSave,
    immediateSave: immediateTitleSave,
    isSaving: _isSavingTitle,
    justSaved: _justSavedTitle,
  } = useDebouncedSave(saveTitle, 500);

  const handleTitleChange = e => {
    const newValue = e.target.value;
    setEditedTitle(newValue);
    debouncedTitleSave(newValue);
  };

  const handleTitleBlur = async () => {
    // Save immediately on blur if there are changes
    immediateTitleSave(editedTitle);
    if (!editedTitle.trim()) {
      setEditedTitle(task.title || "");
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = async e => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      // Cmd/Ctrl+Enter to save
      e.preventDefault();
      if (editedTitle.trim() && editedTitle !== task.title && onUpdateTitle) {
        await onUpdateTitle(task.id, editedTitle);
      }
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title || "");
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    }
    // Allow normal Enter for new lines
  };

  // Get existing completion data for text-type tasks (precomputed by parent)
  const existingCompletion = taskMeta.completion || null;
  const savedNote = existingCompletion?.note || "";
  const savedOptions = existingCompletion?.selectedOptions || [];

  // Note editing handlers
  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.focus();
      // Auto-expand textarea to fit content
      noteInputRef.current.style.height = "auto";
      noteInputRef.current.style.height = `${noteInputRef.current.scrollHeight}px`;
    }
  }, [isEditingNote]);

  useEffect(() => {
    if (isEditingNote && noteInputRef.current) {
      noteInputRef.current.style.height = "auto";
      noteInputRef.current.style.height = `${noteInputRef.current.scrollHeight}px`;
    }
  }, [editedNote, isEditingNote]);

  const handleNoteClick = e => {
    e.stopPropagation();
    if (!isEditingNote) {
      // Use task.content as the note
      setEditedNote(task.content || "");
      setIsEditingNote(true);
    }
  };

  const saveNote = async value => {
    const noteValue = value?.trim() || "";

    try {
      // Update task content (the note)
      await taskOps.updateTask(task.id, { content: noteValue });
    } catch (error) {
      console.error("Error saving note:", error);
    }
  };

  const { debouncedSave: debouncedNoteSave, immediateSave: immediateNoteSave } = useDebouncedSave(saveNote, 500);

  const handleNoteChange = htmlContent => {
    // RichTextEditor passes HTML directly, not an event
    setEditedNote(htmlContent);
    debouncedNoteSave(htmlContent);
  };

  const handleNoteClose = async () => {
    // Save the note before closing
    await immediateNoteSave(editedNote);
    setIsEditingNote(false);
  };

  // Handle click outside to close note editor
  useEffect(() => {
    if (!isEditingNote) return;

    const handleClickOutside = async e => {
      if (noteEditorRef.current && !noteEditorRef.current.contains(e.target)) {
        await handleNoteClose();
      }
    };

    // Add a small delay to prevent immediate closing when opening
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingNote, editedNote]);

  // Handle keyboard shortcuts for note editor
  useEffect(() => {
    if (!isEditingNote) return;

    const handleKeyDown = async e => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        await handleNoteClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setEditedNote(task.content || "");
        setIsEditingNote(false);
      }
    };

    // Use capture phase to catch the event before TipTap processes it
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isEditingNote, editedNote, task.content]);

  const handleCreateSubtask = async () => {
    if (newSubtaskTitle.trim() && onCreateSubtask) {
      await onCreateSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    }
  };

  const handleNewSubtaskKeyDown = async e => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleCreateSubtask();
    } else if (e.key === "Escape") {
      setNewSubtaskTitle("");
      newSubtaskInputRef.current?.blur();
    }
  };

  // For subtasks, just check their own completion status. For parent tasks, check if all subtasks are complete too.
  const isChecked = taskMeta.isChecked ?? (isSubtask ? task.completed : task.completed);

  // Task type checks (existingCompletion and savedNote already declared above)
  const isTextTask = taskMeta.isTextTask ?? task.completionType === "text";
  const isSelectionTask = taskMeta.isSelectionTask ?? task.completionType === "selection";
  const isReflectionTask = task.completionType === "reflection";
  const isWorkoutTask = taskMeta.isWorkoutTask ?? task.completionType === "workout";
  const isGoalTask = taskMeta.isGoalTask ?? task.completionType === "goal";
  const isNotCompleted = taskMeta.isNotCompleted ?? false;

  // Get selection options from task
  const selectionOptions =
    !isSelectionTask || !task.selectionData?.options
      ? []
      : task.selectionData.options.filter(opt => opt && opt.trim() !== "");

  // For workout tasks, only mark complete if outcome is explicitly "completed" (not "in_progress")
  const isWorkoutTaskCompleted =
    taskMeta.isWorkoutTaskCompleted ?? (isWorkoutTask && existingCompletion?.outcome === "completed");

  // Check if workout has in-progress data (precomputed by parent)
  const hasWorkoutProgress = taskMeta.hasWorkoutProgress || false;

  // Determine workout button text based on completion status
  const getWorkoutButtonText = () => {
    if (!isWorkoutTask) return "";
    if (isWorkoutTaskCompleted) return "View Results";

    // Check if there's any in-progress workout data for this task and date
    if (hasWorkoutProgress) return "Continue";

    return "Start";
  };

  const workoutButtonText = getWorkoutButtonText();

  // For text tasks, completion status comes from the completion record, not task.completed
  const isTextTaskCompleted =
    taskMeta.isTextTaskCompleted ??
    (isTextTask &&
      (existingCompletion?.outcome === "completed" ||
        (existingCompletion && existingCompletion.outcome !== "not_completed" && existingCompletion.note)));

  // For selection tasks, completion status comes from the completion record
  const isSelectionTaskCompleted =
    taskMeta.isSelectionTaskCompleted ??
    (isSelectionTask &&
      (existingCompletion?.outcome === "completed" ||
        (existingCompletion && existingCompletion.outcome !== "not_completed" && existingCompletion.note)));

  // For goal tasks, completion status comes from the completion record
  const isGoalTaskCompleted =
    taskMeta.isGoalTaskCompleted ?? (isGoalTask && existingCompletion?.outcome === "completed");

  // Get outcome for today view tasks, subtasks, and backlog items
  const outcome = taskMeta.outcome ?? null;

  // Check if task has any outcome (completed or not completed) - should show strikethrough
  const hasAnyOutcome = taskMeta.hasAnyOutcome ?? outcome !== null;
  const shouldShowStrikethrough = taskMeta.shouldShowStrikethrough ?? (isChecked || hasAnyOutcome);

  // Check if task is recurring (has recurrence and type is not "none")
  const isRecurring = taskMeta.isRecurring ?? (task.recurrence && task.recurrence.type !== "none");

  // For subtasks, also check if parent is recurring (subtasks inherit parent's recurring behavior)
  // This is passed via the task object from the parent component
  const parentIsRecurring =
    taskMeta.parentIsRecurring ?? (task.parentRecurrence && task.parentRecurrence.type !== "none");
  const effectivelyRecurring = taskMeta.effectivelyRecurring ?? (isRecurring || (isSubtask && parentIsRecurring));

  // Check if we should show menu: for recurring tasks (parent or subtask) that are overdue OR have outcome set
  // Subtasks should have same menu access as parent tasks
  // Works for today view tasks, subtasks, and backlog items
  const shouldShowMenu =
    (isToday || isSubtask || isBacklog) && onOutcomeChange && (outcome !== null || effectivelyRecurring);

  // Adapter function to convert OutcomeCheckbox callback signature to TaskItem's expected signature
  const handleOutcomeChange = newOutcome => {
    // DEBUG: Log which task this is being called on
    console.warn(
      "[TaskItem.handleOutcomeChange] task.id:",
      task.id,
      "task.title:",
      task.title,
      "isSubtask:",
      isSubtask,
      "variant:",
      variant
    );

    // For text tasks, handle completion with note
    if (isTextTask) {
      if (newOutcome === "completed" && !isTextTaskCompleted && savedNote.trim()) {
        onCompleteWithNote?.(task.id, savedNote.trim());
        return;
      }
      // For text tasks, use outcome change handler
      if (onOutcomeChange) {
        onOutcomeChange(task.id, viewDate, newOutcome);
      }
      return;
    }

    // For selection tasks, handle completion with selected value
    if (isSelectionTask) {
      if (newOutcome === "completed" && !isSelectionTaskCompleted && savedNote.trim()) {
        onCompleteWithNote?.(task.id, savedNote.trim());
        return;
      }
      // For selection tasks, use outcome change handler
      if (onOutcomeChange) {
        onOutcomeChange(task.id, viewDate, newOutcome);
      }
      return;
    }

    // For workout tasks, handle completion
    if (isWorkoutTask) {
      // Workout tasks use outcome system, so just call onOutcomeChange
      if (onOutcomeChange) {
        onOutcomeChange(task.id, viewDate, newOutcome);
      }
      return;
    }

    // For goal tasks, handle completion with outcome system
    if (isGoalTask) {
      // Goal tasks use outcome system like text/selection tasks
      if (onOutcomeChange && viewDate) {
        onOutcomeChange(task.id, viewDate, newOutcome);
      }
      return;
    }

    if (isSubtask && onSubtaskOutcomeChange && shouldShowMenu) {
      onSubtaskOutcomeChange(parentTaskId, task.id, newOutcome);
      return;
    }

    // For non-recurring tasks without outcomes, use toggle behavior
    // When OutcomeCheckbox calls with "completed", toggle the task
    if (!shouldShowMenu) {
      console.warn(
        "[TaskItem.handleOutcomeChange] !shouldShowMenu branch, calling onToggle for",
        task.title,
        "isSubtask:",
        isSubtask,
        "parentTaskId:",
        parentTaskId
      );
      if (newOutcome === "completed") {
        // Toggle to completed
        if (isSubtask) {
          onToggle?.(parentTaskId, task.id);
        } else {
          onToggle?.(task.id);
        }
      } else if (newOutcome === null) {
        // Toggle to uncompleted (this shouldn't happen for non-recurring, but handle it)
        if (isSubtask) {
          onToggle?.(parentTaskId, task.id);
        } else {
          onToggle?.(task.id);
        }
      } else {
        // For "not_completed" and other outcomes, still call onOutcomeChange if available
        // This handles cases where OutcomeCheckbox shows menu (due to existing outcome)
        // but TaskItem's shouldShowMenu is false
        if (onOutcomeChange && viewDate) {
          onOutcomeChange(task.id, viewDate, newOutcome);
        }
      }
      return;
    }

    // For recurring tasks with outcomes, use outcome change handler
    console.warn("[TaskItem.handleOutcomeChange] shouldShowMenu=true branch, calling onOutcomeChange for", task.title);
    if (onOutcomeChange) {
      onOutcomeChange(task.id, viewDate, newOutcome);
    }
  };

  const handleCompletionMenuOpen = () => {
    completionHandlers?.setCompletionMenuOpen?.(true);
  };

  const handleCompletionMenuClose = () => {
    completionHandlers?.setCompletionMenuOpen?.(false);
  };

  // Enable drag-and-drop for dialog subtasks, but disable for subtasks in the main view
  const isDialogSubtask = containerId === "task-dialog-subtasks";
  const isDragDisabled = isSubtask && !isDialogSubtask;

  // Also disable drag when editing title or note to prevent interference with text input
  const isDragDisabledDuringEdit = isDragDisabled || isEditingTitle || isEditingNote;

  // Get task color from first tag, or use neutral gray if no tags
  // Use displayTags for color calculation so subtasks inherit parent's color
  const taskColor = getTaskDisplayColor({ ...task, tags: displayTags }, theme, colorMode);

  // Render the task content
  const taskContent = (
    <Box sx={{ width: "100%", maxWidth: "100%", opacity: 1 }} data-task-id={task.id}>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          bgcolor: isSelectedComputed ? "action.selected" : "background.paper",
          borderWidth: 2,
          borderColor: isSelectedComputed ? mode.selection?.border || "primary.main" : taskColor || "divider",
          boxShadow: isSelectedComputed ? `0 0 0 2px ${mode.selection?.border || "primary.main"}` : "none",
          transition: "box-shadow 0.2s, border-color 0.2s, background-color 0.2s",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.75, md: 1 }}
          sx={{
            p: { xs: 1, md: 1.5 },
            "&:hover": { bgcolor: "action.hover" },
            cursor: isDragDisabledDuringEdit ? "default" : "grab",
            "&:active": { cursor: isDragDisabledDuringEdit ? "default" : "grabbing" },
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
          onClick={e => {
            // Handle cmd/ctrl+click for selection (only for non-subtask variants)
            if ((e.metaKey || e.ctrlKey) && !isSubtask && onSelect) {
              e.stopPropagation();
              onSelect(task.id, e);
            }
          }}
        >
          {/* Expand button for subtasks */}
          {task.subtasks && task.subtasks.length > 0 ? (
            onToggleExpand ? (
              <IconButton
                onClick={e => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                size="small"
                aria-label="Toggle expand"
              >
                {task.expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 24 }} />
            )
          ) : (
            <Box />
          )}

          {/* X button for dialog subtasks */}
          {isDialogSubtask && onRemoveFromParent && (
            <IconButton
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveFromParent();
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size="small"
              aria-label="Remove subtask"
              color="error"
            >
              <Close fontSize="small" />
            </IconButton>
          )}

          {/* Checkbox with outcome states */}
          {!isDialogSubtask && (
            <Box sx={{ position: "relative" }}>
              {/* Checkbox for all tasks (including text-type and subtasks) */}
              {(isToday || isBacklog || isSubtask) && (
                <OutcomeCheckbox
                  outcome={
                    // For text tasks, use outcome from completion record
                    isTextTask
                      ? existingCompletion?.outcome || null
                      : // For selection tasks, use outcome from completion record
                        isSelectionTask
                        ? existingCompletion?.outcome || null
                        : // For goal tasks, use outcome from completion record
                          isGoalTask
                          ? existingCompletion?.outcome || null
                          : // For workout tasks, use outcome from completion
                            isWorkoutTask
                            ? outcome
                            : // For regular tasks, use outcome or null
                              outcome
                  }
                  onOutcomeChange={handleOutcomeChange}
                  onMenuOpen={handleCompletionMenuOpen}
                  onMenuClose={handleCompletionMenuClose}
                  isChecked={
                    // For text tasks, show checked if completed (even without explicit outcome)
                    isTextTask
                      ? isTextTaskCompleted
                      : // For selection tasks, show checked if completed
                        isSelectionTask
                        ? isSelectionTaskCompleted
                        : // For goal tasks, show checked if completed
                          isGoalTask
                          ? isGoalTaskCompleted
                          : // For workout tasks, show checked if completed
                            isWorkoutTask
                            ? isWorkoutTaskCompleted
                            : // For non-recurring tasks without outcomes, use isChecked
                              !shouldShowMenu && isChecked
                  }
                  disabled={false}
                  size="lg"
                  isRecurring={effectivelyRecurring}
                  viewDate={viewDate}
                  onRollover={completionHandlers?.handleRolloverTask}
                  taskId={task.id}
                />
              )}
            </Box>
          )}

          {/* Task content */}
          <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", position: "relative" }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: "100%", maxWidth: "100%" }}>
              {isEditingTitle ? (
                <TextField
                  inputRef={titleInputRef}
                  fullWidth
                  multiline
                  value={editedTitle}
                  onChange={handleTitleChange}
                  onInput={e => {
                    // Auto-expand textarea when typing
                    const textarea = e.target;
                    textarea.style.height = "auto";
                    textarea.style.height = `${textarea.scrollHeight}px`;
                  }}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  variant="standard"
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      fontWeight: 500,
                      fontSize: { xs: "0.875rem", md: "1rem" },
                      px: 0.5,
                      py: 0,
                      minHeight: "auto",
                      height: "auto",
                      lineHeight: 1.5,
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: "0.875rem", md: "1rem" },
                    textDecoration: shouldShowStrikethrough ? "line-through" : "none",
                    opacity: shouldShowStrikethrough ? 0.5 : 1,
                    color: textColor,
                    cursor: "text",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    wordBreak: "break-word",
                    "&:hover": {
                      opacity: shouldShowStrikethrough ? 0.7 : 1,
                    },
                  }}
                  onClick={handleTitleClick}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                >
                  {task.title}
                </Typography>
              )}
              {taskMeta.subtaskTotal > 0 && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    ml: { xs: 0.5, md: 1 },
                    fontSize: { xs: "0.625rem", md: "0.75rem" },
                    color: mutedText,
                    flexShrink: 0,
                  }}
                >
                  ({taskMeta.subtaskCompletedCount}/{taskMeta.subtaskTotal})
                </Typography>
              )}
            </Stack>
            {/* Text Input for text-type tasks */}
            {isTextTask && (isToday || isBacklog) && (
              <Box sx={{ width: "100%", mt: 1 }} key={`text-input-${task.id}-${viewDate?.toISOString()}`}>
                <TextInputTask
                  taskId={task.id}
                  savedNote={savedNote}
                  isNotCompleted={isNotCompleted}
                  onCompleteWithNote={onCompleteWithNote}
                />
              </Box>
            )}
            {/* Selection Input for selection-type tasks */}
            {isSelectionTask && (isToday || isBacklog) && (
              <Box sx={{ width: "100%", mt: 1 }} key={`selection-input-${task.id}-${viewDate?.toISOString()}`}>
                <SelectionInputTask
                  taskId={task.id}
                  savedNote={savedNote}
                  savedOptions={savedOptions}
                  isNotCompleted={isNotCompleted}
                  onCompleteWithNote={onCompleteWithNote}
                  options={selectionOptions}
                />
              </Box>
            )}
            {/* Reflection Entry for reflection-type tasks */}
            {isReflectionTask && (isToday || isBacklog) && (
              <Box sx={{ width: "100%", mt: 1 }} key={`reflection-entry-${task.id}-${viewDate?.toISOString()}`}>
                <ReflectionEntry
                  task={task}
                  date={viewDate}
                  existingCompletion={existingCompletion}
                  onSave={onCompleteWithNote}
                  compact={false}
                />
              </Box>
            )}
            {/* Badges - show for backlog, today, and subtask variants */}
            {(isBacklog || isToday || isSubtask) && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  mt: { xs: 0.5, md: 0.75 },
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 0.5,
                  rowGap: 0.5,
                }}
              >
                {/* Status badge - show for non-recurring, non-subtask tasks OR goal type tasks/subtasks */}
                {((!isRecurring && !isSubtask) || isGoalTask) && task.status && (
                  <>
                    <Chip
                      size="small"
                      icon={
                        task.status === "in_progress" ? (
                          <PlayCircle fontSize="inherit" />
                        ) : task.status === "complete" ? (
                          <CheckCircle fontSize="inherit" />
                        ) : (
                          <RadioButtonUnchecked fontSize="inherit" />
                        )
                      }
                      label={
                        task.status === "in_progress" ? "In Progress" : task.status === "complete" ? "Complete" : "Todo"
                      }
                      color={
                        task.status === "in_progress" ? "primary" : task.status === "complete" ? "success" : "default"
                      }
                      onClick={e => {
                        e.stopPropagation();
                        setStatusMenuAnchor(e.currentTarget);
                        setStatusMenuOpen(true);
                      }}
                      sx={{
                        height: 20,
                        fontSize: { xs: "0.625rem", md: "0.75rem" },
                        cursor: "pointer",
                        "&:hover": {
                          opacity: 0.8,
                        },
                      }}
                    />
                    <Menu
                      anchorEl={statusMenuAnchor}
                      open={statusMenuOpen}
                      onClose={() => {
                        setStatusMenuOpen(false);
                        setStatusMenuAnchor(null);
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <MenuItem
                        onClick={e => {
                          e.stopPropagation();
                          statusHandlers?.handleStatusChange(task.id, "todo");
                          setStatusMenuOpen(false);
                          setStatusMenuAnchor(null);
                        }}
                        selected={task.status === "todo"}
                      >
                        <RadioButtonUnchecked fontSize="small" sx={{ mr: 1 }} />
                        Todo
                      </MenuItem>
                      <MenuItem
                        onClick={e => {
                          e.stopPropagation();
                          statusHandlers?.handleStatusChange(task.id, "in_progress");
                          setStatusMenuOpen(false);
                          setStatusMenuAnchor(null);
                        }}
                        selected={task.status === "in_progress"}
                      >
                        <PlayCircle fontSize="small" sx={{ mr: 1 }} />
                        In Progress
                      </MenuItem>
                      <MenuItem
                        onClick={e => {
                          e.stopPropagation();
                          statusHandlers?.handleStatusChange(task.id, "complete");
                          setStatusMenuOpen(false);
                          setStatusMenuAnchor(null);
                        }}
                        selected={task.status === "complete"}
                      >
                        <CheckCircle fontSize="small" sx={{ mr: 1 }} />
                        Complete
                      </MenuItem>
                    </Menu>
                  </>
                )}
                {/* Goal-specific badges */}
                {task.completionType === "goal" && (
                  <>
                    <Chip
                      label={`Goal ${task.goalYear || ""}`}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: { xs: "0.625rem", md: "0.75rem" },
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    />
                    {task.goalMonths && task.goalMonths.length > 0 && (
                      <Chip
                        label={task.goalMonths
                          .map(m => new Date(2000, m - 1).toLocaleString("default", { month: "short" }))
                          .join(", ")}
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 20,
                          fontSize: { xs: "0.625rem", md: "0.75rem" },
                        }}
                      />
                    )}
                    <Button
                      size="small"
                      variant="text"
                      onClick={e => {
                        e.stopPropagation();
                        setReflectionsModalOpen(true);
                      }}
                      sx={{
                        height: 20,
                        fontSize: { xs: "0.625rem", md: "0.75rem" },
                        minWidth: "auto",
                        px: 1,
                        py: 0,
                        textTransform: "none",
                      }}
                    >
                      View Reflections
                    </Button>
                  </>
                )}
                {/* Reflection badge */}
                {task.completionType === "reflection" && (
                  <Chip
                    label="Reflection"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: { xs: "0.625rem", md: "0.75rem" },
                      bgcolor: "secondary.main",
                      color: "secondary.contrastText",
                    }}
                  />
                )}
                {/* Priority badge */}
                {task.priority ? (
                  <Box
                    onClick={e => {
                      e.stopPropagation();
                      setPriorityMenuAnchor(e.currentTarget);
                      setPriorityMenuOpen(true);
                    }}
                    sx={{ cursor: "pointer", display: "inline-flex" }}
                  >
                    <PriorityChip priority={task.priority} size="sm" />
                  </Box>
                ) : (
                  <Chip
                    size="small"
                    label="Priority"
                    variant="outlined"
                    onClick={e => {
                      e.stopPropagation();
                      setPriorityMenuAnchor(e.currentTarget);
                      setPriorityMenuOpen(true);
                    }}
                    sx={{
                      height: 20,
                      fontSize: { xs: "0.625rem", md: "0.75rem" },
                      cursor: "pointer",
                      "&:hover": {
                        opacity: 0.8,
                      },
                    }}
                  />
                )}
                <Menu
                  anchorEl={priorityMenuAnchor}
                  open={priorityMenuOpen}
                  onClose={() => {
                    setPriorityMenuOpen(false);
                    setPriorityMenuAnchor(null);
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {PRIORITY_LEVELS.map(level => (
                    <MenuItem
                      key={level.value || "none"}
                      onClick={e => {
                        e.stopPropagation();
                        priorityHandlers?.handlePriorityChange(task.id, level.value);
                        setPriorityMenuOpen(false);
                        setPriorityMenuAnchor(null);
                      }}
                      selected={task.priority === level.value}
                    >
                      {level.value ? (
                        <PriorityChip priority={level.value} size="xs" />
                      ) : (
                        <Typography variant="body2" sx={{ ml: 0.5 }}>
                          None
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Menu>
                {/* Shared task badges component */}
                <TaskBadges
                  task={task}
                  viewDate={viewDate}
                  size={variant === "kanban" ? "xs" : "sm"}
                  showNoTime={!isBacklog}
                  showEndDate={true}
                  isRecurring={isRecurring}
                  recurrenceLabel={taskMeta.recurrenceLabel}
                  isOverdue={taskMeta.isOverdue}
                  hasEndDate={Boolean(task.recurrence?.endDate)}
                />
                {/* Tags inline with badges */}
                {/* Tags - unified TagSelector with custom trigger */}
                <TagSelectorBase
                  tags={tagOptions}
                  onCreateTag={onCreateTag}
                  task={task}
                  autoSave
                  showManageButton
                  renderTrigger={handleMenuOpen => (
                    <>
                      {displayTags && displayTags.length > 0 ? (
                        // Show clickable tag chips when tags exist
                        displayTags.map(tag => (
                          <Box
                            key={tag.id}
                            onClick={e => {
                              e.stopPropagation();
                              handleMenuOpen(e);
                            }}
                            sx={{ cursor: "pointer", display: "inline-flex" }}
                          >
                            <TagChip tag={tag} size="xs" />
                          </Box>
                        ))
                      ) : (
                        // Show "Add Tag" button when no tags exist
                        <Chip
                          size="small"
                          label="Add Tag"
                          variant="outlined"
                          onClick={e => {
                            e.stopPropagation();
                            handleMenuOpen(e);
                          }}
                          sx={{
                            height: 20,
                            fontSize: { xs: "0.625rem", md: "0.75rem" },
                            cursor: "pointer",
                            "&:hover": {
                              opacity: 0.8,
                            },
                          }}
                        />
                      )}
                    </>
                  )}
                />
              </Stack>
            )}
            {/* Note display/edit - works like title, click to edit */}
            {!isTextTask && !isSelectionTask && !isReflectionTask && (
              <Box
                sx={{ width: "100%", mt: 0.5, position: "relative" }}
                onClick={e => {
                  if (!isEditingNote) {
                    e.stopPropagation();
                    handleNoteClick(e);
                  }
                }}
              >
                {isEditingNote ? (
                  <Box
                    ref={noteEditorRef}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    sx={{
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      p: 1,
                      "& .ProseMirror": {
                        minHeight: "60px",
                        fontSize: "0.875rem",
                        outline: "none",
                        "& p": {
                          margin: 0,
                        },
                      },
                    }}
                  >
                    <RichTextEditor
                      content={editedNote}
                      onChange={handleNoteChange}
                      placeholder="Add a note..."
                      showToolbar={false}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      cursor: "pointer",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      minHeight: "24px",
                      fontSize: "0.875rem",
                      color: task.content ? "text.secondary" : "text.disabled",
                      fontStyle: task.content ? "normal" : "italic",
                      "& p": {
                        margin: 0,
                      },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: task.content || "<p>Add a note...</p>",
                    }}
                  />
                )}
              </Box>
            )}
            {/* Tags for kanban variant */}
            {variant === "kanban" && (task.priority || (displayTags && displayTags.length > 0)) && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                {task.priority && <PriorityChip priority={task.priority} size="xs" />}
                {displayTags.map(tag => (
                  <TagChip key={tag.id} tag={tag} size="sm" />
                ))}
              </Stack>
            )}
          </Box>

          {/* Begin Workout button for workout-type tasks */}
          {isWorkoutTask && onBeginWorkout && (isToday || isBacklog) && (
            <Button
              size="small"
              variant="outlined"
              color={
                workoutButtonText === "View Results"
                  ? "secondary"
                  : workoutButtonText === "Continue"
                    ? "success"
                    : "primary"
              }
              onClick={e => {
                e.stopPropagation();
                onBeginWorkout(task);
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              sx={{ flexShrink: 0 }}
              startIcon={<FitnessCenter fontSize="small" />}
            >
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                {workoutButtonText}
              </Box>
            </Button>
          )}

          {/* Time display */}
          {task.time && (
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignItems: "center" }}>
              <AccessTime fontSize="inherit" sx={{ color: mutedText }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                  color: mutedText,
                  whiteSpace: "nowrap",
                }}
              >
                {formatTime(task.time)}
              </Typography>
            </Stack>
          )}

          {/* Action menu */}
          {!isDialogSubtask && (
            <>
              <IconButton
                onClick={e => {
                  e.stopPropagation();
                  setActionMenuOpen(true);
                  setActionMenuAnchor(e.currentTarget);
                }}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                size="small"
                aria-label="Task actions"
              >
                <MoreVert fontSize="small" />
              </IconButton>
              {/* Shared context menu for common actions */}
              <TaskContextMenuBase
                task={task}
                date={viewDate}
                isWorkoutTask={isWorkoutTask}
                isSubtask={isSubtask}
                onEdit={onEdit}
                onEditWorkout={onEditWorkout}
                onDuplicate={onDuplicate}
                onDelete={isSubtask ? taskId => onDelete?.(parentTaskId, taskId) : onDelete}
                onBulkEdit={selectionState?.handleBulkEdit}
                hasMultipleSelected={(selectionState?.selectedCount || 0) > 1}
                selectedCount={selectionState?.selectedCount || 0}
                canEditCompletion={taskMeta.canEditCompletion}
                onRemoveFromParent={removeFromParentHandler}
                onClose={() => {
                  setActionMenuOpen(false);
                  setActionMenuAnchor(null);
                }}
                anchorEl={actionMenuAnchor}
                open={actionMenuOpen}
              />
            </>
          )}
        </Stack>

        {/* Expanded subtasks */}
        {onToggleSubtask && (
          <Collapse in={task.expanded}>
            <Box sx={{ pl: { xs: 4, md: 8 }, pr: { xs: 1, md: 1.5 }, pb: { xs: 1, md: 1.5 } }}>
              <Stack spacing={{ xs: 1, md: 1.5 }}>
                {task.subtasks &&
                  task.subtasks.length > 0 &&
                  task.subtasks.map(subtask => (
                    <TaskItem
                      key={subtask.id}
                      task={{
                        ...subtask,
                        // Pass parent's recurrence so subtask can show outcome menu
                        parentRecurrence: task.recurrence,
                      }}
                      variant="subtask"
                      containerId={`subtask-${task.id}`}
                      parentTaskId={task.id}
                      draggableId={`subtask-${task.id}-${subtask.id}`}
                      shared={sharedState}
                      meta={sharedState.taskMetaById?.get(subtask.id)}
                      onToggle={onToggleSubtask}
                      onEdit={onEdit ? () => onEdit(subtask) : undefined}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete ? async (parentId, subtaskId) => onDelete(subtaskId) : undefined}
                      textColor={textColor}
                      mutedTextColor={mutedText}
                      gripColor={gripColor}
                      viewDate={viewDate}
                    />
                  ))}
                {/* New subtask input */}
                {onCreateSubtask && (
                  <TextField
                    inputRef={newSubtaskInputRef}
                    fullWidth
                    size="small"
                    variant="standard"
                    placeholder="New subtask..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleNewSubtaskKeyDown}
                    onBlur={handleCreateSubtask}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    InputProps={{
                      disableUnderline: true,
                      sx: {
                        fontSize: { xs: "0.875rem", md: "1rem" },
                        px: 1,
                        py: 1,
                        minHeight: "auto",
                        height: "auto",
                      },
                    }}
                  />
                )}
              </Stack>
            </Box>
          </Collapse>
        )}
      </Paper>
    </Box>
  );

  // For subtasks or dialog subtasks that can't be dragged, render without Draggable
  if (isDragDisabledDuringEdit) {
    return (
      <>
        {taskContent}
        {/* Goal Reflections Modal */}
        {isGoalTask && (
          <GoalReflectionsModal
            open={reflectionsModalOpen}
            onClose={() => setReflectionsModalOpen(false)}
            goalId={task.id}
            goalTitle={task.title}
          />
        )}
      </>
    );
  }

  // For draggable tasks, wrap with Draggable
  return (
    <>
      <Draggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              width: "100%",
              maxWidth: "100%",
              opacity: snapshot.isDragging ? 0.5 : 1,
              willChange: "transform",
            }}
          >
            {taskContent}
          </Box>
        )}
      </Draggable>
      {/* Goal Reflections Modal */}
      {isGoalTask && (
        <GoalReflectionsModal
          open={reflectionsModalOpen}
          onClose={() => setReflectionsModalOpen(false)}
          goalId={task.id}
          goalTitle={task.title}
        />
      )}
    </>
  );
};

// Memoize TaskItem to prevent unnecessary re-renders when props haven't meaningfully changed
export default memo(TaskItem);

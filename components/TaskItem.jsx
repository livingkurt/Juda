"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Chip,
  Collapse,
  Paper,
} from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExpandMore,
  ChevronRight,
  AccessTime,
  Edit,
  MoreVert,
  Close,
  RadioButtonUnchecked,
  PlayCircle,
  CheckCircle,
  FitnessCenter,
} from "@mui/icons-material";
import { formatTime, getTaskDisplayColor, isOverdue } from "@/lib/utils";
import { TagChip } from "./TagChip";
import { TaskBadges } from "./shared/TaskBadges";
import { TaskContextMenu } from "./TaskContextMenu";
import { OutcomeCheckbox } from "./OutcomeCheckbox";
import { useWorkoutProgress } from "@/hooks/useWorkoutProgress";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useSelectionState } from "@/hooks/useSelectionState";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useDialogState } from "@/hooks/useDialogState";
import { useStatusHandlers } from "@/hooks/useStatusHandlers";
import { useTheme } from "@/hooks/useTheme";

// Small component to handle text input with state that resets on date change
const TextInputTask = ({ taskId, savedNote, isNotCompleted, onCompleteWithNote }) => {
  const [noteInput, setNoteInput] = useState(savedNote || "");
  const [isFocused, setIsFocused] = useState(false);
  const noteInputRef = useRef(null);
  const prevSavedNoteRef = useRef(savedNote);

  // Sync with savedNote when it changes (e.g., after save or date change)
  // Defer state update to avoid synchronous setState in effect
  useEffect(() => {
    if (prevSavedNoteRef.current !== savedNote && !isFocused) {
      prevSavedNoteRef.current = savedNote;
      // Defer update to next tick to avoid synchronous setState
      const timeoutId = setTimeout(() => {
        setNoteInput(savedNote || "");
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [savedNote, isFocused]);

  // Adjust height when content or focus changes
  useEffect(() => {
    if (noteInputRef.current) {
      const textarea = noteInputRef.current;
      textarea.style.height = "auto";
      // Always show all content, expand infinitely
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [noteInput, isFocused]);

  return (
    <>
      <TextField
        inputRef={noteInputRef}
        fullWidth
        multiline
        value={noteInput}
        onChange={e => setNoteInput(e.target.value)}
        onInput={e => {
          // Auto-expand textarea when typing - expand infinitely
          const textarea = e.target;
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Update ref to current savedNote
          prevSavedNoteRef.current = savedNote;
          // Save on blur if note has content
          if (noteInput.trim() && noteInput.trim() !== savedNote) {
            onCompleteWithNote?.(taskId, noteInput.trim());
          } else if (!noteInput.trim() && savedNote) {
            // If cleared, reset to saved note
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
    </>
  );
};

export const TaskItem = ({
  task,
  variant = "today", // "today", "backlog", "subtask", or "kanban"
  containerId, // Container ID for sortable context
  draggableId,
  textColor: textColorProp, // Optional override
  mutedTextColor: mutedTextColorProp, // Optional override
  gripColor: gripColorProp, // Optional override
  viewDate, // Date being viewed (for overdue calculation)
  parentTaskId, // For subtask variant
  isSelected, // Whether this task is selected for bulk edit
  selectedCount, // Number of tasks currently selected
  onRemoveFromParent, // Optional handler for removing subtask from parent (used in dialog)
}) => {
  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const selectionState = useSelectionState();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const { getOutcomeOnDate, hasRecordOnDate, getCompletionForDate } = useCompletionHelpers();
  const dialogState = useDialogState();
  const statusHandlers = useStatusHandlers({
    addToRecentlyCompleted: completionHandlers.addToRecentlyCompleted,
  });

  // Extract handlers from hooks
  const onToggle = completionHandlers.handleToggleTask;
  const onToggleSubtask = completionHandlers.handleToggleSubtask;
  const onToggleExpand = taskOps.handleToggleExpand;
  const onEdit = taskOps.handleEditTask;
  const onEditWorkout = taskOps.handleEditWorkout;
  const onUpdateTitle = taskOps.handleUpdateTaskTitle;
  const onDelete = taskOps.handleDeleteTask;
  const onDuplicate = taskOps.handleDuplicateTask;
  const onOutcomeChange = completionHandlers.handleOutcomeChange;
  const onCompleteWithNote = completionHandlers.handleCompleteWithNote;
  const onSelect = selectionState.handleTaskSelect;
  const onBulkEdit = selectionState.handleBulkEdit;
  const onBeginWorkout = dialogState.handleBeginWorkout;
  const onTagsChange = taskOps.handleTaskTagsChange;
  const onCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };
  const onCreateSubtask = taskOps.handleCreateSubtask;

  // Compute selection state from Redux (use props if provided, otherwise use Redux)
  const isSelectedComputed = isSelected !== undefined ? isSelected : selectionState.selectedTaskIds.has(task.id);
  const selectedCountComputed = selectedCount !== undefined ? selectedCount : selectionState.selectedCount;

  const isBacklog = variant === "backlog";
  const isToday = variant === "today";
  const isSubtask = variant === "subtask";

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

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const newSubtaskInputRef = useRef(null);

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

  const handleTitleBlur = async () => {
    if (editedTitle.trim() && editedTitle !== task.title && onUpdateTitle) {
      await onUpdateTitle(task.id, editedTitle);
    } else if (!editedTitle.trim()) {
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

  const allSubtasksComplete = task.subtasks && task.subtasks.length > 0 && task.subtasks.every(st => st.completed);
  // For subtasks, just check their own completion status. For parent tasks, check if all subtasks are complete too.
  const isChecked = isSubtask ? task.completed : task.completed || allSubtasksComplete;

  // Get existing completion data for text-type tasks
  const existingCompletion = getCompletionForDate?.(task.id, viewDate);
  const isTextTask = task.completionType === "text";
  const isWorkoutTask = task.completionType === "workout";
  const isNotCompleted = existingCompletion?.outcome === "not_completed" || false;
  const savedNote = existingCompletion?.note || "";

  // For workout tasks, only mark complete if outcome is explicitly "completed" (not "in_progress")
  const isWorkoutTaskCompleted = isWorkoutTask && existingCompletion?.outcome === "completed";

  // Check if workout has in-progress data
  const hasWorkoutProgress = useWorkoutProgress(task.id, viewDate, isWorkoutTask);

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
    isTextTask &&
    (existingCompletion?.outcome === "completed" ||
      (existingCompletion && existingCompletion.outcome !== "not_completed" && existingCompletion.note));

  // Get outcome for today view tasks, subtasks, and backlog items
  const outcome =
    (isToday || isSubtask || isBacklog) && getOutcomeOnDate && viewDate ? getOutcomeOnDate(task.id, viewDate) : null;

  // Check if task has any outcome (completed or not completed) - should show strikethrough
  const hasAnyOutcome = outcome !== null;
  const shouldShowStrikethrough = isChecked || hasAnyOutcome;

  const taskIsOverdue =
    (isToday || isSubtask || isBacklog) && hasRecordOnDate && viewDate
      ? isOverdue(task, viewDate, hasRecordOnDate(task.id, viewDate))
      : false;

  // Check if task is recurring (has recurrence and type is not "none")
  const isRecurring = task.recurrence && task.recurrence.type !== "none";

  // For subtasks, also check if parent is recurring (subtasks inherit parent's recurring behavior)
  // This is passed via the task object from the parent component
  const parentIsRecurring = task.parentRecurrence && task.parentRecurrence.type !== "none";
  const effectivelyRecurring = isRecurring || (isSubtask && parentIsRecurring);

  // Check if we should show menu: for recurring tasks (parent or subtask) that are overdue OR have outcome set
  // Subtasks should have same menu access as parent tasks
  // Works for today view tasks, subtasks, and backlog items
  const shouldShowMenu =
    (isToday || isSubtask || isBacklog) &&
    onOutcomeChange &&
    effectivelyRecurring &&
    (taskIsOverdue || outcome !== null);

  // Adapter function to convert OutcomeCheckbox callback signature to TaskItem's expected signature
  const handleOutcomeChange = newOutcome => {
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

    // For workout tasks, handle completion
    if (isWorkoutTask) {
      // Workout tasks use outcome system, so just call onOutcomeChange
      if (onOutcomeChange) {
        onOutcomeChange(task.id, viewDate, newOutcome);
      }
      return;
    }

    // For non-recurring tasks without outcomes, use toggle behavior
    // When OutcomeCheckbox calls with "completed", toggle the task
    if (!shouldShowMenu) {
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
      }
      return;
    }

    // For recurring tasks with outcomes, use outcome change handler
    if (onOutcomeChange) {
      onOutcomeChange(task.id, viewDate, newOutcome);
    }
  };

  // Enable drag-and-drop for dialog subtasks, but disable for subtasks in the main view
  const isDialogSubtask = containerId === "task-dialog-subtasks";
  const isDragDisabled = isSubtask && !isDialogSubtask;

  // Also disable drag when editing title to prevent interference with text input
  const isDragDisabledDuringEdit = isDragDisabled || isEditingTitle;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    disabled: isDragDisabledDuringEdit,
    data: {
      type: "TASK",
      containerId: containerId,
      taskId: task.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  // Get task color from first tag, or use neutral gray if no tags
  const taskColor = getTaskDisplayColor(task, theme, colorMode);

  return (
    <Box ref={setNodeRef} style={style} sx={{ width: "100%", maxWidth: "100%" }} data-task-id={task.id}>
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
          {...(isDragDisabledDuringEdit ? {} : attributes)}
          {...(isDragDisabledDuringEdit ? {} : listeners)}
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
                      : // For workout tasks, use outcome from completion
                        isWorkoutTask
                        ? outcome
                        : // For regular tasks, use outcome or null
                          outcome
                  }
                  onOutcomeChange={handleOutcomeChange}
                  isChecked={
                    // For text tasks, show checked if completed (even without explicit outcome)
                    isTextTask
                      ? isTextTaskCompleted
                      : // For workout tasks, show checked if completed
                        isWorkoutTask
                        ? isWorkoutTaskCompleted
                        : // For non-recurring tasks without outcomes, use isChecked
                          !shouldShowMenu && isChecked
                  }
                  disabled={false}
                  size="lg"
                />
              )}
            </Box>
          )}

          {/* Task content */}
          <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: "100%", maxWidth: "100%" }}>
              {isEditingTitle ? (
                <TextField
                  inputRef={titleInputRef}
                  fullWidth
                  multiline
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
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
              {task.subtasks && task.subtasks.length > 0 && (
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
                  ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
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
            {/* Badges - show for backlog and today variants */}
            {(isBacklog || isToday) && (
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
                {/* Status badge - only show for non-recurring tasks */}
                {!isRecurring && task.status && (
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
                    sx={{
                      height: 20,
                      fontSize: { xs: "0.625rem", md: "0.75rem" },
                    }}
                  />
                )}
                {/* Shared task badges component */}
                <TaskBadges
                  task={task}
                  viewDate={viewDate}
                  size={variant === "kanban" ? "xs" : "sm"}
                  showNoTime={!isBacklog}
                  showEndDate={true}
                  hasRecordOnDate={hasRecordOnDate}
                />
                {/* Tags inline with badges */}
                {task.tags && task.tags.length > 0 && (
                  <>
                    {task.tags.map(tag => (
                      <TagChip key={tag.id} tag={tag} size="xs" />
                    ))}
                  </>
                )}
              </Stack>
            )}
            {/* Note content preview - show below badges */}
            {task.content && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                  color: mutedText,
                  mt: { xs: 0.5, md: 1 },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  wordBreak: "break-word",
                }}
              >
                {/* Strip HTML tags for preview */}
                {task.content.replace(/<[^>]*>/g, "").trim() || ""}
              </Typography>
            )}
            {/* Tags for kanban variant */}
            {variant === "kanban" && task.tags && task.tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: "center", flexWrap: "wrap" }}>
                {task.tags.map(tag => (
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
              <Menu
                open={actionMenuOpen}
                anchorEl={actionMenuAnchor}
                onClose={() => {
                  setActionMenuOpen(false);
                  setActionMenuAnchor(null);
                }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                {/* Show Bulk Edit option if multiple tasks are selected */}
                {selectedCountComputed > 0 &&
                  onBulkEdit && [
                    <MenuItem
                      key="bulk-edit"
                      onClick={e => {
                        e.stopPropagation();
                        onBulkEdit();
                        setActionMenuOpen(false);
                        setActionMenuAnchor(null);
                      }}
                    >
                      <ListItemIcon>
                        <Edit fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Bulk Edit ({selectedCountComputed} selected)</ListItemText>
                    </MenuItem>,
                    <Divider key="divider-bulk-edit" />,
                  ]}
                {/* Shared context menu for common actions */}
                <TaskContextMenu
                  task={task}
                  date={viewDate}
                  isRecurring={isRecurring}
                  isWorkoutTask={isWorkoutTask}
                  outcome={outcome}
                  isSubtask={isSubtask}
                  parentTaskId={parentTaskId}
                  onEdit={onEdit}
                  onEditWorkout={onEditWorkout}
                  onDuplicate={onDuplicate}
                  onDelete={isSubtask ? taskId => onDelete?.(parentTaskId, taskId) : onDelete}
                  onOutcomeChange={onOutcomeChange}
                  onClose={() => {
                    setActionMenuOpen(false);
                    setActionMenuAnchor(null);
                  }}
                  tags={tags}
                  onTagsChange={onTagsChange}
                  onCreateTag={onCreateTag}
                  onStatusChange={statusHandlers.handleStatusChange}
                  onRemoveFromParent={onRemoveFromParent}
                  anchorEl={actionMenuAnchor}
                  open={actionMenuOpen}
                />
              </Menu>
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
                      onToggle={onToggleSubtask}
                      onEdit={onEdit ? () => onEdit(subtask) : undefined}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete ? async (parentId, subtaskId) => onDelete(subtaskId) : undefined}
                      textColor={textColor}
                      mutedTextColor={mutedText}
                      gripColor={gripColor}
                      viewDate={viewDate}
                      onOutcomeChange={onOutcomeChange}
                      getOutcomeOnDate={getOutcomeOnDate}
                      hasRecordOnDate={hasRecordOnDate}
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
};

export default TaskItem;

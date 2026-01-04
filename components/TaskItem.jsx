"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Checkbox,
  Text,
  Flex,
  HStack,
  IconButton,
  VStack,
  Input,
  Textarea,
  Badge,
  Menu,
  Portal,
  Button,
} from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  MoreVertical,
  Check,
  X,
  Circle,
  PlayCircle,
  CheckCircle,
  Dumbbell,
} from "lucide-react";
import { formatTime, getTaskDisplayColor, isOverdue } from "@/lib/utils";
import { TagChip } from "./TagChip";
import { TaskBadges } from "./shared/TaskBadges";
import { TaskContextMenu } from "./TaskContextMenu";
import { Collapse } from "./Collapse";
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
const TextInputTask = ({ taskId, savedNote, isNotCompleted, onCompleteWithNote, mode }) => {
  const [noteInput, setNoteInput] = useState(savedNote);
  const [isFocused, setIsFocused] = useState(false);
  const noteInputRef = useRef(null);

  // Sync with savedNote when it changes (e.g., after save or date change)
  useEffect(() => {
    setNoteInput(savedNote);
  }, [savedNote]);

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
      <Textarea
        ref={noteInputRef}
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
          // Save on blur if note has content
          if (noteInput.trim() && noteInput.trim() !== savedNote) {
            onCompleteWithNote?.(taskId, noteInput.trim());
          } else if (!noteInput.trim() && savedNote) {
            // If cleared, reset to saved note
            setNoteInput(savedNote);
          }
        }}
        placeholder="Enter response to complete..."
        size="sm"
        variant="unstyled"
        disabled={isNotCompleted}
        resize="none"
        overflow="hidden"
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
        bg="transparent"
        px={0}
        py={1}
        fontSize="sm"
        color={mode.text.primary}
        _disabled={{
          opacity: 0.5,
          cursor: "not-allowed",
        }}
      />
      {isNotCompleted && (
        <Text fontSize="xs" color={mode.text.muted} mt={1}>
          Not Completed
        </Text>
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
  hoveredDroppable: _hoveredDroppable, // For drag and drop highlighting (unused for now)
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

  const bgColor = mode.bg.surface;
  const hoverBg = mode.bg.surfaceHover;
  const textColorDefault = mode.text.primary;
  const mutedTextDefault = mode.text.secondary;
  const gripColorDefault = mode.text.muted;

  const textColor = textColorProp || textColorDefault;
  const mutedText = mutedTextColorProp || mutedTextDefault;
  const gripColor = gripColorProp || gripColorDefault;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleInputRef = useRef(null);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const newSubtaskInputRef = useRef(null);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = e => {
    e.stopPropagation();
    if (!isEditingTitle) {
      // Sync with current task title when starting edit
      setEditedTitle(task.title);
      setIsEditingTitle(true);
    }
  };

  const handleTitleBlur = async () => {
    if (editedTitle.trim() && editedTitle !== task.title && onUpdateTitle) {
      await onUpdateTitle(task.id, editedTitle);
    } else if (!editedTitle.trim()) {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = async e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editedTitle.trim() && editedTitle !== task.title && onUpdateTitle) {
        await onUpdateTitle(task.id, editedTitle);
      }
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    }
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

  // State for outcome menu
  const [outcomeMenuOpen, setOutcomeMenuOpen] = useState(false);

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

  // Track previous outcome to detect actual changes (not initial render)
  const previousOutcomeRef = useRef(outcome);
  const menuJustOpenedRef = useRef(false);

  // Close menu when outcome changes, but not when menu first opens
  useEffect(() => {
    // If menu just opened, don't close it
    if (menuJustOpenedRef.current) {
      menuJustOpenedRef.current = false;
      return;
    }

    // Only close if outcome actually changed from a previous value
    if (outcomeMenuOpen && previousOutcomeRef.current !== null && previousOutcomeRef.current !== outcome) {
      const timer = setTimeout(() => {
        setOutcomeMenuOpen(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    // Update ref
    if (outcome !== null || previousOutcomeRef.current !== null) {
      previousOutcomeRef.current = outcome;
    }
  }, [outcome, outcomeMenuOpen]);

  // Enable drag-and-drop for dialog subtasks, but disable for subtasks in the main view
  const isDialogSubtask = containerId === "task-dialog-subtasks";
  const isDragDisabled = isSubtask && !isDialogSubtask;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    disabled: isDragDisabled,
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
    <Box ref={setNodeRef} style={style} w="100%" maxW="100%" data-task-id={task.id}>
      <Box
        borderRadius="lg"
        bg={isSelectedComputed ? mode.selection.bg : bgColor}
        transition="box-shadow 0.2s, border-color 0.2s, background-color 0.2s"
        borderColor={isSelectedComputed ? mode.selection.border : taskColor || mode.border.default}
        borderWidth="2px"
        borderStyle="solid"
        w="100%"
        maxW="100%"
        overflow="hidden"
        boxShadow={isSelectedComputed ? `0 0 0 2px ${mode.selection.border}` : "none"}
      >
        <Flex
          align="center"
          gap={{ base: 1.5, md: 2 }}
          p={{ base: 2, md: 3 }}
          _hover={{ bg: hoverBg }}
          _active={{ cursor: isDragDisabled ? "default" : "grabbing" }}
          {...(isDragDisabled ? {} : attributes)}
          {...(isDragDisabled ? {} : listeners)}
          cursor={isDragDisabled ? "default" : "grab"}
          w="100%"
          maxW="100%"
          overflow="hidden"
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
                size={{ base: "xs", md: "sm" }}
                variant="ghost"
                aria-label="Toggle expand"
                minW={{ base: "24px", md: "32px" }}
                h={{ base: "24px", md: "32px" }}
                p={{ base: 0, md: 1 }}
              >
                <Box as="span" color="currentColor">
                  {task.expanded ? (
                    <ChevronDown size={14} stroke="currentColor" />
                  ) : (
                    <ChevronRight size={14} stroke="currentColor" />
                  )}
                </Box>
              </IconButton>
            ) : (
              <Box w={6} />
            )
          ) : (
            <Box />
          )}

          {/* Checkbox with outcome states */}
          <Box position="relative">
            {/* Checkbox for all tasks (including text-type and subtasks) */}
            {(isToday || isBacklog || isSubtask) && (
              <Menu.Root
                open={outcomeMenuOpen}
                onOpenChange={({ open }) => setOutcomeMenuOpen(open)}
                isLazy
                placement="right-start"
                closeOnSelect
              >
                <Menu.Trigger asChild>
                  <Box
                    as="span"
                    display="inline-block"
                    border="none"
                    outline="none"
                    boxShadow="none"
                    bg="transparent"
                    p={0}
                    m={0}
                    _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                    _focusVisible={{ border: "none", outline: "none", boxShadow: "none" }}
                  >
                    <Checkbox.Root
                      checked={
                        isTextTask
                          ? isTextTaskCompleted
                          : isWorkoutTask
                            ? isWorkoutTaskCompleted
                            : outcome === "completed" || (outcome === null && isChecked)
                      }
                      size="md"
                      onCheckedChange={() => {
                        // For text tasks, complete when checkbox is checked (if there's a saved note)
                        if (isTextTask && !isTextTaskCompleted && savedNote.trim()) {
                          onCompleteWithNote?.(task.id, savedNote.trim());
                          return;
                        }
                        // If overdue OR has outcome set, prevent default toggle
                        if (shouldShowMenu) {
                          // Don't toggle, menu will be opened by onClick handler
                          return;
                        }
                        // Normal toggle behavior
                        if (isSubtask) {
                          onToggle?.(parentTaskId, task.id);
                        } else {
                          onToggle?.(task.id);
                        }
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        // If overdue OR has outcome set, open menu instead of toggling
                        if (shouldShowMenu) {
                          e.preventDefault();
                          e.stopPropagation();
                          menuJustOpenedRef.current = true;
                          setOutcomeMenuOpen(true);
                        }
                      }}
                      onMouseDown={e => {
                        e.stopPropagation();
                        // Prevent default checkbox behavior when we want to show menu
                        if (shouldShowMenu) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onPointerDown={e => e.stopPropagation()}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control
                        bg={outcome === "not_completed" ? "white" : undefined}
                        boxShadow="none"
                        outline="none"
                        _focus={{ boxShadow: "none", outline: "none" }}
                        _focusVisible={{ boxShadow: "none", outline: "none" }}
                      >
                        {outcome === "completed" || isTextTaskCompleted ? (
                          <Checkbox.Indicator>
                            <Check size={14} />
                          </Checkbox.Indicator>
                        ) : outcome === "not_completed" ? (
                          <Box as="span" display="flex" alignItems="center" justifyContent="center" w="100%" h="100%">
                            <Box as="span" color={mode.text.muted}>
                              <X size={18} stroke="currentColor" style={{ strokeWidth: 3 }} />
                            </Box>
                          </Box>
                        ) : null}
                      </Checkbox.Control>
                    </Checkbox.Root>
                  </Box>
                </Menu.Trigger>
                {shouldShowMenu && (
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content onClick={e => e.stopPropagation()}>
                        {/* Only show Uncheck if task has an outcome */}
                        {outcome !== null && (
                          <>
                            <Menu.Item
                              onClick={e => {
                                e.stopPropagation();
                                onOutcomeChange(task.id, viewDate, null);
                              }}
                            >
                              <HStack>
                                <Circle size={14} />
                                <Text>Uncheck</Text>
                              </HStack>
                            </Menu.Item>
                            <Menu.Separator />
                          </>
                        )}
                        {/* Only show Completed if not already completed */}
                        {outcome !== "completed" && (
                          <Menu.Item
                            onClick={e => {
                              e.stopPropagation();
                              onOutcomeChange(task.id, viewDate, "completed");
                            }}
                          >
                            <HStack>
                              <Check size={14} />
                              <Text>Completed</Text>
                            </HStack>
                          </Menu.Item>
                        )}
                        {/* Only show Not Completed if not already not completed */}
                        {outcome !== "not_completed" && (
                          <Menu.Item
                            onClick={e => {
                              e.stopPropagation();
                              onOutcomeChange(task.id, viewDate, "not_completed");
                            }}
                          >
                            <HStack>
                              <X size={14} />
                              <Text>Not Completed</Text>
                            </HStack>
                          </Menu.Item>
                        )}
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                )}
              </Menu.Root>
            )}
          </Box>
          {/* Color indicator */}
          {/* <Box w={3} h={3} borderRadius="full" bg={task.color || "#3b82f6"} flexShrink={0} /> */}

          {/* Task content */}
          <Box flex={1} minW={0} overflow="hidden">
            <Flex align="center" gap={0} w="100%" maxW="100%">
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  variant="unstyled"
                  fontWeight="medium"
                  fontSize="md"
                  color={textColor}
                  px={1}
                  py={0}
                  minH="auto"
                  h="auto"
                  _focus={{
                    outline: "none",
                  }}
                  w="100%"
                />
              ) : (
                <Text
                  fontWeight="medium"
                  fontSize={{ base: "sm", md: "md" }}
                  textDecoration={shouldShowStrikethrough ? "line-through" : "none"}
                  opacity={shouldShowStrikethrough ? 0.5 : 1}
                  color={textColor}
                  cursor="text"
                  onClick={handleTitleClick}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  _hover={{
                    opacity: shouldShowStrikethrough ? 0.7 : 1,
                  }}
                  noOfLines={2}
                  wordBreak="break-word"
                >
                  {task.title}
                </Text>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <Text
                  as="span"
                  ml={{ base: 1, md: 2 }}
                  fontSize={{ base: "2xs", md: "xs" }}
                  color={mutedText}
                  flexShrink={0}
                >
                  ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
                </Text>
              )}
            </Flex>
            {/* Text Input for text-type tasks */}
            {isTextTask && (isToday || isBacklog) && (
              <Box w="full" mt={2} key={`text-input-${task.id}-${viewDate?.toISOString()}`}>
                <TextInputTask
                  taskId={task.id}
                  savedNote={savedNote}
                  isNotCompleted={isNotCompleted}
                  onCompleteWithNote={onCompleteWithNote}
                  mode={mode}
                />
              </Box>
            )}
            {/* Badges - show for backlog and today variants */}
            {(isBacklog || isToday) && (
              <HStack spacing={{ base: 1, md: 2 }} mt={{ base: 0.5, md: 1 }} align="center" flexWrap="wrap">
                {/* Status badge - only show for non-recurring tasks */}
                {!isRecurring && task.status && (
                  <Badge
                    size={{ base: "xs", md: "sm" }}
                    colorPalette={
                      task.status === "in_progress" ? "blue" : task.status === "complete" ? "green" : "gray"
                    }
                    fontSize={{ base: "3xs", md: "2xs" }}
                    py={{ base: 0, md: 1 }}
                    px={{ base: 1, md: 2 }}
                  >
                    <HStack spacing={{ base: 0.5, md: 1 }} align="center">
                      <Box as="span" color="currentColor">
                        {task.status === "in_progress" ? (
                          <PlayCircle size={10} stroke="currentColor" />
                        ) : task.status === "complete" ? (
                          <CheckCircle size={10} stroke="currentColor" />
                        ) : (
                          <Circle size={10} stroke="currentColor" />
                        )}
                      </Box>
                      <Text as="span">
                        {task.status === "in_progress"
                          ? "In Progress"
                          : task.status === "complete"
                            ? "Complete"
                            : "Todo"}
                      </Text>
                    </HStack>
                  </Badge>
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
                      <TagChip key={tag.id} tag={tag} size={{ base: "xs", md: "sm" }} />
                    ))}
                  </>
                )}
              </HStack>
            )}
            {/* Note content preview - show below badges */}
            {task.content && (
              <Text
                fontSize={{ base: "xs", md: "sm" }}
                color={mutedText}
                mt={{ base: 0.5, md: 1 }}
                noOfLines={1}
                wordBreak="break-word"
              >
                {/* Strip HTML tags for preview */}
                {task.content.replace(/<[^>]*>/g, "").trim() || ""}
              </Text>
            )}
            {/* Tags for kanban variant */}
            {variant === "kanban" && task.tags && task.tags.length > 0 && (
              <HStack spacing={1.5} mt={1.5} align="center" flexWrap="wrap">
                {task.tags.map(tag => (
                  <TagChip key={tag.id} tag={tag} size="sm" />
                ))}
              </HStack>
            )}
          </Box>

          {/* Begin Workout button for workout-type tasks */}
          {isWorkoutTask && onBeginWorkout && (isToday || isBacklog) && (
            <Button
              size="sm"
              colorPalette={
                workoutButtonText === "View Results" ? "purple" : workoutButtonText === "Continue" ? "green" : "blue"
              }
              variant="outline"
              onClick={e => {
                e.stopPropagation();
                onBeginWorkout(task);
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              flexShrink={0}
            >
              <Dumbbell size={14} />
              <Text ml={1} display={{ base: "none", md: "inline" }}>
                {workoutButtonText}
              </Text>
            </Button>
          )}

          {/* Time display */}
          {task.time && (
            <HStack spacing={{ base: 0.5, md: 1 }} flexShrink={0}>
              <Box as="span" color={mutedText}>
                <Clock size={12} stroke="currentColor" />
              </Box>
              <Text fontSize={{ base: "xs", md: "sm" }} color={mutedText} whiteSpace="nowrap">
                {formatTime(task.time)}
              </Text>
            </HStack>
          )}

          {/* Action menu */}
          <Menu.Root open={actionMenuOpen} onOpenChange={({ open }) => setActionMenuOpen(open)}>
            <Menu.Trigger asChild>
              <IconButton
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
                size={{ base: "xs", md: "sm" }}
                variant="ghost"
                aria-label="Task actions"
                border="none"
                outline="none"
                minW={{ base: "24px", md: "32px" }}
                h={{ base: "24px", md: "32px" }}
                p={{ base: 0, md: 1 }}
                _hover={{ border: "none", outline: "none" }}
                _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                _active={{ border: "none", outline: "none" }}
              >
                <Box as="span" color="currentColor">
                  <MoreVertical size={14} stroke="currentColor" />
                </Box>
              </IconButton>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                  {/* Show Bulk Edit option if multiple tasks are selected */}
                  {selectedCountComputed > 0 && onBulkEdit && (
                    <>
                      <Menu.Item
                        onClick={e => {
                          e.stopPropagation();
                          onBulkEdit();
                          setActionMenuOpen(false);
                        }}
                      >
                        <HStack gap={2}>
                          <Box
                            as="span"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            w="14px"
                            h="14px"
                            flexShrink={0}
                          >
                            <Edit2 size={14} />
                          </Box>
                          <Text>Bulk Edit ({selectedCountComputed} selected)</Text>
                        </HStack>
                      </Menu.Item>
                      <Menu.Separator />
                    </>
                  )}
                  {/* Shared context menu for common actions */}
                  <TaskContextMenu
                    task={task}
                    date={viewDate}
                    isRecurring={isRecurring}
                    isWorkoutTask={isWorkoutTask}
                    outcome={outcome}
                    onEdit={onEdit}
                    onEditWorkout={onEditWorkout}
                    onDuplicate={onDuplicate}
                    onDelete={isSubtask ? taskId => onDelete?.(parentTaskId, taskId) : onDelete}
                    onOutcomeChange={onOutcomeChange}
                    onClose={() => setActionMenuOpen(false)}
                    tags={tags}
                    onTagsChange={onTagsChange}
                    onCreateTag={onCreateTag}
                    onStatusChange={statusHandlers.handleStatusChange}
                  />
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>

        {/* Expanded subtasks */}
        {onToggleSubtask && (
          <Collapse in={task.expanded}>
            <Box pl={{ base: 8, md: 16 }} pr={{ base: 2, md: 3 }} pb={{ base: 2, md: 3 }}>
              <VStack align="stretch" spacing={{ base: 1.5, md: 2 }}>
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
                  <Input
                    ref={newSubtaskInputRef}
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleNewSubtaskKeyDown}
                    onBlur={handleCreateSubtask}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    placeholder="New subtask..."
                    variant="unstyled"
                    fontSize={{ base: "sm", md: "md" }}
                    color={textColor}
                    px={2}
                    py={2}
                    minH="auto"
                    h="auto"
                    bg="transparent"
                    _placeholder={{
                      color: mutedText,
                    }}
                    _focus={{
                      outline: "none",
                      bg: "transparent",
                    }}
                    _hover={{
                      bg: "transparent",
                    }}
                  />
                )}
              </VStack>
            </Box>
          </Collapse>
        )}
      </Box>
    </Box>
  );
};

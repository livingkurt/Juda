"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Checkbox, Text, Flex, HStack, IconButton, VStack, Input, Badge, Menu, Portal } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  Copy,
  AlertCircle,
  MoreVertical,
  Check,
  X,
  Circle,
  PlayCircle,
  CheckCircle,
} from "lucide-react";
import { formatTime, isOverdue, getRecurrenceLabel, getTaskDisplayColor } from "@/lib/utils";
import { TagChip } from "./TagChip";

export const TaskItem = ({
  task,
  variant = "today", // "today", "backlog", "subtask", or "kanban"
  containerId, // Container ID for sortable context
  onToggle,
  onToggleSubtask,
  onToggleExpand,
  onEdit,
  onEditTask, // Alternative prop name for backlog variant
  onUpdateTitle,
  onUpdateTaskTitle, // Alternative prop name for backlog variant
  onDelete,
  onDeleteTask, // Alternative prop name for backlog variant
  onDuplicate,
  onDuplicateTask, // Alternative prop name for backlog variant
  draggableId,
  textColor: textColorProp, // Optional override
  mutedText: mutedTextProp, // Optional override
  gripColor: gripColorProp, // Optional override
  viewDate, // Date being viewed (for overdue calculation)
  parentTaskId, // For subtask variant
  onOutcomeChange, // Handler for outcome changes
  getOutcomeOnDate, // Function to get outcome for a task on a date
  hasRecordOnDate, // Function to check if task has any record on a date
  onCompleteWithNote, // (taskId, note) => void - for text completion
  getCompletionForDate, // (taskId, date) => completion object
  onStatusChange, // Handler for status changes (kanban)
  isSelected, // Whether this task is selected for bulk edit
  onSelect, // Handler for task selection (taskId, event) => void
  selectedCount, // Number of tasks currently selected
  onBulkEdit, // Handler to open bulk edit dialog
}) => {
  // Normalize prop names - support both naming conventions
  const handleEdit = onEdit || onEditTask;
  const handleUpdateTitle = onUpdateTitle || onUpdateTaskTitle;
  const handleDelete = onDelete || onDeleteTask;
  const handleDuplicate = onDuplicate || onDuplicateTask;

  const isBacklog = variant === "backlog";
  const isToday = variant === "today";
  const isSubtask = variant === "subtask";

  const bgColor = { _light: "white", _dark: "gray.800" };
  const hoverBg = { _light: "gray.50", _dark: "gray.700" };
  const textColorDefault = { _light: "gray.900", _dark: "gray.100" };
  const mutedTextDefault = { _light: "gray.500", _dark: "gray.400" };
  const gripColorDefault = { _light: "gray.400", _dark: "gray.500" };

  const textColor = textColorProp || textColorDefault;
  const mutedText = mutedTextProp || mutedTextDefault;
  const gripColor = gripColorProp || gripColorDefault;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleInputRef = useRef(null);
  const [noteInput, setNoteInput] = useState("");
  const noteInputRef = useRef(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  useEffect(() => {
    setEditedTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleClick = e => {
    e.stopPropagation();
    if (!isEditingTitle) {
      setIsEditingTitle(true);
    }
  };

  const handleTitleBlur = async () => {
    if (editedTitle.trim() && editedTitle !== task.title && handleUpdateTitle) {
      await handleUpdateTitle(task.id, editedTitle);
    } else if (!editedTitle.trim()) {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = async e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editedTitle.trim() && editedTitle !== task.title && handleUpdateTitle) {
        await handleUpdateTitle(task.id, editedTitle);
      }
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    }
  };

  const allSubtasksComplete = task.subtasks && task.subtasks.length > 0 && task.subtasks.every(st => st.completed);
  // For subtasks, just check their own completion status. For parent tasks, check if all subtasks are complete too.
  const isChecked = isSubtask ? task.completed : task.completed || allSubtasksComplete;

  // Get existing completion data for text-type tasks
  const existingCompletion = getCompletionForDate?.(task.id, viewDate);
  const isTextTask = task.completionType === "text";
  const isNotCompleted = existingCompletion?.outcome === "not_completed" || false;
  const savedNote = existingCompletion?.note || "";
  // For text tasks, completion status comes from the completion record, not task.completed
  const isTextTaskCompleted =
    isTextTask &&
    (existingCompletion?.outcome === "completed" ||
      (existingCompletion && existingCompletion.outcome !== "not_completed" && existingCompletion.note));

  // Initialize noteInput from saved note - update whenever savedNote or existingCompletion changes
  useEffect(() => {
    if (isTextTask && viewDate) {
      const currentNote = existingCompletion?.note || "";
      // Only update if different to avoid unnecessary re-renders
      if (currentNote !== noteInput) {
        setNoteInput(currentNote);
      }
    } else if (!isTextTask) {
      setNoteInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTextTask, existingCompletion?.note, viewDate]);

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
  const taskColor = getTaskDisplayColor(task);

  return (
    <Box ref={setNodeRef} style={style} w="100%" maxW="100%">
      <Box
        borderRadius="lg"
        bg={isSelected ? { _light: "blue.50", _dark: "blue.900" } : bgColor}
        transition="box-shadow 0.2s, border-color 0.2s, background-color 0.2s"
        borderColor={isSelected ? { _light: "blue.500", _dark: "blue.400" } : taskColor || "gray.300"}
        _dark={{ borderColor: isSelected ? "blue.400" : taskColor || "gray.600" }}
        borderWidth="2px"
        borderStyle="solid"
        w="100%"
        maxW="100%"
        overflow="hidden"
        boxShadow={isSelected ? "0 0 0 2px var(--chakra-colors-blue-400)" : "none"}
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
                        isTextTask ? isTextTaskCompleted : outcome === "completed" || (outcome === null && isChecked)
                      }
                      size="md"
                      onCheckedChange={() => {
                        // For text tasks, complete when checkbox is checked
                        if (isTextTask && !isTextTaskCompleted && noteInput.trim()) {
                          onCompleteWithNote?.(task.id, noteInput.trim());
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
                            <Box as="span" color="gray.700">
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
              <Box w="full" mt={2}>
                <Input
                  ref={noteInputRef}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder="Enter response to complete..."
                  size="sm"
                  variant="filled"
                  disabled={isNotCompleted}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  onBlur={() => {
                    // Save on blur if note has content
                    if (noteInput.trim() && noteInput.trim() !== savedNote) {
                      onCompleteWithNote?.(task.id, noteInput.trim());
                    } else if (!noteInput.trim() && savedNote) {
                      // If cleared, reset to saved note
                      setNoteInput(savedNote);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (noteInput.trim()) {
                        onCompleteWithNote?.(task.id, noteInput.trim());
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
                  bg={isNotCompleted ? "gray.100" : undefined}
                  _dark={{
                    bg: isNotCompleted ? "gray.700" : undefined,
                  }}
                />
                {isNotCompleted && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Not Completed
                  </Text>
                )}
              </Box>
            )}
            {/* Badges - show for backlog and today variants */}
            {(isBacklog || isToday) && (
              <HStack spacing={{ base: 1, md: 2 }} mt={{ base: 0.5, md: 1 }} align="center" flexWrap="wrap">
                {/* Overdue badge - hide if task is in_progress */}
                {task.status !== "in_progress" &&
                  isOverdue(task, viewDate, hasRecordOnDate ? hasRecordOnDate(task.id, viewDate) : task.completed) && (
                    <Badge
                      size={{ base: "xs", md: "sm" }}
                      colorPalette="red"
                      fontSize={{ base: "3xs", md: "2xs" }}
                      py={{ base: 0, md: 1 }}
                      px={{ base: 1, md: 2 }}
                    >
                      <HStack spacing={{ base: 0.5, md: 1 }} align="center">
                        <Box as="span" color="currentColor">
                          <AlertCircle size={10} stroke="currentColor" />
                        </Box>
                        <Text as="span">Overdue</Text>
                      </HStack>
                    </Badge>
                  )}
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
                {task.recurrence && task.recurrence.type !== "none" && (
                  <Badge
                    size={{ base: "xs", md: "sm" }}
                    colorPalette="purple"
                    fontSize={{ base: "3xs", md: "2xs" }}
                    py={{ base: 0, md: 1 }}
                    px={{ base: 1, md: 2 }}
                  >
                    {getRecurrenceLabel(task.recurrence) || "Recurring"}
                  </Badge>
                )}
                {task.recurrence?.endDate && (
                  <Badge
                    size={{ base: "xs", md: "sm" }}
                    colorPalette="orange"
                    fontSize={{ base: "3xs", md: "2xs" }}
                    py={{ base: 0, md: 1 }}
                    px={{ base: 1, md: 2 }}
                  >
                    Ends{" "}
                    {new Date(task.recurrence.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Badge>
                )}
                {!task.time && !isBacklog && (
                  <Badge
                    size={{ base: "xs", md: "sm" }}
                    colorPalette="orange"
                    fontSize={{ base: "3xs", md: "2xs" }}
                    py={{ base: 0, md: 1 }}
                    px={{ base: 1, md: 2 }}
                  >
                    No time
                  </Badge>
                )}
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
                  {selectedCount > 0 && onBulkEdit && (
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
                          <Text>Bulk Edit ({selectedCount} selected)</Text>
                        </HStack>
                      </Menu.Item>
                      <Menu.Separator />
                    </>
                  )}
                  <Menu.Item
                    onClick={e => {
                      e.stopPropagation();
                      handleEdit(task);
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
                      <Text>Edit</Text>
                    </HStack>
                  </Menu.Item>
                  {/* Not Completed option for recurring tasks in today view */}
                  {isToday && !taskIsOverdue && onOutcomeChange && isRecurring && (
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        onOutcomeChange(task.id, viewDate, "not_completed");
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
                          <X size={14} />
                        </Box>
                        <Text>Not Completed</Text>
                      </HStack>
                    </Menu.Item>
                  )}
                  {handleDuplicate && (
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        handleDuplicate(task.id);
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
                          <Copy size={14} />
                        </Box>
                        <Text>Duplicate</Text>
                      </HStack>
                    </Menu.Item>
                  )}
                  {/* Status options for non-recurring tasks */}
                  {onStatusChange && !isRecurring && (
                    <>
                      <Menu.Separator />
                      <Menu.Item
                        onClick={e => {
                          e.stopPropagation();
                          onStatusChange(task.id, "todo");
                          setActionMenuOpen(false);
                        }}
                        disabled={task.status === "todo"}
                      >
                        <HStack gap={2}>
                          <Circle size={14} />
                          <Text>Set to Todo</Text>
                        </HStack>
                      </Menu.Item>
                      <Menu.Item
                        onClick={e => {
                          e.stopPropagation();
                          onStatusChange(task.id, "in_progress");
                          setActionMenuOpen(false);
                        }}
                        disabled={task.status === "in_progress"}
                      >
                        <HStack gap={2}>
                          <Clock size={14} />
                          <Text>Set to In Progress</Text>
                        </HStack>
                      </Menu.Item>
                      <Menu.Item
                        onClick={e => {
                          e.stopPropagation();
                          onStatusChange(task.id, "complete");
                          setActionMenuOpen(false);
                        }}
                        disabled={task.status === "complete"}
                      >
                        <HStack gap={2}>
                          <Check size={14} />
                          <Text>Set to Complete</Text>
                        </HStack>
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item
                    color="red.500"
                    onClick={e => {
                      e.stopPropagation();
                      isSubtask ? handleDelete(parentTaskId, task.id) : handleDelete(task.id);
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
                        <Trash2 size={14} />
                      </Box>
                      <Text>Delete</Text>
                    </HStack>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        </Flex>

        {/* Expanded subtasks */}
        {task.expanded && task.subtasks && task.subtasks.length > 0 && onToggleSubtask && (
          <Box pl={{ base: 8, md: 16 }} pr={{ base: 2, md: 3 }} pb={{ base: 2, md: 3 }}>
            <VStack align="stretch" spacing={{ base: 1.5, md: 2 }}>
              {task.subtasks.map(subtask => (
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
                  onEdit={handleEdit ? () => handleEdit(subtask) : undefined}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete ? async (parentId, subtaskId) => handleDelete(subtaskId) : undefined}
                  textColor={textColor}
                  mutedText={mutedText}
                  gripColor={gripColor}
                  viewDate={viewDate}
                  onOutcomeChange={onOutcomeChange}
                  getOutcomeOnDate={getOutcomeOnDate}
                  hasRecordOnDate={hasRecordOnDate}
                />
              ))}
            </VStack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

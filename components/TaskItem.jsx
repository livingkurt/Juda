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
  Badge,
  Menu,
  Tag,
  Portal,
} from "@chakra-ui/react";
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
  SkipForward,
  Circle,
} from "lucide-react";
import { ColorSubmenu } from "./ColorSubmenu";
import { formatTime, isOverdue } from "@/lib/utils";
import { DAYS_OF_WEEK } from "@/lib/constants";

export const TaskItem = ({
  task,
  variant = "today", // "today", "backlog", or "subtask"
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
  onUpdateTaskColor, // (taskId, color) => void - for updating task color
  selectionMode = false, // Whether selection mode is active
  isSelected = false, // Whether this task is selected
  onToggleSelection, // (taskId) => void - toggle selection
  onShiftClick, // (taskId) => void - handle shift+click for range selection
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
  const selectedBg = { _light: "blue.50", _dark: "blue.900" };
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
  const isSkipped = existingCompletion?.skipped || false;
  const savedNote = existingCompletion?.note || "";
  // For text tasks, completion status comes from the completion record, not task.completed
  const isTextTaskCompleted =
    isTextTask &&
    (existingCompletion?.outcome === "completed" ||
      (existingCompletion && !existingCompletion.skipped && existingCompletion.note));

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

  // Check if task has any outcome (completed or skipped) - should show strikethrough
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

  // Format weekly recurrence days into readable text
  const formatWeeklyDays = days => {
    if (!days || days.length === 0) return "Weekly";
    const dayLabels = days
      .sort((a, b) => a - b) // Sort by day number (0=Sun, 6=Sat)
      .map(dayValue => {
        const day = DAYS_OF_WEEK.find(d => d.value === dayValue);
        return day ? day.label : "";
      })
      .filter(Boolean);
    return dayLabels.join(", ");
  };

  // Check if we should show menu: only for recurring tasks that are overdue OR have outcome set (skipped)
  // Works for today view tasks, subtasks, and backlog items
  const shouldShowMenu =
    (isToday || isSubtask || isBacklog) && onOutcomeChange && isRecurring && (taskIsOverdue || outcome !== null);

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

  // Simple border style without drop target feedback
  const borderStyle = {
    borderColor: isSelected ? "blue.400" : task.color,
    borderWidth: isSelected ? "2px" : "2px",
    borderStyle: "solid",
  };

  // Handle selection click - support Cmd+Click and Shift+Click even when not in selection mode
  const handleSelectionClick = e => {
    // Cmd/Ctrl+Click or Shift+Click - toggle selection (auto-enable selection mode)
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      e.stopPropagation();
      if (e.shiftKey && onShiftClick) {
        onShiftClick(task.id);
      } else if (onToggleSelection) {
        onToggleSelection(task.id);
      }
      return;
    }

    // Regular click in selection mode
    if (selectionMode) {
      e.stopPropagation();
      if (onToggleSelection) {
        onToggleSelection(task.id);
      }
    }
  };

  return (
    <Box ref={setNodeRef} style={style} w="100%" maxW="100%">
      <Box
        borderRadius="lg"
        bg={isSelected ? selectedBg : bgColor}
        transition="box-shadow 0.2s, border-color 0.2s"
        {...borderStyle}
        w="100%"
        maxW="100%"
        overflow="hidden"
      >
        <Flex
          align="center"
          gap={{ base: 1.5, md: 2 }}
          p={{ base: 2, md: 3 }}
          _hover={{ bg: selectionMode ? (isSelected ? selectedBg : hoverBg) : hoverBg }}
          _active={{ cursor: isDragDisabled ? (selectionMode ? "pointer" : "default") : "grabbing" }}
          {...(isDragDisabled || selectionMode ? {} : attributes)}
          {...(isDragDisabled || selectionMode ? {} : listeners)}
          cursor={isDragDisabled ? (selectionMode ? "pointer" : "default") : selectionMode ? "pointer" : "grab"}
          onClick={handleSelectionClick}
          w="100%"
          maxW="100%"
          overflow="hidden"
        >
          {/* Selection checkbox - show in selection mode */}
          {selectionMode && (
            <Checkbox.Root
              checked={isSelected}
              onCheckedChange={() => {
                if (onToggleSelection) {
                  onToggleSelection(task.id);
                }
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size="md"
            >
              <Checkbox.Control />
            </Checkbox.Root>
          )}

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
                        bg={outcome === "skipped" ? "white" : undefined}
                        boxShadow="none"
                        outline="none"
                        _focus={{ boxShadow: "none", outline: "none" }}
                        _focusVisible={{ boxShadow: "none", outline: "none" }}
                      >
                        {outcome === "completed" || isTextTaskCompleted ? (
                          <Checkbox.Indicator>
                            <Check size={14} />
                          </Checkbox.Indicator>
                        ) : outcome === "skipped" ? (
                          <Box as="span" display="flex" alignItems="center" justifyContent="center" w="100%" h="100%">
                            <Box as="span" color="gray.700">
                              <SkipForward size={12} stroke="currentColor" />
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
                        {/* Only show Skipped if not already skipped */}
                        {outcome !== "skipped" && (
                          <Menu.Item
                            onClick={e => {
                              e.stopPropagation();
                              onOutcomeChange(task.id, viewDate, "skipped");
                            }}
                          >
                            <HStack>
                              <SkipForward size={14} />
                              <Text>Skipped</Text>
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
                  disabled={isSkipped}
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
                  bg={isSkipped ? "gray.100" : undefined}
                  _dark={{
                    bg: isSkipped ? "gray.700" : undefined,
                  }}
                />
                {isSkipped && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Skipped
                  </Text>
                )}
              </Box>
            )}
            {/* Badges - show for backlog and today variants */}
            {(isBacklog || isToday) && (
              <HStack spacing={{ base: 1, md: 2 }} mt={{ base: 0.5, md: 1 }} align="center" flexWrap="wrap">
                {isOverdue(task, viewDate, hasRecordOnDate ? hasRecordOnDate(task.id, viewDate) : task.completed) && (
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
                {task.recurrence && task.recurrence.type !== "none" && (
                  <Badge
                    size={{ base: "xs", md: "sm" }}
                    colorPalette="purple"
                    fontSize={{ base: "3xs", md: "2xs" }}
                    py={{ base: 0, md: 1 }}
                    px={{ base: 1, md: 2 }}
                  >
                    {task.recurrence.type === "daily"
                      ? "Daily"
                      : task.recurrence.type === "weekly"
                        ? formatWeeklyDays(task.recurrence.days)
                        : task.recurrence.type === "monthly"
                          ? "Monthly"
                          : task.recurrence.type === "interval"
                            ? `Every ${task.recurrence.interval} days`
                            : "Recurring"}
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
                      <Tag.Root
                        key={tag.id}
                        size={{ base: "xs", md: "sm" }}
                        borderRadius="full"
                        bg={tag.color}
                        color="white"
                        fontSize={{ base: "3xs", md: "2xs" }}
                        py={{ base: 0, md: 1 }}
                        px={{ base: 1.5, md: 2 }}
                      >
                        <Tag.Label>{tag.name}</Tag.Label>
                      </Tag.Root>
                    ))}
                  </>
                )}
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
                  {/* Color submenu */}
                  {onUpdateTaskColor && (
                    <ColorSubmenu
                      currentColor={task.color || "#3b82f6"}
                      onColorChange={color => {
                        onUpdateTaskColor(task.id, color);
                        setActionMenuOpen(false);
                      }}
                      onCloseParentMenu={() => setActionMenuOpen(false)}
                    />
                  )}
                  {/* Skip option for recurring tasks in today view */}
                  {isToday && !taskIsOverdue && onOutcomeChange && isRecurring && (
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        onOutcomeChange(task.id, viewDate, "skipped");
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
                          <SkipForward size={14} />
                        </Box>
                        <Text>Skip</Text>
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
                  task={subtask}
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

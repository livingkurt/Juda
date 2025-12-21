"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  GripVertical,
  Copy,
  AlertCircle,
  MoreVertical,
} from "lucide-react";
import { formatTime, isOverdue } from "@/lib/utils";
import { createDroppableId } from "@/lib/dragHelpers";

export const TaskItem = ({
  task,
  variant = "today", // "today", "backlog", or "subtask"
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
  getSectionName, // For backlog variant to show section name
  textColor: textColorProp, // Optional override
  mutedText: mutedTextProp, // Optional override
  gripColor: gripColorProp, // Optional override
  viewDate, // Date being viewed (for overdue calculation)
  parentTaskId, // For subtask variant
}) => {
  // Normalize prop names - support both naming conventions
  const handleEdit = onEdit || onEditTask;
  const handleUpdateTitle = onUpdateTitle || onUpdateTaskTitle;
  const handleDelete = onDelete || onDeleteTask;
  const handleDuplicate = onDuplicate || onDuplicateTask;

  const isBacklog = variant === "backlog";
  const isToday = variant === "today";
  const isSubtask = variant === "subtask";

  const bgColor = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColorDefault = useColorModeValue("gray.900", "gray.100");
  const mutedTextDefault = useColorModeValue("gray.500", "gray.400");
  const gripColorDefault = useColorModeValue("gray.400", "gray.500");

  const textColor = textColorProp || textColorDefault;
  const mutedText = mutedTextProp || mutedTextDefault;
  const gripColor = gripColorProp || gripColorDefault;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const titleInputRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

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

  // Extract containerId from draggableId
  let containerId = null;
  if (draggableId) {
    if (draggableId.includes("-today-section-")) {
      const match = draggableId.match(/-today-section-([^-]+)/);
      if (match) containerId = `today-section|${match[1]}`;
    } else if (draggableId.includes("-backlog") || draggableId.includes("backlog")) {
      containerId = "backlog";
    }
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: draggableId,
    data: {
      type: "TASK",
      containerId: containerId,
    },
  });

  // Make task a drop target for combining tasks
  const taskDropId = createDroppableId.taskTarget(task.id);
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: taskDropId,
    data: {
      type: "TASK_TARGET",
      taskId: task.id,
    },
  });

  // Hover-to-expand: Auto-expand when dragging over for 800ms
  const handleDragOver = useCallback(() => {
    if (!isOver || !task.subtasks || task.subtasks.length === 0) return;

    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set new timeout to expand after 800ms
    hoverTimeoutRef.current = setTimeout(() => {
      if (!task.expanded && onToggleExpand) {
        onToggleExpand(task.id);
      }
    }, 800);
  }, [isOver, task.subtasks, task.expanded, task.id, onToggleExpand]);

  useEffect(() => {
    if (isOver) {
      handleDragOver();
    } else {
      // Clear timeout when no longer hovering
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isOver, handleDragOver]);

  // Combine refs for sortable and droppable
  const combinedRef = node => {
    setNodeRef(node);
    setDropRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  // Visual feedback for drop target
  const dropTargetStyle = {
    borderColor: isOver ? "blue.400" : task.color,
    borderWidth: isOver ? "2px" : "2px",
    borderStyle: isOver ? "dashed" : "solid",
    transform: isOver ? "scale(1.02)" : "scale(1)",
    transition: "all 0.2s ease",
  };

  return (
    <Box ref={combinedRef} style={style}>
      <Box borderRadius="lg" bg={bgColor} transition="box-shadow 0.2s, border-color 0.2s" {...dropTargetStyle}>
        <Flex align="center" gap={2} p={3} _hover={{ bg: hoverBg }} _active={{ cursor: "grabbing" }}>
          {/* Drag handle */}
          <Box {...attributes} {...listeners} cursor="grab" _active={{ cursor: "grabbing" }} color={gripColor}>
            <GripVertical size={16} stroke="currentColor" />
          </Box>

          {/* Expand button for subtasks */}
          {task.subtasks && task.subtasks.length > 0 ? (
            onToggleExpand ? (
              <IconButton
                icon={
                  <Box as="span" color="currentColor">
                    {task.expanded ? (
                      <ChevronDown size={16} stroke="currentColor" />
                    ) : (
                      <ChevronRight size={16} stroke="currentColor" />
                    )}
                  </Box>
                }
                onClick={e => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
                onMouseDown={e => e.stopPropagation()}
                size="sm"
                variant="ghost"
                aria-label="Toggle expand"
              />
            ) : (
              <Box w={6} />
            )
          ) : (
            <Box />
          )}

          {/* Checkbox - show for today, backlog, and subtask variants */}
          <Checkbox
            isChecked={task.completed || allSubtasksComplete}
            size="lg"
            onChange={() => (isSubtask ? onToggle?.(parentTaskId, task.id) : onToggle?.(task.id))}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          />
          {/* Color indicator */}
          {/* <Box w={3} h={3} borderRadius="full" bg={task.color || "#3b82f6"} flexShrink={0} /> */}

          {/* Task content */}
          <Box flex={1} minW={0}>
            <Flex align="center" gap={0}>
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={e => e.stopPropagation()}
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
                />
              ) : (
                <Text
                  fontWeight="medium"
                  textDecoration={task.completed || allSubtasksComplete ? "line-through" : "none"}
                  opacity={task.completed || allSubtasksComplete ? 0.5 : 1}
                  color={textColor}
                  cursor="text"
                  onClick={handleTitleClick}
                  _hover={{
                    opacity: task.completed || allSubtasksComplete ? 0.7 : 1,
                  }}
                >
                  {task.title}
                </Text>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <Text as="span" ml={2} fontSize="xs" color={mutedText} flexShrink={0}>
                  ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
                </Text>
              )}
            </Flex>
            {/* Badges - show for backlog and today variants */}
            {(isBacklog || isToday) && (
              <HStack spacing={2} mt={1} align="center">
                {isOverdue(task, viewDate, task.completed) && (
                  <Badge size="sm" colorScheme="red" fontSize="2xs">
                    <HStack spacing={1} align="center">
                      <Box as="span" color="currentColor">
                        <AlertCircle size={10} stroke="currentColor" />
                      </Box>
                      <Text as="span">Overdue</Text>
                    </HStack>
                  </Badge>
                )}
                {isBacklog && getSectionName && task.sectionId && (
                  <Text fontSize="xs" color={mutedText}>
                    {getSectionName(task.sectionId)}
                  </Text>
                )}
                {task.recurrence && task.recurrence.type !== "none" && (
                  <Badge size="sm" colorScheme="purple" fontSize="2xs">
                    {task.recurrence.type === "daily"
                      ? "Daily"
                      : task.recurrence.type === "weekly"
                        ? "Weekly"
                        : "Recurring"}
                  </Badge>
                )}
                {!task.time && (
                  <Badge size="sm" colorScheme="orange" fontSize="2xs">
                    No time
                  </Badge>
                )}
              </HStack>
            )}
          </Box>

          {/* Time display */}
          {task.time && (
            <HStack spacing={1}>
              <Box as="span" color={mutedText}>
                <Clock size={14} stroke="currentColor" />
              </Box>
              <Text fontSize="sm" color={mutedText}>
                {formatTime(task.time)}
              </Text>
            </HStack>
          )}

          {/* Action menu */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={
                <Box as="span" color="currentColor">
                  <MoreVertical size={16} stroke="currentColor" />
                </Box>
              }
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              size={"sm"}
              variant="ghost"
              aria-label="Task actions"
            />
            <Portal>
              <MenuList onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                <MenuItem
                  icon={<Edit2 size={16} />}
                  onClick={e => {
                    e.stopPropagation();
                    handleEdit(task);
                  }}
                >
                  Edit
                </MenuItem>
                {handleDuplicate && (
                  <MenuItem
                    icon={<Copy size={16} />}
                    onClick={e => {
                      e.stopPropagation();
                      handleDuplicate(task.id);
                    }}
                  >
                    Duplicate
                  </MenuItem>
                )}
                <MenuItem
                  icon={<Trash2 size={16} />}
                  color="red.500"
                  onClick={e => {
                    e.stopPropagation();
                    isSubtask ? handleDelete(parentTaskId, task.id) : handleDelete(task.id);
                  }}
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
        </Flex>

        {/* Expanded subtasks */}
        {task.expanded && task.subtasks && task.subtasks.length > 0 && onToggleSubtask && (
          <Box pl={16} pr={3} pb={3}>
            <SortableContext
              items={task.subtasks.map(st => createDroppableId.subtask(task.id, st.id))}
              strategy={verticalListSortingStrategy}
            >
              <VStack align="stretch" spacing={2}>
                {task.subtasks.map(subtask => (
                  <TaskItem
                    key={subtask.id}
                    task={subtask}
                    variant="subtask"
                    parentTaskId={task.id}
                    draggableId={createDroppableId.subtask(task.id, subtask.id)}
                    onToggle={onToggleSubtask}
                    onEdit={handleEdit ? () => handleEdit(subtask) : undefined}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete ? async (parentId, subtaskId) => handleDelete(subtaskId) : undefined}
                    textColor={textColor}
                    mutedText={mutedText}
                    gripColor={gripColor}
                  />
                ))}
              </VStack>
            </SortableContext>
          </Box>
        )}
      </Box>
    </Box>
  );
};

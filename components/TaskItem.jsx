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
  MenuButton,
  MenuList,
  MenuItem,
  Portal,
  Tag,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Clock, Edit2, Trash2, Copy, AlertCircle, MoreVertical } from "lucide-react";
import { formatTime, isOverdue } from "@/lib/utils";

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
    borderColor: task.color,
    borderWidth: "2px",
    borderStyle: "solid",
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Box borderRadius="lg" bg={bgColor} transition="box-shadow 0.2s, border-color 0.2s" {...borderStyle}>
        <Flex
          align="center"
          gap={2}
          p={3}
          _hover={{ bg: hoverBg }}
          _active={{ cursor: isDragDisabled ? "default" : "grabbing" }}
          {...(isDragDisabled ? {} : attributes)}
          {...(isDragDisabled ? {} : listeners)}
          cursor={isDragDisabled ? "default" : "grab"}
        >
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
                onPointerDown={e => e.stopPropagation()}
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
            isChecked={isChecked}
            size="lg"
            onChange={() => (isSubtask ? onToggle?.(parentTaskId, task.id) : onToggle?.(task.id))}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
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
                />
              ) : (
                <Text
                  fontWeight="medium"
                  textDecoration={isChecked ? "line-through" : "none"}
                  opacity={isChecked ? 0.5 : 1}
                  color={textColor}
                  cursor="text"
                  onClick={handleTitleClick}
                  onMouseDown={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  _hover={{
                    opacity: isChecked ? 0.7 : 1,
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
              <HStack spacing={2} mt={1} align="center" flexWrap="wrap">
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
                {/* Tags inline with badges */}
                {task.tags && task.tags.length > 0 && (
                  <>
                    {task.tags.map(tag => (
                      <Tag key={tag.id} size="sm" borderRadius="full" bg={tag.color} color="white" fontSize="2xs">
                        {tag.name}
                      </Tag>
                    ))}
                  </>
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
              onPointerDown={e => e.stopPropagation()}
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
            <VStack align="stretch" spacing={2}>
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
                />
              ))}
            </VStack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

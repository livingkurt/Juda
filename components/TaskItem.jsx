"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Checkbox, Text, Flex, HStack, IconButton, VStack, Input, Badge } from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Clock, Edit2, Trash2, GripVertical, Copy, AlertCircle } from "lucide-react";
import { formatTime, isOverdue } from "@/lib/utils";

export const TaskItem = ({
  task,
  variant = "today", // "today" or "backlog"
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
}) => {
  // Normalize prop names - support both naming conventions
  const handleEdit = onEdit || onEditTask;
  const handleUpdateTitle = onUpdateTitle || onUpdateTaskTitle;
  const handleDelete = onDelete || onDeleteTask;
  const handleDuplicate = onDuplicate || onDuplicateTask;

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColorDefault = useColorModeValue("gray.900", "gray.100");
  const mutedTextDefault = useColorModeValue("gray.500", "gray.400");
  const subtaskText = useColorModeValue("gray.700", "gray.200");
  const gripColorDefault = useColorModeValue("gray.400", "gray.500");

  const textColor = textColorProp || textColorDefault;
  const mutedText = mutedTextProp || mutedTextDefault;
  const gripColor = gripColorProp || gripColorDefault;

  const isBacklog = variant === "backlog";
  const isToday = variant === "today";

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        bg={bgColor}
        borderColor={borderColor}
        transition="box-shadow 0.2s, border-color 0.2s"
      >
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
            <Box w={6} />
          )}

          {/* Checkbox - only show for today variant */}
          {isToday && (
            <Checkbox
              isChecked={task.completed || allSubtasksComplete}
              size="lg"
              onChange={() => onToggle?.(task.id)}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
          )}

          {/* Color indicator */}
          <Box w={3} h={3} borderRadius="full" bg={task.color || "#3b82f6"} flexShrink={0} />

          {/* Task content */}
          <Box flex={1} minW={0}>
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
              <Text as="span" ml={2} fontSize="xs" color={mutedText}>
                ({task.subtasks.filter(st => st.completed).length}/{task.subtasks.length})
              </Text>
            )}
            {/* Badges - only show for backlog variant */}
            {isBacklog && (
              <HStack spacing={2} mt={1} align="center">
                {isOverdue(task) && (
                  <Badge size="sm" colorScheme="red" fontSize="2xs">
                    <HStack spacing={1} align="center">
                      <Box as="span" color="currentColor">
                        <AlertCircle size={10} stroke="currentColor" />
                      </Box>
                      <Text as="span">Overdue</Text>
                    </HStack>
                  </Badge>
                )}
                {getSectionName && task.sectionId && (
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

          {/* Action buttons */}
          <IconButton
            icon={
              <Box as="span" color="currentColor">
                <Edit2 size={16} stroke="currentColor" />
              </Box>
            }
            onClick={e => {
              e.stopPropagation();
              handleEdit(task);
            }}
            onMouseDown={e => e.stopPropagation()}
            size="sm"
            variant="ghost"
            aria-label="Edit task"
          />
          {handleDuplicate && (
            <IconButton
              icon={
                <Box as="span" color="currentColor">
                  <Copy size={16} stroke="currentColor" />
                </Box>
              }
              onClick={e => {
                e.stopPropagation();
                handleDuplicate(task.id);
              }}
              onMouseDown={e => e.stopPropagation()}
              size="sm"
              variant="ghost"
              aria-label="Duplicate task"
            />
          )}
          <IconButton
            icon={
              <Box as="span" color="currentColor">
                <Trash2 size={16} stroke="currentColor" />
              </Box>
            }
            onClick={e => {
              e.stopPropagation();
              handleDelete(task.id);
            }}
            onMouseDown={e => e.stopPropagation()}
            size="sm"
            variant="ghost"
            colorScheme="red"
            aria-label="Delete task"
          />
        </Flex>

        {/* Expanded subtasks */}
        {task.expanded && task.subtasks && task.subtasks.length > 0 && onToggleSubtask && (
          <Box pl={16} pr={3} pb={3}>
            <VStack align="stretch" spacing={2}>
              {task.subtasks.map(subtask => (
                <Flex
                  key={subtask.id}
                  align="center"
                  gap={2}
                  p={1}
                  borderRadius="md"
                  _hover={{ bg: hoverBg }}
                  cursor="pointer"
                  onClick={() => onToggleSubtask(task.id, subtask.id)}
                >
                  <Checkbox
                    isChecked={subtask.completed}
                    size="sm"
                    onChange={() => onToggleSubtask(task.id, subtask.id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <Text
                    fontSize="sm"
                    textDecoration={subtask.completed ? "line-through" : "none"}
                    opacity={subtask.completed ? 0.5 : 1}
                    color={subtaskText}
                  >
                    {subtask.title}
                  </Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        )}
      </Box>
    </Box>
  );
};

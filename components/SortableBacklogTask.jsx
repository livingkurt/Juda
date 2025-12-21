"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Flex, Text, IconButton, HStack, Badge, Input } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, Trash2, GripVertical, AlertCircle, Copy } from "lucide-react";
import { isOverdue } from "@/lib/utils";

export const SortableBacklogTask = ({
  task,
  onEditTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onDuplicateTask,
  getSectionName,
  textColor,
  mutedText,
  gripColor,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.draggableId,
    data: {
      type: "TASK",
      containerId: "backlog",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

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
    if (editedTitle.trim() && editedTitle !== task.title && onUpdateTaskTitle) {
      await onUpdateTaskTitle(task.id, editedTitle);
    } else if (!editedTitle.trim()) {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = async e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editedTitle.trim() && editedTitle !== task.title && onUpdateTaskTitle) {
        await onUpdateTaskTitle(task.id, editedTitle);
      }
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      titleInputRef.current?.blur();
    }
  };

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      gap={2}
      p={3}
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor={task.color || "#3b82f6"}
      bg="transparent"
    >
      <Box flexShrink={0} {...attributes} {...listeners} color={gripColor} cursor="grab">
        <GripVertical size={16} stroke="currentColor" />
      </Box>
      <Box flex={1} minW={0}>
        <HStack spacing={2} align="center">
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
              fontSize="sm"
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
              fontSize="sm"
              fontWeight="medium"
              color={textColor}
              cursor="text"
              onClick={handleTitleClick}
              _hover={{
                opacity: 0.8,
              }}
            >
              {task.title}
            </Text>
          )}
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
        </HStack>
        <HStack spacing={2} mt={1}>
          <Text fontSize="xs" color={mutedText}>
            {getSectionName(task.sectionId)}
          </Text>
          {task.recurrence && task.recurrence.type !== "none" && (
            <Badge size="sm" colorScheme="purple" fontSize="2xs">
              {task.recurrence.type === "daily" ? "Daily" : task.recurrence.type === "weekly" ? "Weekly" : "Recurring"}
            </Badge>
          )}
          {!task.time && (
            <Badge size="sm" colorScheme="orange" fontSize="2xs">
              No time
            </Badge>
          )}
        </HStack>
      </Box>
      <IconButton
        icon={
          <Box as="span" color="currentColor">
            <Edit2 size={14} stroke="currentColor" />
          </Box>
        }
        onClick={e => {
          e.stopPropagation();
          onEditTask(task);
        }}
        onMouseDown={e => e.stopPropagation()}
        size="sm"
        variant="ghost"
        aria-label="Edit task"
      />
      {onDuplicateTask && (
        <IconButton
          icon={
            <Box as="span" color="currentColor">
              <Copy size={14} stroke="currentColor" />
            </Box>
          }
          onClick={e => {
            e.stopPropagation();
            onDuplicateTask(task.id);
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
            <Trash2 size={14} stroke="currentColor" />
          </Box>
        }
        onClick={e => {
          e.stopPropagation();
          onDeleteTask(task.id);
        }}
        onMouseDown={e => e.stopPropagation()}
        size="sm"
        variant="ghost"
        colorScheme="red"
        aria-label="Delete task"
      />
    </Flex>
  );
};

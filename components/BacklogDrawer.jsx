"use client";

import { useState } from "react";
import {
  Box,
  Input,
  VStack,
  HStack,
  Flex,
  Text,
  Checkbox,
  IconButton,
  Divider,
  Badge,
  useColorModeValue,
  Heading,
} from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { isOverdue } from "@/lib/utils";

// Sortable task item component
const SortableBacklogTask = ({
  task,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  getSectionName,
  textColor,
  mutedText,
  hoverBg,
  gripColor,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.draggableId,
    data: {
      type: "TASK",
      containerId: "backlog",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      gap={2}
      p={3}
      borderRadius="md"
      _hover={{ bg: hoverBg }}
      borderLeftWidth="3px"
      borderLeftColor={task.color || "#3b82f6"}
      bg="transparent"
    >
      <Box flexShrink={0} {...attributes} {...listeners}>
        <GripVertical size={16} style={{ color: gripColor, cursor: "grab" }} />
      </Box>
      <Checkbox
        isChecked={task.completed}
        size="lg"
        onChange={() => onToggleTask(task.id)}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        flexShrink={0}
      />
      <Box flex={1} minW={0}>
        <HStack spacing={2} align="center">
          <Text
            fontSize="sm"
            fontWeight="medium"
            textDecoration={task.completed ? "line-through" : "none"}
            opacity={task.completed ? 0.5 : 1}
            color={textColor}
          >
            {task.title}
          </Text>
          {isOverdue(task) && (
            <Badge size="sm" colorScheme="red" fontSize="2xs">
              <HStack spacing={1} align="center">
                <AlertCircle size={10} />
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
      </Box>
      <IconButton
        icon={<Edit2 size={14} />}
        onClick={e => {
          e.stopPropagation();
          onEditTask(task);
        }}
        onMouseDown={e => e.stopPropagation()}
        size="sm"
        variant="ghost"
        aria-label="Edit task"
      />
      <IconButton
        icon={<Trash2 size={14} />}
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

export const BacklogDrawer = ({
  isOpen,
  onClose,
  backlog,
  backlogTasks,
  sections,
  onToggleBacklog,
  onToggleTask,
  onDeleteBacklog,
  onDeleteTask,
  onEditTask,
  onAdd,
  onAddTask,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");
  const dragBg = useColorModeValue("blue.100", "blue.800");
  const gripColor = useColorModeValue("gray.400", "gray.500");

  const [newItem, setNewItem] = useState("");

  const getSectionName = sectionId => {
    return sections.find(s => s.id === sectionId)?.name || "Unknown";
  };

  // Use droppable hook for backlog area
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog",
  });

  // Prepare tasks with draggable IDs
  const tasksWithIds = backlogTasks.map(task => ({
    ...task,
    draggableId: createDraggableId.backlog(task.id),
  }));

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg={bgColor}>
      {/* Header */}
      <Box
        p={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexShrink={0}
      >
        <Flex align="center" justify="space-between" mb={2}>
          <Heading size="md">Backlog</Heading>
          <HStack spacing={2}>
            <IconButton
              icon={<Plus size={18} />}
              onClick={onAddTask}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              aria-label="Add task to backlog"
            />
            <IconButton
              icon={<X size={18} />}
              onClick={onClose}
              size="sm"
              variant="ghost"
              aria-label="Close backlog"
            />
          </HStack>
        </Flex>
        <Badge colorScheme="blue">
          {backlogTasks.length} task{backlogTasks.length !== 1 ? "s" : ""}
        </Badge>
      </Box>

      {/* Droppable area for tasks */}
      <Box
        ref={setNodeRef}
        flex={1}
        overflowY="auto"
        p={4}
        bg={isOver ? dropHighlight : "transparent"}
        borderRadius="md"
        transition="background-color 0.2s"
      >
        <VStack align="stretch" spacing={3}>
          {/* Unscheduled Tasks */}
          {tasksWithIds.length > 0 && (
            <>
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color={mutedText}
                  mb={2}
                  textTransform="uppercase"
                >
                  Unscheduled Tasks
                </Text>
                <SortableContext
                  items={tasksWithIds.map(t => t.draggableId)}
                  strategy={verticalListSortingStrategy}
                  id="backlog"
                >
                  <VStack align="stretch" spacing={2}>
                    {tasksWithIds.map(task => (
                      <SortableBacklogTask
                        key={task.id}
                        task={task}
                        onToggleTask={onToggleTask}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        getSectionName={getSectionName}
                        textColor={textColor}
                        mutedText={mutedText}
                        hoverBg={hoverBg}
                        gripColor={gripColor}
                      />
                    ))}
                  </VStack>
                </SortableContext>
              </Box>
              {backlog.length > 0 && <Divider />}
            </>
          )}

          {/* Manual backlog items (quick notes) */}
          {backlog.length > 0 && (
            <Box>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color={mutedText}
                mb={2}
                textTransform="uppercase"
              >
                Quick Notes
              </Text>
              <SortableContext
                items={backlog.map(item => `backlog-item-${item.id}`)}
                strategy={verticalListSortingStrategy}
                id="backlog-items"
              >
                <VStack align="stretch" spacing={2}>
                  {backlog.map(item => {
                    const {
                      attributes,
                      listeners,
                      setNodeRef,
                      transform,
                      transition,
                      isDragging,
                    } = useSortable({
                      id: `backlog-item-${item.id}`,
                      data: {
                        type: "BACKLOG_ITEM",
                        containerId: "backlog-items",
                      },
                    });

                    const style = {
                      transform: CSS.Transform.toString(transform),
                      transition,
                      opacity: isDragging ? 0.5 : 1,
                    };

                    return (
                      <Flex
                        key={item.id}
                        ref={setNodeRef}
                        style={style}
                        align="center"
                        gap={2}
                        p={3}
                        borderRadius="md"
                        _hover={{ bg: hoverBg }}
                      >
                        <Box flexShrink={0} {...attributes} {...listeners}>
                          <GripVertical
                            size={16}
                            style={{ color: gripColor, cursor: "grab" }}
                          />
                        </Box>
                        <Checkbox
                          isChecked={item.completed}
                          size="lg"
                          onChange={() => onToggleBacklog(item.id)}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        />
                        <Text
                          flex={1}
                          fontSize="sm"
                          textDecoration={
                            item.completed ? "line-through" : "none"
                          }
                          opacity={item.completed ? 0.5 : 1}
                          color={textColor}
                        >
                          {item.title}
                        </Text>
                        <IconButton
                          icon={<Trash2 size={16} />}
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteBacklog(item.id);
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Delete item"
                        />
                      </Flex>
                    );
                  })}
                </VStack>
              </SortableContext>
            </Box>
          )}

          {/* Empty state */}
          {tasksWithIds.length === 0 && backlog.length === 0 && (
            <Text fontSize="sm" color={mutedText} textAlign="center" py={8}>
              {isOver ? "Drop here to add to backlog" : "No items in backlog"}
            </Text>
          )}
        </VStack>
      </Box>

      {/* Quick add input */}
      <Box p={4} borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
        <HStack spacing={2}>
          <Input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add quick note..."
            onKeyDown={e => {
              if (e.key === "Enter" && newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
          />
          <IconButton
            icon={<Plus size={16} />}
            onClick={() => {
              if (newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem("");
              }
            }}
            variant="outline"
            aria-label="Add to backlog"
          />
        </HStack>
      </Box>
    </Box>
  );
};

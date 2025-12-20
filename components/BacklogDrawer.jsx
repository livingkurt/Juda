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
import { useSortable } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Edit2, X, GripVertical } from "lucide-react";

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
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const draggingBg = useColorModeValue("blue.100", "blue.800");
  const gripColor = useColorModeValue("gray.400", "gray.500");
  const droppableOverBg = useColorModeValue("blue.50", "blue.900");
  const [newItem, setNewItem] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: "backlog",
    data: {
      type: "TASK",
      droppableId: "backlog",
    },
  });

  const getSectionName = sectionId => {
    return sections.find(s => s.id === sectionId)?.name || "Unknown";
  };

  const BacklogTaskItem = ({ task, index }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      data: {
        type: "TASK",
        task,
        source: "backlog",
        droppableId: "backlog",
        sectionId: task.sectionId,
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
        {...attributes}
        {...listeners}
        align="center"
        gap={2}
        p={3}
        borderRadius="md"
        _hover={{ bg: hoverBg }}
        cursor="grab"
        borderLeftWidth="3px"
        borderLeftColor={task.color || "#3b82f6"}
        bg={isDragging ? draggingBg : "transparent"}
        boxShadow={isDragging ? "lg" : "none"}
      >
        <Box flexShrink={0}>
          <GripVertical size={16} color={gripColor} />
        </Box>
        <Checkbox
          isChecked={task.completed}
          size="lg"
          onChange={() => onToggleTask(task.id)}
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseDown={e => e.stopPropagation()}
          flexShrink={0}
        />
        <Box flex={1} minW={0}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            textDecoration={task.completed ? "line-through" : "none"}
            opacity={task.completed ? 0.5 : 1}
            color={textColor}
          >
            {task.title}
          </Text>
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
          size="sm"
          variant="ghost"
          colorScheme="red"
          aria-label="Delete task"
        />
      </Flex>
    );
  };

  const BacklogItem = ({ item, index }) => {
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
        item,
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
        cursor="grab"
        bg={isDragging ? draggingBg : "transparent"}
        boxShadow={isDragging ? "lg" : "none"}
      >
        <Box {...attributes} {...listeners} cursor="grab">
          <GripVertical size={16} color={gripColor} />
        </Box>
        <Checkbox
          isChecked={item.completed}
          size="lg"
          onChange={() => onToggleBacklog(item.id)}
          onClick={e => e.stopPropagation()}
        />
        <Text
          flex={1}
          fontSize="sm"
          textDecoration={item.completed ? "line-through" : "none"}
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
          size="sm"
          variant="ghost"
          colorScheme="red"
          aria-label="Delete item"
        />
      </Flex>
    );
  };

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg={bgColor}>
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
      <Box
        ref={setNodeRef}
        flex={1}
        overflowY="auto"
        p={4}
        bg={isOver ? droppableOverBg : "transparent"}
        borderRadius="md"
        transition="background-color 0.2s"
      >
        <VStack align="stretch" spacing={3}>
          {/* Tasks that should be in backlog */}
          {backlogTasks.length > 0 && (
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
                  items={backlogTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <VStack align="stretch" spacing={2}>
                    {backlogTasks.map((task, index) => (
                      <BacklogTaskItem
                        key={task.id}
                        task={task}
                        index={index}
                      />
                    ))}
                  </VStack>
                </SortableContext>
              </Box>
              {backlog.length > 0 && <Divider />}
            </>
          )}

          {/* Manual backlog items */}
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
              >
                <VStack align="stretch" spacing={2}>
                  {backlog.map((item, index) => (
                    <BacklogItem key={item.id} item={item} index={index} />
                  ))}
                </VStack>
              </SortableContext>
            </Box>
          )}

          {backlogTasks.length === 0 && backlog.length === 0 && (
            <Text fontSize="sm" color={mutedText} textAlign="center" py={8}>
              No items in backlog
            </Text>
          )}
        </VStack>
      </Box>
      <Box p={4} borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
        <HStack spacing={2}>
          <Input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add to backlog..."
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

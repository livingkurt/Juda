"use client";

import { useState } from "react";
import {
  Box,
  Input,
  VStack,
  HStack,
  Flex,
  Text,
  IconButton,
  Divider,
  Badge,
  useColorModeValue,
  Heading,
} from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { SortableBacklogItem } from "./SortableBacklogItem";
import { SortableBacklogTask } from "./SortableBacklogTask";

export const BacklogDrawer = ({
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
    <Box h="100%" display="flex" flexDirection="column" bg={bgColor}>
      {/* Header */}
      <Box p={4} borderBottomWidth="1px" borderColor={borderColor} flexShrink={0}>
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
            <IconButton icon={<X size={18} />} onClick={onClose} size="sm" variant="ghost" aria-label="Close backlog" />
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
        minH={0}
        overflowY="auto"
        p={4}
        bg={isOver ? dropHighlight : "transparent"}
        borderRadius="md"
        transition="background-color 0.2s"
        borderWidth={isOver ? "2px" : "0px"}
        borderColor={isOver ? "blue.400" : "transparent"}
        borderStyle="dashed"
        mx={isOver ? 2 : 0}
      >
        <VStack align="stretch" spacing={3}>
          {/* Unscheduled Tasks */}
          {tasksWithIds.length > 0 && (
            <>
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2} textTransform="uppercase">
                  Unscheduled Tasks
                </Text>
                <SortableContext items={tasksWithIds.map(t => t.draggableId)} strategy={verticalListSortingStrategy}>
                  <VStack align="stretch" spacing={3}>
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
              <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2} textTransform="uppercase">
                Quick Notes
              </Text>
              <SortableContext
                items={backlog.map(item => `backlog-item-${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <VStack align="stretch" spacing={3}>
                  {backlog.map(item => (
                    <SortableBacklogItem
                      key={item.id}
                      item={item}
                      onDeleteBacklog={onDeleteBacklog}
                      onToggleBacklog={onToggleBacklog}
                    />
                  ))}
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

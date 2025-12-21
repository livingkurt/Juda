"use client";

import { Box, VStack, HStack, Flex, Text, IconButton, Badge, useColorModeValue, Heading } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { SortableBacklogTask } from "./SortableBacklogTask";

export const BacklogDrawer = ({
  onClose,
  backlogTasks,
  sections,
  onEditTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  createDraggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const dropHighlight = useColorModeValue("blue.50", "blue.900");
  const gripColor = useColorModeValue("gray.400", "gray.500");

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
              icon={
                <Box as="span" color="currentColor">
                  <Plus size={18} stroke="currentColor" />
                </Box>
              }
              onClick={onAddTask}
              size="sm"
              variant="ghost"
              colorScheme="blue"
              aria-label="Add task to backlog"
            />
            <IconButton
              icon={
                <Box as="span" color="currentColor">
                  <X size={18} stroke="currentColor" />
                </Box>
              }
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
        minH={0}
        overflowY="auto"
        p={tasksWithIds.length === 0 ? 4 : 2}
        bg={isOver ? dropHighlight : "transparent"}
        borderRadius="md"
        transition="background-color 0.2s, padding 0.2s"
        borderWidth={isOver ? "2px" : "0px"}
        borderColor={isOver ? "blue.400" : "transparent"}
        borderStyle="dashed"
        mx={isOver ? 2 : 0}
      >
        {/* Unscheduled Tasks */}
        {tasksWithIds.length > 0 ? (
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2} ml={2} textTransform="uppercase">
              Unscheduled Tasks
            </Text>
            <SortableContext items={tasksWithIds.map(t => t.draggableId)} strategy={verticalListSortingStrategy}>
              <VStack align="stretch" spacing={2} px={2}>
                {tasksWithIds.map(task => (
                  <SortableBacklogTask
                    key={task.id}
                    task={task}
                    onEditTask={onEditTask}
                    onUpdateTaskTitle={onUpdateTaskTitle}
                    onDeleteTask={onDeleteTask}
                    onDuplicateTask={onDuplicateTask}
                    getSectionName={getSectionName}
                    textColor={textColor}
                    mutedText={mutedText}
                    gripColor={gripColor}
                  />
                ))}
              </VStack>
            </SortableContext>
          </Box>
        ) : (
          <Text fontSize="sm" color={mutedText} textAlign="center" py={8}>
            {isOver ? "Drop here to add to backlog" : "No items in backlog"}
          </Text>
        )}
      </Box>
    </Box>
  );
};

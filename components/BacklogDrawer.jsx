"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { Box, VStack, HStack, Flex, Text, IconButton, Badge, Heading } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";

const BacklogDrawerComponent = ({
  onClose,
  backlogTasks,
  onEditTask,
  onUpdateTaskTitle,
  onDeleteTask,
  onDuplicateTask,
  onAddTask,
  onToggleExpand,
  onToggleSubtask,
  onToggleTask,
  createDraggableId,
  viewDate,
  tags = [],
  onCreateTag,
  onOutcomeChange,
  getOutcomeOnDate,
  hasRecordOnDate,
  onCompleteWithNote,
  onSkipTask,
  getCompletionForDate,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const textColor = { _light: "gray.900", _dark: "gray.100" };
  const mutedText = { _light: "gray.500", _dark: "gray.400" };
  const dropHighlight = { _light: "blue.50", _dark: "blue.900" };
  const gripColor = { _light: "gray.400", _dark: "gray.500" };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  // Filter tasks by search term and tags
  const filteredTasks = useMemo(() => {
    let result = backlogTasks;

    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(task => task.title.toLowerCase().includes(lowerSearch));
    }

    // Filter by tags
    if (selectedTagIds.length > 0) {
      result = result.filter(task => task.tags?.some(tag => selectedTagIds.includes(tag.id)));
    }

    return result;
  }, [backlogTasks, searchTerm, selectedTagIds]);

  const handleTagSelect = useCallback(tagId => {
    setSelectedTagIds(prev => [...prev, tagId]);
  }, []);

  const handleTagDeselect = useCallback(tagId => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  }, []);

  // Use droppable hook for backlog area
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog",
  });

  // Prepare tasks with draggable IDs
  const tasksWithIds = filteredTasks.map(task => ({
    ...task,
    draggableId: createDraggableId.backlog(task.id),
  }));

  return (
    <Box h="100%" display="flex" flexDirection="column" bg={bgColor} w="100%" maxW="100%" overflow="hidden">
      {/* Header */}
      <Box p={{ base: 3, md: 4 }} borderBottomWidth="1px" borderColor={borderColor} flexShrink={0} w="100%" maxW="100%">
        <Flex align="center" justify="space-between" mb={2} gap={2}>
          <Heading size="md" flexShrink={0}>
            Backlog
          </Heading>
          <HStack spacing={2} flexShrink={0}>
            <IconButton
              onClick={onAddTask}
              size="sm"
              variant="ghost"
              colorPalette="blue"
              aria-label="Add task to backlog"
            >
              <Box as="span" color="currentColor">
                <Plus size={16} stroke="currentColor" />
              </Box>
            </IconButton>
            <IconButton onClick={onClose} size="sm" variant="ghost" aria-label="Close backlog">
              <Box as="span" color="currentColor">
                <X size={16} stroke="currentColor" />
              </Box>
            </IconButton>
          </HStack>
        </Flex>
        <Badge colorPalette="blue" mb={2}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          {(searchTerm || selectedTagIds.length > 0) &&
            filteredTasks.length !== backlogTasks.length &&
            ` of ${backlogTasks.length}`}
        </Badge>
        <HStack spacing={{ base: 2, md: 4 }} align="center" w="100%" maxW="100%">
          <Box flex={1} minW={0}>
            <TaskSearchInput onSearchChange={setSearchTerm} />
          </Box>
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onCreateTag={onCreateTag}
            compact
          />
        </HStack>
      </Box>

      {/* Droppable area for tasks */}
      <Box
        ref={setNodeRef}
        flex={1}
        minH={0}
        overflowY="auto"
        p={tasksWithIds.length === 0 ? { base: 3, md: 4 } : { base: 2, md: 2 }}
        bg={isOver ? dropHighlight : "transparent"}
        borderRadius="md"
        transition="background-color 0.2s, padding 0.2s"
        borderWidth={isOver ? "2px" : "0px"}
        borderColor={isOver ? "blue.400" : "transparent"}
        borderStyle="dashed"
        mx={isOver ? { base: 1, md: 2 } : 0}
        w="100%"
        maxW="100%"
      >
        {/* Unscheduled Tasks */}
        {tasksWithIds.length > 0 ? (
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2} ml={2} textTransform="uppercase">
              Unscheduled Tasks
            </Text>
            <SortableContext
              id="backlog"
              items={tasksWithIds.map(t => t.draggableId)}
              strategy={verticalListSortingStrategy}
            >
              <VStack align="stretch" spacing={2} px={{ base: 1, md: 2 }} w="100%" maxW="100%">
                {tasksWithIds.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    variant="backlog"
                    containerId="backlog"
                    onEditTask={onEditTask}
                    onUpdateTaskTitle={onUpdateTaskTitle}
                    onDeleteTask={onDeleteTask}
                    onDuplicateTask={onDuplicateTask}
                    onToggleExpand={onToggleExpand}
                    onToggleSubtask={onToggleSubtask}
                    onToggle={onToggleTask}
                    textColor={textColor}
                    mutedText={mutedText}
                    gripColor={gripColor}
                    draggableId={task.draggableId}
                    viewDate={viewDate}
                    onOutcomeChange={onOutcomeChange}
                    getOutcomeOnDate={getOutcomeOnDate}
                    hasRecordOnDate={hasRecordOnDate}
                    onCompleteWithNote={onCompleteWithNote}
                    onSkipTask={onSkipTask}
                    getCompletionForDate={getCompletionForDate}
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

BacklogDrawerComponent.displayName = "BacklogDrawer";

// Custom comparison function to prevent rerenders when backlogTasks contents haven't changed
const areBacklogTasksEqual = (prevProps, nextProps) => {
  // Compare backlogTasks by IDs and length
  if (prevProps.backlogTasks.length !== nextProps.backlogTasks.length) {
    return false;
  }

  const prevIds = prevProps.backlogTasks
    .map(t => t.id)
    .sort()
    .join(",");
  const nextIds = nextProps.backlogTasks
    .map(t => t.id)
    .sort()
    .join(",");

  if (prevIds !== nextIds) {
    return false;
  }

  // Compare other props that might affect rendering
  return (
    prevProps.viewDate?.getTime() === nextProps.viewDate?.getTime() &&
    prevProps.tags.length === nextProps.tags.length &&
    prevProps.onClose === nextProps.onClose &&
    prevProps.onEditTask === nextProps.onEditTask &&
    prevProps.onUpdateTaskTitle === nextProps.onUpdateTaskTitle &&
    prevProps.onDeleteTask === nextProps.onDeleteTask &&
    prevProps.onDuplicateTask === nextProps.onDuplicateTask &&
    prevProps.onAddTask === nextProps.onAddTask &&
    prevProps.onToggleExpand === nextProps.onToggleExpand &&
    prevProps.onToggleSubtask === nextProps.onToggleSubtask &&
    prevProps.onToggleTask === nextProps.onToggleTask &&
    prevProps.createDraggableId === nextProps.createDraggableId &&
    prevProps.onCreateTag === nextProps.onCreateTag &&
    prevProps.onOutcomeChange === nextProps.onOutcomeChange &&
    prevProps.getOutcomeOnDate === nextProps.getOutcomeOnDate &&
    prevProps.hasRecordOnDate === nextProps.hasRecordOnDate &&
    prevProps.onCompleteWithNote === nextProps.onCompleteWithNote &&
    prevProps.onSkipTask === nextProps.onSkipTask &&
    prevProps.getCompletionForDate === nextProps.getCompletionForDate
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent, areBacklogTasksEqual);

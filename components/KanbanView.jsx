"use client";

import { useState, useMemo, memo } from "react";
import { Box, Flex, VStack, HStack, Text, IconButton, Badge } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";

// Kanban column component
const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  tasks,
  color,
  onTaskClick,
  onAddTask,
  createDraggableId,
  isCompletedOnDate,
  getOutcomeOnDate,
  onOutcomeChange,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onStatusChange,
  recentlyCompletedTasks,
  viewDate,
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `kanban-column|${id}`,
    data: { type: "KANBAN_COLUMN", status: id },
  });

  // Check if we're dragging a task over this column
  // Simplified check - just use isOver since we know only tasks can be dragged to Kanban
  const isDraggingOver = isOver && active;

  const bgColor = { _light: "gray.50", _dark: "gray.900" };
  const columnBg = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.700" };
  const dropHighlight = { _light: "blue.50", _dark: "blue.900" };

  // Filter out tasks that are no longer "recently completed" for the Done column
  const visibleTasks = useMemo(() => {
    if (id !== "complete") return tasks;
    // Show tasks that are either still in complete status OR recently completed
    return tasks.filter(
      task => task.status === "complete" || recentlyCompletedTasks?.has(task.id)
    );
  }, [id, tasks, recentlyCompletedTasks]);

  // Memoize sortable IDs to prevent unnecessary recalculations
  const sortableIds = useMemo(
    () => visibleTasks.map(task => createDraggableId.kanban(task.id, id)),
    [visibleTasks, id]
  );

  return (
    <Box flex={1} minW="280px" maxW="400px" bg={bgColor} borderRadius="lg" p={3}>
      {/* Column Header */}
      <Flex align="center" justify="space-between" mb={3}>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg={color} />
          <Text fontWeight="semibold" fontSize="sm">
            {title}
          </Text>
          <Badge colorScheme="gray" borderRadius="full" px={2}>
            {visibleTasks.length}
          </Badge>
        </HStack>
        <IconButton
          icon={<Plus size={16} />}
          size="xs"
          variant="ghost"
          onClick={() => onAddTask(id)}
          aria-label={`Add task to ${title}`}
        />
      </Flex>

      {/* Column Content */}
      <Box
        ref={setNodeRef}
        bg={isOver ? dropHighlight : columnBg}
        borderRadius="md"
        border="2px solid"
        borderColor={isDraggingOver ? "blue.400" : borderColor}
        minH="200px"
        maxH="calc(100vh - 300px)"
        overflowY="auto"
        p={2}
        transition="all 0.2s"
        position="relative"
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <VStack spacing={2} align="stretch" minH={isDraggingOver ? "100px" : "auto"}>
            {visibleTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                variant="kanban"
                containerId={`kanban-column|${id}`}
                draggableId={createDraggableId.kanban(task.id, id)}
                onEdit={() => onTaskClick(task)}
                onDelete={() => onDeleteTask(task.id)}
                onDuplicate={() => onDuplicateTask(task.id)}
                viewDate={viewDate}
                onOutcomeChange={onOutcomeChange}
                getOutcomeOnDate={getOutcomeOnDate}
                onStatusChange={onStatusChange}
              />
            ))}
            {/* Drop placeholder - shows when dragging over to indicate drop zone */}
            {isDraggingOver && (
              <Box
                minH="80px"
                border="2px dashed"
                borderColor="blue.400"
                borderRadius="md"
                bg="blue.50"
                _dark={{ bg: "blue.900", borderColor: "blue.500" }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                opacity={0.8}
                transition="all 0.2s"
                flex={visibleTasks.length === 0 ? 1 : undefined}
              >
                <Text fontSize="sm" color="blue.600" _dark={{ color: "blue.300" }} fontWeight="medium">
                  Drop here
                </Text>
              </Box>
            )}
            {visibleTasks.length === 0 && !isDraggingOver && (
              <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                No tasks
              </Text>
            )}
          </VStack>
        </SortableContext>
      </Box>
    </Box>
  );
});

// Main Kanban View component
export const KanbanView = memo(function KanbanView({
  tasks,
  onTaskClick,
  onCreateTask,
  createDraggableId,
  isCompletedOnDate,
  getOutcomeOnDate,
  onOutcomeChange,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onStatusChange,
  tags,
  onCreateTag,
  recentlyCompletedTasks,
  viewDate = new Date(),
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  // Filter tasks: non-recurring only, exclude notes
  // Memoize to prevent unnecessary recalculations
  const kanbanTasks = useMemo(() => {
    return tasks.filter(task => {
      // Exclude notes
      if (task.completionType === "note") return false;
      // Exclude recurring tasks
      if (task.recurrence && task.recurrence.type !== "none") return false;
      // Exclude subtasks (they follow their parent)
      if (task.parentId) return false;
      return true;
    });
  }, [tasks]);

  // Apply search and tag filters
  const filteredTasks = useMemo(() => {
    let filtered = kanbanTasks;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(search) ||
          task.taskTags?.some(tt => tt.tag?.name?.toLowerCase().includes(search))
      );
    }

    // Tag filter
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(task => task.taskTags?.some(tt => selectedTagIds.includes(tt.tagId)));
    }

    return filtered;
  }, [kanbanTasks, searchTerm, selectedTagIds]);

  // Group tasks by status
  const tasksByStatus = useMemo(
    () => ({
      todo: filteredTasks.filter(t => t.status === "todo"),
      in_progress: filteredTasks.filter(t => t.status === "in_progress"),
      complete: filteredTasks.filter(t => t.status === "complete"),
    }),
    [filteredTasks]
  );

  const handleAddTask = status => {
    onCreateTask({ status });
  };

  const handleTagSelect = tagId => {
    setSelectedTagIds(prev => [...prev, tagId]);
  };

  const handleTagDeselect = tagId => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
  };

  const columns = [
    { id: "todo", title: "Todo", color: "gray.400" },
    { id: "in_progress", title: "In Progress", color: "blue.400" },
    { id: "complete", title: "Done", color: "green.400" },
  ];

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Header with search and filters */}
      <Box mb={4}>
        <HStack spacing={4} align="center">
          <Box flex={1} maxW="300px">
            <TaskSearchInput onSearchChange={setSearchTerm} />
          </Box>
          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onCreateTag={onCreateTag}
          />
        </HStack>
      </Box>

      {/* Kanban Columns */}
      <Flex gap={4} flex={1} overflowX="auto" pb={4}>
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={tasksByStatus[column.id]}
            onTaskClick={onTaskClick}
            onAddTask={handleAddTask}
            createDraggableId={createDraggableId}
            isCompletedOnDate={isCompletedOnDate}
            getOutcomeOnDate={getOutcomeOnDate}
            onOutcomeChange={onOutcomeChange}
            onEditTask={onEditTask}
            onDuplicateTask={onDuplicateTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            recentlyCompletedTasks={recentlyCompletedTasks}
            viewDate={viewDate}
          />
        ))}
      </Flex>
    </Box>
  );
});


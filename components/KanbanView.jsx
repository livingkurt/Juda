"use client";

import { useState, useMemo, memo, useRef } from "react";
import { useSelector } from "react-redux";
import { Box, Flex, VStack, HStack, Text, IconButton, Badge, Input } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useDialogState } from "@/hooks/useDialogState";

// Kanban column component
const KanbanColumn = memo(function KanbanColumn({ id, title, tasks, color, createDraggableId }) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `kanban-column|${id}`,
    data: { type: "KANBAN_COLUMN", status: id },
  });

  // Check if we're dragging a task over this column
  // Simplified check - just use isOver since we know only tasks can be dragged to Kanban
  const isDraggingOver = isOver && active;

  const { mode, dnd, interactive } = useSemanticColors();

  const bgColor = mode.bg.canvas;
  const columnBg = mode.bg.surface;
  const borderColor = mode.border.default;
  const dropHighlight = dnd.dropTarget;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;

  // Use hooks directly
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const dialogState = useDialogState();

  // Get viewDate from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Get recentlyCompletedTasks from completionHandlers
  const recentlyCompletedTasks = completionHandlers.recentlyCompletedTasks;

  const [inlineInputValue, setInlineInputValue] = useState("");
  const [isInlineInputActive, setIsInlineInputActive] = useState(false);
  const inlineInputRef = useRef(null);

  // Filter out tasks that are no longer "recently completed" for the Done column
  const visibleTasks = useMemo(() => {
    if (id !== "complete") return tasks;
    // Show tasks that are either still in complete status OR recently completed
    return tasks.filter(task => task.status === "complete" || recentlyCompletedTasks?.has(task.id));
  }, [id, tasks, recentlyCompletedTasks]);

  // Memoize sortable IDs to prevent unnecessary recalculations
  const sortableIds = useMemo(
    () => visibleTasks.map(task => createDraggableId.kanban(task.id, id)),
    [visibleTasks, id, createDraggableId]
  );

  const handleInlineInputClick = () => {
    setIsInlineInputActive(true);
    setTimeout(() => {
      inlineInputRef.current?.focus();
    }, 0);
  };

  const handleInlineInputBlur = async () => {
    if (inlineInputValue.trim()) {
      await taskOps.handleCreateKanbanTaskInline(id, inlineInputValue);
      setInlineInputValue("");
    }
    setIsInlineInputActive(false);
  };

  const handleInlineInputKeyDown = async e => {
    if (e.key === "Enter" && inlineInputValue.trim()) {
      e.preventDefault();
      await taskOps.handleCreateKanbanTaskInline(id, inlineInputValue);
      setInlineInputValue("");
      setIsInlineInputActive(false);
    } else if (e.key === "Escape") {
      setInlineInputValue("");
      setIsInlineInputActive(false);
      inlineInputRef.current?.blur();
    }
  };

  const handleAddTask = () => {
    dialogState.setDefaultSectionId(taskOps.sections[0]?.id);
    dialogState.setEditingTask({ status: id });
    dialogState.openTaskDialog();
  };

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
        <IconButton size="xs" variant="ghost" onClick={handleAddTask} aria-label={`Add task to ${title}`}>
          <Box as="span" color="currentColor">
            <Plus size={16} stroke="currentColor" />
          </Box>
        </IconButton>
      </Flex>

      {/* Column Content */}
      <Box
        ref={setNodeRef}
        bg={isOver ? dropHighlight : columnBg}
        borderRadius="md"
        border="2px solid"
        borderColor={isDraggingOver ? dnd.dropTargetBorder : borderColor}
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
                viewDate={viewDate}
              />
            ))}
            {/* Drop placeholder - shows when dragging over to indicate drop zone */}
            {isDraggingOver && (
              <Box
                minH="80px"
                border="2px dashed"
                borderColor={dnd.dropTargetBorder}
                borderRadius="md"
                bg={dnd.dropTarget}
                display="flex"
                alignItems="center"
                justifyContent="center"
                opacity={0.8}
                transition="all 0.2s"
                flex={visibleTasks.length === 0 ? 1 : undefined}
              >
                <Text fontSize="sm" color={interactive.primary} fontWeight="medium">
                  Drop here
                </Text>
              </Box>
            )}
            {visibleTasks.length === 0 && !isDraggingOver && (
              <VStack align="stretch" spacing={2}>
                <Text color={mutedText} fontSize="sm" textAlign="center" py={4}>
                  No tasks
                </Text>
                <Input
                  ref={inlineInputRef}
                  value={inlineInputValue}
                  onChange={e => setInlineInputValue(e.target.value)}
                  onBlur={handleInlineInputBlur}
                  onKeyDown={handleInlineInputKeyDown}
                  onClick={handleInlineInputClick}
                  placeholder="New task..."
                  size="sm"
                  variant="unstyled"
                  bg="transparent"
                  borderWidth="0px"
                  px={2}
                  py={1}
                  fontSize="sm"
                  color={isInlineInputActive ? textColor : mutedText}
                  _focus={{
                    outline: "none",
                    color: textColor,
                  }}
                  _placeholder={{ color: mutedText }}
                  _hover={{
                    color: textColor,
                  }}
                />
              </VStack>
            )}
            {visibleTasks.length > 0 && (
              <Input
                ref={inlineInputRef}
                value={inlineInputValue}
                onChange={e => setInlineInputValue(e.target.value)}
                onBlur={handleInlineInputBlur}
                onKeyDown={handleInlineInputKeyDown}
                onClick={handleInlineInputClick}
                placeholder="New task..."
                size="sm"
                variant="unstyled"
                bg="transparent"
                borderWidth="0px"
                px={2}
                py={1}
                fontSize="sm"
                color={isInlineInputActive ? textColor : mutedText}
                _focus={{
                  outline: "none",
                  color: textColor,
                }}
                _placeholder={{ color: mutedText }}
                _hover={{
                  color: textColor,
                }}
              />
            )}
          </VStack>
        </SortableContext>
      </Box>
    </Box>
  );
});

// Main Kanban View component
export const KanbanView = memo(function KanbanView({ createDraggableId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  // Use hooks directly (they use Redux internally)
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Filter tasks: non-recurring only, exclude notes
  // Memoize to prevent unnecessary recalculations
  const kanbanTasks = useMemo(() => {
    return taskFilters.tasks.filter(task => {
      // Exclude notes
      if (task.completionType === "note") return false;
      // Exclude recurring tasks
      if (task.recurrence && task.recurrence.type !== "none") return false;
      // Exclude subtasks (they follow their parent)
      if (task.parentId) return false;
      return true;
    });
  }, [taskFilters.tasks]);

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
            onCreateTag={async (name, color) => {
              return await createTagMutation({ name, color }).unwrap();
            }}
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
            createDraggableId={createDraggableId}
          />
        ))}
      </Flex>
    </Box>
  );
});

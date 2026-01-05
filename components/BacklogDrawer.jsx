"use client";

import { useMemo, useCallback, memo, useRef, useState } from "react";
import { Box, VStack, HStack, Flex, Text, IconButton, Badge, Heading, Input } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagFilter } from "./TagFilter";
import { BacklogTagSidebar, UNTAGGED_ID } from "./BacklogTagSidebar";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import {
  setBacklogSearchTerm as setBacklogSearchTermAction,
  setBacklogSelectedTagIds,
  toggleBacklogTagSidebarOpen,
} from "@/lib/store/slices/uiSlice";

const BacklogDrawerComponent = ({ createDraggableId }) => {
  const dispatch = useDispatch();
  const { mode, dnd } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const dropHighlight = dnd.dropTarget;
  const gripColor = mode.text.muted;

  // Get Redux state directly
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Get search/filter state from Redux
  const searchTerm = useSelector(state => state.ui.backlogSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.backlogSelectedTagIds);
  const sidebarOpen = useSelector(state => state.ui.backlogTagSidebarOpen);

  // Mobile detection
  const isMobile = useMobileDetection();

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const backlogTasks = taskFilters.backlogTasks;

  // Filter tags to only show those used by backlog tasks
  const backlogTags = useMemo(() => {
    // Extract all tag IDs used by backlog tasks
    const tagIdsInBacklog = new Set();
    backlogTasks.forEach(task => {
      task.tags?.forEach(tag => {
        tagIdsInBacklog.add(tag.id);
      });
    });

    // Filter tags to only include those used in backlog
    return tags.filter(tag => tagIdsInBacklog.has(tag.id));
  }, [tags, backlogTasks]);

  // Local UI state (not shared)
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [inlineInputValue, setInlineInputValue] = useState("");
  const [isInlineInputActive, setIsInlineInputActive] = useState(false);
  const inlineInputRef = useRef(null);

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
      const hasUntaggedFilter = selectedTagIds.includes(UNTAGGED_ID);
      const regularTagIds = selectedTagIds.filter(id => id !== UNTAGGED_ID);

      if (hasUntaggedFilter && regularTagIds.length > 0) {
        // Show tasks that are untagged OR have one of the selected tags
        result = result.filter(
          task => !task.tags || task.tags.length === 0 || task.tags.some(tag => regularTagIds.includes(tag.id))
        );
      } else if (hasUntaggedFilter) {
        // Show only untagged tasks
        result = result.filter(task => !task.tags || task.tags.length === 0);
      } else if (regularTagIds.length > 0) {
        // Show only tasks with selected tags
        result = result.filter(task => task.tags?.some(tag => regularTagIds.includes(tag.id)));
      }
    }

    return result;
  }, [backlogTasks, searchTerm, selectedTagIds]);

  const handleTagSelect = useCallback(
    tagId => {
      if (!selectedTagIds.includes(tagId)) {
        dispatch(setBacklogSelectedTagIds([...selectedTagIds, tagId]));
      }
    },
    [dispatch, selectedTagIds]
  );

  const handleTagDeselect = useCallback(
    tagId => {
      dispatch(setBacklogSelectedTagIds(selectedTagIds.filter(id => id !== tagId)));
    },
    [dispatch, selectedTagIds]
  );

  const handleSidebarToggle = useCallback(() => {
    dispatch(toggleBacklogTagSidebarOpen());
  }, [dispatch]);

  const handleInlineInputClick = () => {
    setIsInlineInputActive(true);
    setTimeout(() => {
      inlineInputRef.current?.focus();
    }, 0);
  };

  const handleInlineInputBlur = async () => {
    if (inlineInputValue.trim()) {
      await taskOps.handleCreateBacklogTaskInline(inlineInputValue, selectedTagIds);
      setInlineInputValue("");
    }
    setIsInlineInputActive(false);
  };

  const handleInlineInputKeyDown = async e => {
    if (e.key === "Enter" && inlineInputValue.trim()) {
      e.preventDefault();
      await taskOps.handleCreateBacklogTaskInline(inlineInputValue, selectedTagIds);
      setInlineInputValue("");
      setIsInlineInputActive(false);
    } else if (e.key === "Escape") {
      setInlineInputValue("");
      setIsInlineInputActive(false);
      inlineInputRef.current?.blur();
    }
  };

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
    <Box h="100%" display="flex" flexDirection="row" bg={bgColor} w="100%" maxW="100%" overflow="hidden">
      {/* Tag Sidebar - Desktop Only */}
      {!isMobile && (
        <BacklogTagSidebar
          tags={backlogTags}
          selectedTagIds={selectedTagIds}
          onTagSelect={handleTagSelect}
          onTagDeselect={handleTagDeselect}
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
        />
      )}

      {/* Main Content */}
      <Box h="100%" display="flex" flexDirection="column" flex={1} minW={0} overflow="hidden">
        {/* Header */}
        <Box
          px={{ base: 2, md: 4 }}
          pt={{ base: 3, md: 6 }}
          pb={4}
          mb={4}
          borderBottomWidth="1px"
          borderColor={borderColor}
          flexShrink={0}
          w="100%"
          maxW="100%"
        >
          <Flex align="center" justify="space-between" mb={2} gap={2}>
            <Heading size="md" flexShrink={0}>
              Backlog
            </Heading>
            <HStack spacing={2} flexShrink={0}>
              <IconButton
                onClick={taskOps.handleAddTaskToBacklog}
                size="sm"
                variant="ghost"
                colorPalette="blue"
                aria-label="Add task to backlog"
              >
                <Box as="span" color="currentColor">
                  <Plus size={16} stroke="currentColor" />
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
              <TaskSearchInput onSearchChange={term => dispatch(setBacklogSearchTermAction(term))} />
            </Box>
            {/* TagFilter - Mobile Only */}
            {isMobile && (
              <TagFilter
                tags={backlogTags}
                selectedTagIds={selectedTagIds}
                onTagSelect={handleTagSelect}
                onTagDeselect={handleTagDeselect}
                onCreateTag={async (name, color) => {
                  return await createTagMutation({ name, color }).unwrap();
                }}
                compact
              />
            )}
          </HStack>
          {/* New Task Input */}
          <Box mt={2} w="100%" maxW="100%">
            <Input
              placeholder="New Task..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  e.preventDefault();
                  taskOps.handleCreateBacklogTaskInline(newTaskTitle.trim(), selectedTagIds);
                  setNewTaskTitle("");
                }
              }}
              bg="transparent"
              borderWidth="0"
              borderColor="transparent"
              color={textColor}
              _placeholder={{ color: mutedText }}
              _focus={{
                borderWidth: "0",
                borderColor: "transparent",
                boxShadow: "none",
                outline: "none",
              }}
              _focusVisible={{
                borderWidth: "0",
                borderColor: "transparent",
                boxShadow: "none",
                outline: "none",
              }}
            />
          </Box>
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
          borderColor={isOver ? dnd.dropTargetBorder : "transparent"}
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
                      textColor={textColor}
                      mutedTextColor={mutedText}
                      gripColor={gripColor}
                      draggableId={task.draggableId}
                      viewDate={viewDate}
                    />
                  ))}
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
              </SortableContext>
            </Box>
          ) : (
            <VStack align="stretch" spacing={{ base: 1, md: 2 }}>
              <Text fontSize={{ base: "xs", md: "sm" }} textAlign="center" py={{ base: 4, md: 8 }} color={mutedText}>
                {isOver ? "Drop here" : "No tasks"}
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
        </Box>
      </Box>
    </Box>
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent);

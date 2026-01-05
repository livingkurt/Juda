"use client";

import { useMemo, useCallback, memo, useRef, useState } from "react";
import { Box, Stack, Group, Flex, Text, ActionIcon, Badge, Title, TextInput } from "@mantine/core";
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
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "row",
        background: bgColor,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
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
      <Box
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 24,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${borderColor}`,
            flexShrink: 0,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <Flex align="center" justify="space-between" style={{ marginBottom: 8 }} gap={8}>
            <Title size="md" style={{ flexShrink: 0 }}>
              Backlog
            </Title>
            <Group gap={8} style={{ flexShrink: 0 }}>
              <ActionIcon
                onClick={taskOps.handleAddTaskToBacklog}
                size="sm"
                variant="subtle"
                color="blue"
                aria-label="Add task to backlog"
              >
                <Plus size={16} stroke="currentColor" />
              </ActionIcon>
            </Group>
          </Flex>
          <Badge color="blue" style={{ marginBottom: 8 }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {(searchTerm || selectedTagIds.length > 0) &&
              filteredTasks.length !== backlogTasks.length &&
              ` of ${backlogTasks.length}`}
          </Badge>
          <Group gap={[8, 16]} align="center" style={{ width: "100%", maxWidth: "100%" }}>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <TaskSearchInput onSearchChange={term => dispatch(setBacklogSearchTermAction(term))} />
            </Box>
            {/* TagFilter - Mobile Only */}
            {isMobile && (
              <TagFilter
                tags={tags}
                selectedTagIds={selectedTagIds}
                onTagSelect={handleTagSelect}
                onTagDeselect={handleTagDeselect}
                onCreateTag={async (name, color) => {
                  return await createTagMutation({ name, color }).unwrap();
                }}
                compact
              />
            )}
          </Group>
          {/* New Task Input */}
          <Box style={{ marginTop: 8, width: "100%", maxWidth: "100%" }}>
            <TextInput
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
              styles={{
                input: {
                  backgroundColor: "transparent",
                  borderWidth: "0",
                  borderColor: "transparent",
                  color: textColor,
                  "&::placeholder": {
                    color: mutedText,
                  },
                  "&:focus": {
                    borderWidth: "0",
                    borderColor: "transparent",
                    boxShadow: "none",
                    outline: "none",
                  },
                  "&:focusVisible": {
                    borderWidth: "0",
                    borderColor: "transparent",
                    boxShadow: "none",
                    outline: "none",
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Droppable area for tasks */}
        <Box
          ref={setNodeRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: tasksWithIds.length === 0 ? 16 : 8,
            background: isOver ? dropHighlight : "transparent",
            borderRadius: "var(--mantine-radius-md)",
            transition: "background-color 0.2s, padding 0.2s",
            borderWidth: isOver ? "2px" : "0px",
            borderColor: isOver ? dnd.dropTargetBorder : "transparent",
            borderStyle: "dashed",
            marginLeft: isOver ? 8 : 0,
            marginRight: isOver ? 8 : 0,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {/* Unscheduled Tasks */}
          {tasksWithIds.length > 0 ? (
            <Box>
              <Text
                size="xs"
                fw={600}
                c={mutedText}
                style={{ marginBottom: 8, marginLeft: 8, textTransform: "uppercase" }}
              >
                Unscheduled Tasks
              </Text>
              <SortableContext
                id="backlog"
                items={tasksWithIds.map(t => t.draggableId)}
                strategy={verticalListSortingStrategy}
              >
                <Stack
                  align="stretch"
                  gap={8}
                  style={{ paddingLeft: 8, paddingRight: 8, width: "100%", maxWidth: "100%" }}
                >
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
                  <TextInput
                    ref={inlineInputRef}
                    value={inlineInputValue}
                    onChange={e => setInlineInputValue(e.target.value)}
                    onBlur={handleInlineInputBlur}
                    onKeyDown={handleInlineInputKeyDown}
                    onClick={handleInlineInputClick}
                    placeholder="New task..."
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        backgroundColor: "transparent",
                        borderWidth: "0px",
                        paddingLeft: 8,
                        paddingRight: 8,
                        paddingTop: 4,
                        paddingBottom: 4,
                        fontSize: "var(--mantine-font-size-sm)",
                        color: isInlineInputActive ? textColor : mutedText,
                        "&:focus": {
                          outline: "none",
                          color: textColor,
                        },
                        "&::placeholder": {
                          color: mutedText,
                        },
                        "&:hover": {
                          color: textColor,
                        },
                      },
                    }}
                  />
                </Stack>
              </SortableContext>
            </Box>
          ) : (
            <Stack align="stretch" gap={[4, 8]}>
              <Text size={["xs", "sm"]} ta="center" style={{ paddingTop: 16, paddingBottom: 32 }} c={mutedText}>
                {isOver ? "Drop here" : "No tasks"}
              </Text>
              <TextInput
                ref={inlineInputRef}
                value={inlineInputValue}
                onChange={e => setInlineInputValue(e.target.value)}
                onBlur={handleInlineInputBlur}
                onKeyDown={handleInlineInputKeyDown}
                onClick={handleInlineInputClick}
                placeholder="New task..."
                size="sm"
                variant="unstyled"
                styles={{
                  input: {
                    backgroundColor: "transparent",
                    borderWidth: "0px",
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    fontSize: "var(--mantine-font-size-sm)",
                    color: isInlineInputActive ? textColor : mutedText,
                    "&:focus": {
                      outline: "none",
                      color: textColor,
                    },
                    "&::placeholder": {
                      color: mutedText,
                    },
                    "&:hover": {
                      color: textColor,
                    },
                  },
                }}
              />
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export const BacklogDrawer = memo(BacklogDrawerComponent);

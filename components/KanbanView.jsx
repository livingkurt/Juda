"use client";

import { useState, useMemo, memo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Flex, Stack, Group, Text, ActionIcon, Badge, TextInput } from "@mantine/core";
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
import { setKanbanSearchTerm, setKanbanSelectedTagIds } from "@/lib/store/slices/uiSlice";

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
    <Box
      style={{
        flex: 1,
        minWidth: "280px",
        maxWidth: "400px",
        background: bgColor,
        borderRadius: "var(--mantine-radius-lg)",
        padding: 12,
      }}
    >
      {/* Column Header */}
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Group gap={8}>
          <Box style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Badge color="gray" style={{ borderRadius: "50%", paddingLeft: 8, paddingRight: 8 }}>
            {visibleTasks.length}
          </Badge>
        </Group>
        <ActionIcon size="xs" variant="subtle" onClick={handleAddTask} aria-label={`Add task to ${title}`}>
          <Plus size={16} stroke="currentColor" />
        </ActionIcon>
      </Flex>

      {/* Column Content */}
      <Box
        ref={setNodeRef}
        style={{
          background: isOver ? dropHighlight : columnBg,
          borderRadius: "var(--mantine-radius-md)",
          borderWidth: "2px",
          borderStyle: "solid",
          borderColor: isDraggingOver ? dnd.dropTargetBorder : borderColor,
          minHeight: "200px",
          maxHeight: "calc(100vh - 300px)",
          overflowY: "auto",
          padding: 8,
          transition: "all 0.2s",
          position: "relative",
        }}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={8} align="stretch" style={{ minHeight: isDraggingOver ? "100px" : "auto" }}>
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
                style={{
                  minHeight: "80px",
                  borderWidth: "2px",
                  borderStyle: "dashed",
                  borderColor: dnd.dropTargetBorder,
                  borderRadius: "var(--mantine-radius-md)",
                  background: dnd.dropTarget,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.8,
                  transition: "all 0.2s",
                  flex: visibleTasks.length === 0 ? 1 : undefined,
                }}
              >
                <Text size="sm" c={interactive.primary} fw={500}>
                  Drop here
                </Text>
              </Box>
            )}
            {visibleTasks.length === 0 && !isDraggingOver && (
              <Stack align="stretch" gap={8}>
                <Text c={mutedText} size="sm" ta="center" style={{ paddingTop: 16, paddingBottom: 16 }}>
                  No tasks
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
            {visibleTasks.length > 0 && (
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
            )}
          </Stack>
        </SortableContext>
      </Box>
    </Box>
  );
});

// Main Kanban View component
export const KanbanView = memo(function KanbanView({ createDraggableId }) {
  const dispatch = useDispatch();

  // Get search/filter state from Redux
  const searchTerm = useSelector(state => state.ui.kanbanSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.kanbanSelectedTagIds);

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

  const handleTagSelect = useCallback(
    tagId => {
      dispatch(setKanbanSelectedTagIds([...selectedTagIds, tagId]));
    },
    [dispatch, selectedTagIds]
  );

  const handleTagDeselect = useCallback(
    tagId => {
      dispatch(setKanbanSelectedTagIds(selectedTagIds.filter(id => id !== tagId)));
    },
    [dispatch, selectedTagIds]
  );

  const columns = [
    { id: "todo", title: "Todo", color: "gray.400" },
    { id: "in_progress", title: "In Progress", color: "blue.400" },
    { id: "complete", title: "Done", color: "green.400" },
  ];

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with search and filters */}
      <Box style={{ marginBottom: 16 }}>
        <Group gap={16} align="center">
          <Box style={{ flex: 1, maxWidth: "300px" }}>
            <TaskSearchInput onSearchChange={term => dispatch(setKanbanSearchTerm(term))} />
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
        </Group>
      </Box>

      {/* Kanban Columns */}
      <Flex gap={16} style={{ flex: 1, overflowX: "auto", paddingBottom: 16 }}>
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

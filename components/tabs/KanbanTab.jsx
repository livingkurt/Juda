"use client";

import { useMemo, memo, useCallback } from "react";
import { Box, Stack, Typography, IconButton, Chip, CircularProgress } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Add } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { TaskItem } from "@/components/TaskItem";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { QuickTaskInput } from "@/components/QuickTaskInput";
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

  const isDraggingOver = isOver && active;

  // Use hooks directly
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const dialogState = useDialogState();

  // Get viewDate from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  const recentlyCompletedTasks = completionHandlers.recentlyCompletedTasks;

  // Filter out tasks that are no longer "recently completed" for the Done column
  const visibleTasks = useMemo(() => {
    if (id !== "complete") return tasks;
    return tasks.filter(task => task.status === "complete" || recentlyCompletedTasks?.has(task.id));
  }, [id, tasks, recentlyCompletedTasks]);

  // Memoize sortable IDs to prevent unnecessary recalculations
  const sortableIds = useMemo(
    () => visibleTasks.map(task => createDraggableId.kanban(task.id, id)),
    [visibleTasks, id, createDraggableId]
  );

  const handleCreateQuickTask = useCallback(
    async title => {
      await taskOps.handleCreateKanbanTaskInline(id, title);
    },
    [taskOps, id]
  );

  const handleAddTask = () => {
    dialogState.setDefaultSectionId(taskOps.sections[0]?.id);
    dialogState.setEditingTask({ status: id });
    dialogState.openTaskDialog();
  };

  return (
    <Box sx={{ flex: 1, minWidth: 280, maxWidth: 400, borderRadius: 2, p: 1.5 }}>
      {/* Column Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              bgcolor: color,
            }}
          />
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          <Chip label={visibleTasks.length} size="small" sx={{ borderRadius: "12px", px: 1 }} />
        </Stack>
        <IconButton size="small" onClick={handleAddTask} aria-label={`Add task to ${title}`}>
          <Add fontSize="small" />
        </IconButton>
      </Stack>

      {/* Column Content */}
      <Box
        ref={setNodeRef}
        sx={{
          bgcolor: isDraggingOver ? "action.selected" : "background.paper",
          borderRadius: 1,
          border: 2,
          borderColor: isDraggingOver ? "primary.main" : "divider",
          minHeight: 200,
          maxHeight: "calc(100vh - 300px)",
          overflowY: "auto",
          p: 1,
          transition: "all 0.2s",
          position: "relative",
        }}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <Stack spacing={1} sx={{ minHeight: isDraggingOver ? 100 : "auto" }}>
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
            {/* Drop placeholder */}
            {isDraggingOver && (
              <Box
                sx={{
                  minHeight: 80,
                  border: 2,
                  borderStyle: "dashed",
                  borderColor: "primary.main",
                  borderRadius: 1,
                  bgcolor: "action.selected",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.8,
                  transition: "all 0.2s",
                  flex: visibleTasks.length === 0 ? 1 : undefined,
                }}
              >
                <Typography variant="body2" color="primary.main" fontWeight={500}>
                  Drop here
                </Typography>
              </Box>
            )}
            {visibleTasks.length === 0 && !isDraggingOver && (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  No tasks
                </Typography>
                <QuickTaskInput
                  placeholder="New task..."
                  onCreate={handleCreateQuickTask}
                  size="small"
                  variant="standard"
                />
              </Stack>
            )}
            {visibleTasks.length > 0 && (
              <QuickTaskInput
                placeholder="New task..."
                onCreate={handleCreateQuickTask}
                size="small"
                variant="standard"
              />
            )}
          </Stack>
        </SortableContext>
      </Box>
    </Box>
  );
});

// Main Kanban Tab component
export function KanbanTab({ createDraggableId, isLoading }) {
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
  const kanbanTasks = useMemo(() => {
    return taskFilters.tasks.filter(task => {
      if (task.completionType === "note") return false;
      if (task.recurrence && task.recurrence.type !== "none") return false;
      if (task.parentId) return false;
      return true;
    });
  }, [taskFilters.tasks]);

  // Apply search and tag filters
  const filteredTasks = useMemo(() => {
    let filtered = kanbanTasks;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(search) ||
          task.taskTags?.some(tt => tt.tag?.name?.toLowerCase().includes(search))
      );
    }

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
    { id: "todo", title: "Todo", color: "grey.400" },
    { id: "in_progress", title: "In Progress", color: "primary.main" },
    { id: "complete", title: "Done", color: "success.main" },
  ];

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 6 },
      }}
    >
      {/* Header with search and filters */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ flex: 1, maxWidth: 300 }}>
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
        </Stack>
      </Box>

      {/* Kanban Columns */}
      <Stack direction="row" spacing={2} sx={{ flex: 1, overflowX: "auto", pb: 2 }}>
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
      </Stack>
    </Box>
  );
}

"use client";

import { useMemo, memo, useCallback } from "react";
import { Box, Stack, Typography, IconButton, Chip } from "@mui/material";
import { Droppable } from "@hello-pangea/dnd";
import { Add } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { TaskItem } from "./TaskItem";
import { TaskSearchInput } from "./TaskSearchInput";
import { TagSelector } from "./TagSelector";
import { QuickTaskInput } from "./QuickTaskInput";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useDialogState } from "@/hooks/useDialogState";
import { setKanbanSearchTerm, setKanbanSelectedTagIds } from "@/lib/store/slices/uiSlice";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useTaskItemShared } from "@/hooks/useTaskItemShared";

// Kanban column component
const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  tasks,
  color,
  createDraggableId,
  allTasks,
  taskItemShared,
}) {
  // Use hooks directly
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers({
    tasksOverride: allTasks,
    skipTasksQuery: true,
  });
  const dialogState = useDialogState();

  // Get viewDate from Redux
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Get recentlyCompletedTasks from completionHandlers
  const recentlyCompletedTasks = completionHandlers.recentlyCompletedTasks;

  // Filter out tasks that are no longer "recently completed" for the Done column
  const visibleTasks = useMemo(() => {
    if (id !== "complete") return tasks;
    // Show tasks that are either still in complete status OR recently completed
    return tasks.filter(task => task.status === "complete" || recentlyCompletedTasks?.has(task.id));
  }, [id, tasks, recentlyCompletedTasks]);

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
      <Droppable droppableId={`kanban-${id}`} type="TASK">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              border: 2,
              borderColor: "divider",
              minHeight: 200,
              maxHeight: "calc(100vh - 300px)",
              overflowY: "auto",
              p: 1,
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <Stack spacing={1} sx={{ minHeight: snapshot.isDraggingOver ? 100 : "auto" }}>
              {visibleTasks.map((task, index) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  variant="kanban"
                  index={index}
                  containerId={`kanban-column|${id}`}
                  draggableId={createDraggableId.kanban(task.id, id)}
                  viewDate={viewDate}
                  allTasksOverride={allTasks}
                  shared={taskItemShared}
                  meta={taskItemShared?.taskMetaById?.get(task.id)}
                />
              ))}
              {provided.placeholder}
              {/* Drop placeholder */}
              {snapshot.isDraggingOver && visibleTasks.length === 0 && (
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
                  }}
                >
                  <Typography variant="body2" color="primary.main" fontWeight={500}>
                    Drop here
                  </Typography>
                </Box>
              )}
              {visibleTasks.length === 0 && !snapshot.isDraggingOver && (
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
          </Box>
        )}
      </Droppable>
    </Box>
  );
});

// Main Kanban View component
export const KanbanView = memo(function KanbanView({ createDraggableId }) {
  const dispatch = useDispatch();

  // Get search/filter state from Redux
  const searchTerm = useSelector(state => state.ui.kanbanSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.kanbanSelectedTagIds);
  const todayViewDateISO = useSelector(state => state.ui.todayViewDate);
  const viewDate = todayViewDateISO ? new Date(todayViewDateISO) : new Date();

  // Use hooks directly (they use Redux internally)
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const handleCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  const taskItemShared = useTaskItemShared({
    allTasks: taskFilters.tasks,
    viewDate,
    tags,
    onCreateTag: handleCreateTag,
    completionHandlers,
  });

  // Filter tasks: non-recurring only, exclude notes
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

  const columns = [
    { id: "todo", title: "Todo", color: "grey.400" },
    { id: "in_progress", title: "In Progress", color: "primary.main" },
    { id: "complete", title: "Done", color: "success.main" },
  ];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with search and filters */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ flex: 1, maxWidth: 300 }}>
            <TaskSearchInput onSearchChange={term => dispatch(setKanbanSearchTerm(term))} />
          </Box>
          <TagSelector
            filterMode
            selectedTagIds={selectedTagIds}
            onSelectionChange={tagIds => dispatch(setKanbanSelectedTagIds(tagIds))}
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
            allTasks={taskFilters.tasks}
            taskItemShared={taskItemShared}
          />
        ))}
      </Stack>
    </Box>
  );
});

export default KanbanView;

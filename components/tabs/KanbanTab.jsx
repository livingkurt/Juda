"use client";

import { useMemo, memo, useCallback } from "react";
import { Box, Stack, Typography, IconButton, Chip, CircularProgress, Button } from "@mui/material";
import { DndProvider } from "@/components/dnd/DndContext";
import { Droppable } from "@/components/dnd/Droppable";
import { SortableContext } from "@/components/dnd/SortableContext";
import { SortablePlaceholder } from "@/components/dnd/SortablePlaceholder";
import { useDragMeta, useProjectedTaskIds } from "@/components/dnd/useProjectedTaskIds";
import { Add, Visibility as Eye, VisibilityOff as EyeOff } from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import { TaskItem } from "@/components/TaskItem";
import { TaskSearchInput } from "@/components/TaskSearchInput";
import { TagFilter } from "@/components/TagFilter";
import { PriorityFilter } from "@/components/PriorityFilter";
import { QuickTaskInput } from "@/components/QuickTaskInput";
import { DateNavigation } from "@/components/DateNavigation";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useDialogState } from "@/hooks/useDialogState";
import {
  setKanbanSearchTerm,
  setKanbanSelectedTagIds,
  setKanbanSelectedPriorities,
  setKanbanViewDate,
  setKanbanShowTodayComplete,
} from "@/lib/store/slices/uiSlice";
import { createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { useGetTasksQuery, useBatchReorderTasksMutation, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { getDragOverlayStyles } from "@/lib/dndkit-config";

// Kanban column component
const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  tasks,
  color,
  createDraggableId,
  viewDate,
  showTodayComplete,
}) {
  // Use hooks directly
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const dialogState = useDialogState();
  const { isCompletedOnDate } = useCompletionHelpers();

  // Get recentlyCompletedTasks from completionHandlers
  const recentlyCompletedTasks = completionHandlers.recentlyCompletedTasks;

  // Filter tasks for the Done column
  const visibleTasks = useMemo(() => {
    if (id !== "complete") return tasks;

    // Show tasks that are either still in complete status OR recently completed
    let completeTasks = tasks.filter(task => task.status === "complete" || recentlyCompletedTasks?.has(task.id));

    // If showing only today's completed tasks, filter by completion date
    if (showTodayComplete) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      completeTasks = completeTasks.filter(task => {
        // If task is recently completed, show it (it was completed today)
        if (recentlyCompletedTasks?.has(task.id)) return true;
        // Check if task was completed today
        return isCompletedOnDate(task.id, today);
      });
    }

    return completeTasks;
  }, [id, tasks, recentlyCompletedTasks, showTodayComplete, isCompletedOnDate]);

  const orderedTasks = useMemo(() => {
    return [...visibleTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [visibleTasks]);

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

  const sortableTaskIds = useMemo(
    () => orderedTasks.map(task => createDraggableId.kanban(task.id, id)),
    [createDraggableId, id, orderedTasks]
  );

  const columnDroppableId = `kanban-${id}`;

  // Use centralized drag projection
  const projectedTaskIds = useProjectedTaskIds(sortableTaskIds, columnDroppableId);
  const { activeId, activeContainerId, overContainerId } = useDragMeta();

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
      <Droppable id={columnDroppableId} type="TASK">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
              border: 2,
              borderColor: "divider",
              maxHeight: "calc(100vh - 300px)",
              overflowY: "auto",
              p: 1,
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            <SortableContext items={projectedTaskIds}>
              <Stack spacing={1} sx={{ minHeight: snapshot.isDraggingOver ? 100 : "auto" }}>
                {projectedTaskIds.map(taskId => {
                  const isIncomingPlaceholder =
                    taskId === activeId &&
                    activeContainerId !== columnDroppableId &&
                    overContainerId === columnDroppableId;
                  if (isIncomingPlaceholder) {
                    return <SortablePlaceholder key={taskId} id={taskId} height={60} />;
                  }
                  const task = orderedTasks.find(t => createDraggableId.kanban(t.id, id) === taskId);
                  if (!task) {
                    return null;
                  }
                  const index = orderedTasks.findIndex(t => t.id === task.id);
                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      variant="kanban"
                      index={index}
                      containerId={`kanban-${id}`}
                      draggableId={taskId}
                      viewDate={viewDate}
                    />
                  );
                })}
                {provided.placeholder}
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
            </SortableContext>
          </Box>
        )}
      </Droppable>
    </Box>
  );
});

// Main Kanban View component
const KanbanView = memo(function KanbanView({ createDraggableId, selectedDate, showTodayComplete }) {
  const dispatch = useDispatch();

  // Get search/filter state from Redux
  const searchTerm = useSelector(state => state.ui.kanbanSearchTerm);
  const selectedTagIds = useSelector(state => state.ui.kanbanSelectedTagIds);
  const selectedPriorities = useSelector(state => state.ui.kanbanSelectedPriorities);

  // Use hooks directly (they use Redux internally)
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  // Get task filters (needs recentlyCompletedTasks from completionHandlers)
  const taskFilters = useTaskFilters({
    recentlyCompletedTasks: completionHandlers.recentlyCompletedTasks,
  });

  // Filter tasks: exclude notes, exclude recurring tasks, filter by date, exclude subtasks
  const kanbanTasks = useMemo(() => {
    return taskFilters.tasks.filter(task => {
      // Exclude notes
      if (task.completionType === "note") return false;
      // Exclude subtasks (they follow their parent)
      if (task.parentId) return false;
      // Always exclude recurring tasks (they don't use status)
      const isRecurring = task.recurrence && task.recurrence.type !== "none";
      if (isRecurring) return false;

      // Date filtering: show tasks that should appear on the selected date
      if (selectedDate) {
        // Tasks with no recurrence - show if they match the selected date or have no date set
        if (task.date) {
          const taskDate = new Date(task.date);
          taskDate.setHours(0, 0, 0, 0);
          const checkDate = new Date(selectedDate);
          checkDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === checkDate.getTime();
        }
        // No date set - show in kanban (backlog tasks)
        return true;
      }

      // No date selected - show all non-recurring tasks
      return true;
    });
  }, [taskFilters.tasks, selectedDate]);

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

    // Priority filter
    if (selectedPriorities.length > 0) {
      filtered = filtered.filter(task => selectedPriorities.includes(task.priority));
    }

    return filtered;
  }, [kanbanTasks, searchTerm, selectedTagIds, selectedPriorities]);

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

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with search and filters */}
      <Box sx={{ m: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ flex: 1 }}>
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
            <PriorityFilter
              selectedPriorities={selectedPriorities}
              onPrioritySelect={priority => {
                if (!selectedPriorities.includes(priority)) {
                  dispatch(setKanbanSelectedPriorities([...selectedPriorities, priority]));
                }
              }}
              onPriorityDeselect={priority =>
                dispatch(setKanbanSelectedPriorities(selectedPriorities.filter(value => value !== priority)))
              }
            />
          </Stack>
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
            viewDate={selectedDate}
            showTodayComplete={showTodayComplete}
          />
        ))}
      </Stack>
    </Box>
  );
});

// Main Kanban Tab component
export function KanbanTab({ isLoading }) {
  const dispatch = useDispatch();
  const { data: tasks = [] } = useGetTasksQuery();
  const [batchReorderTasksMutation] = useBatchReorderTasksMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();

  // Get kanban view date from Redux
  const kanbanViewDateISO = useSelector(state => state.ui.kanbanViewDate);
  const selectedDate = useMemo(() => {
    return kanbanViewDateISO ? new Date(kanbanViewDateISO) : null;
  }, [kanbanViewDateISO]);

  // Get show today complete preference from Redux
  const showTodayComplete = useSelector(state => state.ui.kanbanShowTodayComplete);

  // Date navigation handlers
  const handleDateChange = useCallback(
    date => {
      dispatch(setKanbanViewDate(date));
    },
    [dispatch]
  );

  const handlePrevious = useCallback(() => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    dispatch(setKanbanViewDate(newDate));
  }, [dispatch, selectedDate]);

  const handleNext = useCallback(() => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    dispatch(setKanbanViewDate(newDate));
  }, [dispatch, selectedDate]);

  const handleToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dispatch(setKanbanViewDate(today));
  }, [dispatch]);

  const handleToggleDateFilter = useCallback(() => {
    if (selectedDate) {
      // Clear date (hide date navigation)
      dispatch(setKanbanViewDate(null));
    } else {
      // Set date to today (show date navigation)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dispatch(setKanbanViewDate(today));
    }
  }, [dispatch, selectedDate]);

  // Drag handler for Kanban
  // Note: We don't await API calls here - optimistic updates in RTK Query handle the UI instantly
  // The mutations have onQueryStarted handlers that update the cache immediately
  const handleDragEnd = useCallback(
    result => {
      const { destination, source, type, draggableId } = result;

      // Dropped outside a droppable area
      if (!destination) return;

      // Dropped in the same position
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      // Handle task dragging between kanban columns
      if (type === "TASK") {
        // Extract task ID using the helper (handles context-aware IDs like "task-{id}-kanban-{status}")
        const taskId = extractTaskId(draggableId);
        const sourceStatus = source?.droppableId?.replace("kanban-", "") || "";
        const destStatus = destination?.droppableId?.replace("kanban-", "") || "";

        // Filter tasks for kanban (exclude notes, recurring, subtasks)
        const kanbanTasks = tasks.filter(
          t => t.completionType !== "note" && (!t.recurrence || t.recurrence.type === "none") && !t.parentId
        );

        // Same column - just reorder
        if (sourceStatus === destStatus) {
          const columnTasks = kanbanTasks
            .filter(t => t.status === sourceStatus)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          // Find the task being moved
          const taskIndex = columnTasks.findIndex(t => t.id === taskId);
          if (taskIndex === -1) return; // Task not found

          // Remove and reinsert
          const [removed] = columnTasks.splice(taskIndex, 1);
          columnTasks.splice(destination.index, 0, removed);

          const updates = columnTasks.map((t, idx) => ({ id: t.id, order: idx }));
          // Fire and forget - optimistic update handles UI
          batchReorderTasksMutation(updates);
          return;
        }

        // Different column - move task and reorder
        // Find the task being moved
        const movedTask = kanbanTasks.find(t => t.id === taskId);
        if (!movedTask) return;

        // Update status - optimistic update handles UI
        updateTaskMutation({ id: taskId, status: destStatus });

        // Then reorder both columns
        const sourceTasks = kanbanTasks
          .filter(t => t.status === sourceStatus && t.id !== taskId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        const destTasks = kanbanTasks
          .filter(t => t.status === destStatus && t.id !== taskId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Remove from source (reorder remaining tasks)
        const sourceUpdates = sourceTasks.map((t, idx) => ({ id: t.id, order: idx }));

        // Add to destination
        destTasks.splice(destination.index, 0, movedTask);
        const destUpdates = destTasks.map((t, idx) => ({ id: t.id, order: idx }));

        // Reorder both columns - fire and forget, optimistic update handles UI
        batchReorderTasksMutation([...sourceUpdates, ...destUpdates]);
        return;
      }
    },
    [tasks, batchReorderTasksMutation, updateTaskMutation]
  );

  const renderDragOverlay = (activeId, activeData) => {
    if (activeData?.type !== "TASK") return null;

    const taskId = activeData?.taskId || extractTaskId(activeId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;

    return (
      <Box sx={{ ...getDragOverlayStyles(), borderRadius: 2, bgcolor: "background.paper" }}>
        <TaskItem task={task} variant="kanban" isDragOverlay viewDate={selectedDate} />
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Date Navigation */}
      <Box sx={{ p: 2, pb: 0 }}>
        <Stack spacing={2}>
          {selectedDate && (
            <DateNavigation
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
              showDatePicker={true}
              showDateDisplay={true}
            />
          )}
          {/* Filter Controls */}
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <Button
              size="small"
              variant="text"
              onClick={() => dispatch(setKanbanShowTodayComplete(!showTodayComplete))}
              sx={{
                fontSize: "0.875rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Box
                component="span"
                sx={{
                  color: "currentColor",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {showTodayComplete ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                {showTodayComplete ? "Show Today Complete" : "Show All Complete"}
              </Box>
            </Button>
            <Button
              size="small"
              variant="text"
              onClick={handleToggleDateFilter}
              sx={{
                fontSize: "0.875rem",
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Box
                component="span"
                sx={{
                  color: "currentColor",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                {selectedDate ? <Eye fontSize="small" /> : <EyeOff fontSize="small" />}
                {selectedDate ? "Hide Date Filter" : "Filter by Date"}
              </Box>
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Kanban View */}
      <DndProvider onDragEnd={handleDragEnd} renderOverlay={renderDragOverlay}>
        <KanbanView
          createDraggableId={createDraggableId}
          selectedDate={selectedDate}
          showTodayComplete={showTodayComplete}
        />
      </DndProvider>
    </Box>
  );
}

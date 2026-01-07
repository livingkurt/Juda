"use client";

import { Box, CircularProgress } from "@mui/material";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanView } from "@/components/KanbanView";
import { createDraggableId, extractTaskId } from "@/lib/dragHelpers";
import { useCallback } from "react";
import { useGetTasksQuery, useBatchReorderTasksMutation, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";

// Main Kanban Tab component
export function KanbanTab({ isLoading }) {
  const { data: tasks = [] } = useGetTasksQuery();
  const [batchReorderTasksMutation] = useBatchReorderTasksMutation();
  const [updateTaskMutation] = useUpdateTaskMutation();

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
        const sourceStatus = source.droppableId.replace("kanban-", "");
        const destStatus = destination.droppableId.replace("kanban-", "");

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

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <KanbanView createDraggableId={createDraggableId} />
    </DragDropContext>
  );
}

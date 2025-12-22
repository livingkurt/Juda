"use client";

import { Box, Text } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";

export const UntimedTask = ({ task, onTaskClick, createDraggableId, date, isCompletedOnDate, getOutcomeOnDate }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, date) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, date) : null;
  const isSkipped = outcome === "skipped";

  // Diagonal stripe pattern for skipped tasks
  const skippedPattern = isSkipped
    ? {
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 4px,
          rgba(0, 0, 0, 0.2) 4px,
          rgba(0, 0, 0, 0.2) 8px
        )`,
      }
    : {};

  const style = {
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : isCompleted || isSkipped ? 0.6 : 1,
    filter: isCompleted || isSkipped ? "brightness(0.7)" : "none",
    pointerEvents: isDragging ? "none" : "auto",
    ...skippedPattern,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p={2}
      borderRadius="md"
      bg={task.color || "#3b82f6"}
      color="white"
      cursor="grab"
      boxShadow="sm"
      onClick={() => onTaskClick(task)}
    >
      <Text fontSize="sm" fontWeight="medium" textDecoration={isCompleted || isSkipped ? "line-through" : "none"}>
        {task.title}
      </Text>
    </Box>
  );
};

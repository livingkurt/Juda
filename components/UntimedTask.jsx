"use client";

import { Box, Text } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";

export const UntimedTask = ({ task, onTaskClick, createDraggableId, date, isCompletedOnDate }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, date) : false;

  const style = {
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : isCompleted ? 0.6 : 1,
    filter: isCompleted ? "brightness(0.7)" : "none",
    pointerEvents: isDragging ? "none" : "auto",
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
      <Text fontSize="sm" fontWeight="medium" textDecoration={isCompleted ? "line-through" : "none"}>
        {task.title}
      </Text>
    </Box>
  );
};

"use client";

import { Box, Text } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";

export const UntimedWeekTask = ({ task, onTaskClick, createDraggableId, day }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const style = {
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? "none" : "auto",
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      p={1}
      borderRadius="sm"
      bg={task.color || "#3b82f6"}
      color="white"
      cursor="grab"
      boxShadow="sm"
      onClick={e => {
        e.stopPropagation();
        onTaskClick(task);
      }}
    >
      <Text fontSize="2xs" fontWeight="medium" noOfLines={2}>
        {task.title}
      </Text>
    </Box>
  );
};

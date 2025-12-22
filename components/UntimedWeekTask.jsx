"use client";

import { Box, Text } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";

export const UntimedWeekTask = ({ task, onTaskClick, createDraggableId, day, isCompletedOnDate, getOutcomeOnDate }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, day) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
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
      <Text
        fontSize="2xs"
        fontWeight="medium"
        noOfLines={2}
        textDecoration={isCompleted || isSkipped ? "line-through" : "none"}
      >
        {task.title}
      </Text>
    </Box>
  );
};

"use client";

import { Box, Text } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { formatTime } from "@/lib/utils";

export const TimedTask = ({
  task,
  onTaskClick,
  createDraggableId,
  date,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
  isCompletedOnDate,
  getOutcomeOnDate,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const isNoDuration = task.duration === 0;
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
    ...getTaskStyle(task),
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging && !internalDrag.taskId ? 0 : isCompleted || isSkipped ? 0.6 : 1,
    filter: isCompleted || isSkipped ? "brightness(0.7)" : "none",
    pointerEvents: isDragging && !internalDrag.taskId ? "none" : "auto",
    ...skippedPattern,
  };

  return (
    <Box
      ref={setNodeRef}
      position="absolute"
      left={task.left}
      width={task.width}
      ml={1}
      mr={1}
      borderRadius="md"
      color="white"
      fontSize="sm"
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "lg" }}
      bg={isNoDuration ? "gray.600" : task.color || "#3b82f6"}
      borderWidth={isNoDuration ? "2px" : "0"}
      borderColor={isNoDuration ? task.color || "#3b82f6" : "transparent"}
      minH={isNoDuration ? "24px" : undefined}
      style={style}
      boxShadow={internalDrag.taskId === task.id ? "xl" : "none"}
      zIndex={internalDrag.taskId === task.id ? 50 : "auto"}
      onClick={e => e.stopPropagation()}
    >
      {/* Task content - drag handle for cross-container DnD */}
      <Box
        {...attributes}
        {...listeners}
        position="absolute"
        inset={0}
        px={2}
        py={1}
        cursor="grab"
        onClick={e => {
          e.stopPropagation();
          onTaskClick(task);
        }}
      >
        <Text fontWeight="medium" isTruncated textDecoration={isCompleted || isSkipped ? "line-through" : "none"}>
          {task.title}
        </Text>
        {(task.duration || 30) >= 45 && (
          <Text fontSize="xs" opacity={0.8}>
            {formatTime(task.time)}
          </Text>
        )}
      </Box>

      {/* Resize handle */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        h={3}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.200" }}
        display="flex"
        alignItems="center"
        justifyContent="center"
        onMouseDown={e => {
          if (!isDragging) {
            handleInternalDragStart(e, task, "resize");
          }
        }}
        onClick={e => e.stopPropagation()}
      >
        <Box w={8} h={1} borderRadius="full" bg="whiteAlpha.500" />
      </Box>
    </Box>
  );
};

"use client";

import { useState } from "react";
import { Box, Text, Menu, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { formatTime, getTaskDisplayColor } from "@/lib/utils";
import { TagMenuSelector } from "./TagMenuSelector";
import { TaskContextMenu } from "./TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

export const TimedTask = ({ task, createDraggableId, date, getTaskStyle, internalDrag, handleInternalDragStart }) => {
  const { mode } = useSemanticColors();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const isNoDuration = task.duration === 0;
  const isCompleted = isCompletedOnDate(task.id, date);
  const outcome = getOutcomeOnDate(task.id, date);
  const isNotCompleted = outcome === "not_completed";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";

  // Get task color from first tag, or use neutral gray if no tags
  const taskColor = getTaskDisplayColor(task);

  // Diagonal stripe pattern for not completed tasks
  const notCompletedPattern = isNotCompleted
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
    opacity: isDragging && !internalDrag.taskId ? 0 : isCompleted || isNotCompleted ? 0.6 : 1,
    filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
    pointerEvents: isDragging && !internalDrag.taskId ? "none" : "auto",
    ...notCompletedPattern,
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
      color={taskColor ? "white" : mode.task.neutralText}
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "lg" }}
      bg={isNoDuration ? mode.text.muted : taskColor || mode.task.neutral}
      borderWidth={isNoDuration ? "2px" : "0"}
      borderColor={isNoDuration ? taskColor || mode.border.default : "transparent"}
      minH={isNoDuration ? "24px" : undefined}
      style={style}
      boxShadow={internalDrag.taskId === task.id ? "xl" : "none"}
      zIndex={internalDrag.taskId === task.id ? 50 : "auto"}
      onClick={e => e.stopPropagation()}
    >
      {/* Task content - drag handle for cross-container DnD */}
      <Menu.Root open={menuOpen} onOpenChange={({ open }) => setMenuOpen(open)}>
        <Menu.Trigger asChild>
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
              setMenuOpen(true);
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" h="100%">
              <Box flex={1} minW={0}>
                <Text
                  fontSize={{ base: "xs", md: "sm" }}
                  fontWeight="medium"
                  isTruncated
                  textDecoration={isCompleted || isNotCompleted ? "line-through" : "none"}
                >
                  {task.title}
                </Text>
                {(task.duration || 30) >= 45 && (
                  <Text fontSize={{ base: "2xs", md: "xs" }} opacity={0.8}>
                    {formatTime(task.time)}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
              <TaskContextMenu
                task={task}
                date={date}
                isRecurring={isRecurring}
                isWorkoutTask={isWorkoutTask}
                outcome={outcome}
                onClose={() => setMenuOpen(false)}
              />
              {/* Tags submenu */}
              <TagMenuSelector
                task={task}
                tags={tags}
                onTagsChange={taskOps.handleTaskTagsChange}
                onCreateTag={async (name, color) => {
                  return await createTagMutation({ name, color }).unwrap();
                }}
              />
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

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

"use client";

import { useState, memo } from "react";
import { Box, Menu, Portal } from "@chakra-ui/react";
import { getTaskDisplayColor } from "@/lib/utils";
import { TaskContextMenu } from "../TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * Compact task card for calendar month view
 * Shows just the title as a colored pill with context menu
 */
export const TaskCardCompact = memo(function TaskCardCompact({
  task,
  date,
  zoom = 1.0,
  isCompleted = false,
  outcome = null,
  // Handlers
  onEdit,
  onEditWorkout,
  onDuplicate,
  onDelete,
  onOutcomeChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useSemanticColors();

  const taskColor = getTaskDisplayColor(task);
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const isNotCompleted = outcome === "not_completed";
  const hasOutcome = isCompleted || isNotCompleted;

  // Responsive font sizes based on zoom
  const fontSize = {
    base: zoom >= 1.5 ? "xs" : zoom >= 1.0 ? "2xs" : "3xs",
    md: zoom >= 1.5 ? "sm" : zoom >= 1.0 ? "xs" : "2xs",
  };

  return (
    <Menu.Root
      open={menuOpen}
      onOpenChange={({ open }) => setMenuOpen(open)}
      positioning={{ placement: "right-start" }}
    >
      <Menu.Trigger asChild>
        <Box
          fontSize={fontSize}
          px={1}
          py={0.5}
          borderRadius="md"
          isTruncated
          color={taskColor ? "white" : undefined}
          mb={0.5}
          bg={taskColor || mode.task.neutral}
          cursor="pointer"
          opacity={hasOutcome ? 0.6 : 1}
          textDecoration={isCompleted ? "line-through" : "none"}
          _hover={{ opacity: 0.8 }}
          onClick={e => e.stopPropagation()}
        >
          {task.title}
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
              onEdit={onEdit}
              onEditWorkout={onEditWorkout}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onOutcomeChange={onOutcomeChange}
              onClose={() => setMenuOpen(false)}
            />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
});

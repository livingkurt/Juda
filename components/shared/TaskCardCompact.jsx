"use client";

import { useState, memo } from "react";
import { Box, Menu, Portal } from "@chakra-ui/react";
import { getTaskDisplayColor } from "@/lib/utils";
import { TaskContextMenu } from "../TaskContextMenu";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

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
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useSemanticColors();

  // Use hooks directly (they use Redux internally)
  const { getOutcomeOnDate } = useCompletionHelpers();

  // Get outcome from Redux if not provided
  const actualOutcome = outcome !== null ? outcome : getOutcomeOnDate(task.id, date);
  const actualIsCompleted = isCompleted !== undefined ? isCompleted : actualOutcome === "completed";

  const taskColor = getTaskDisplayColor(task);
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const isNotCompleted = actualOutcome === "not_completed";
  const hasOutcome = actualIsCompleted || isNotCompleted;

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
          textDecoration={actualIsCompleted ? "line-through" : "none"}
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
              outcome={actualOutcome}
              onClose={() => setMenuOpen(false)}
            />
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
});

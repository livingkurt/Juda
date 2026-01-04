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
import { useTheme } from "@/hooks/useTheme";

/**
 * Unified calendar task component used across all calendar views
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Function} props.createDraggableId - Function to create draggable ID
 * @param {Date} props.date - Date for this task instance
 * @param {string} props.variant - "timed" | "untimed" | "timed-week" | "untimed-week"
 * @param {Function} [props.getTaskStyle] - Function to get task positioning style (for timed variants)
 * @param {Object} [props.internalDrag] - Internal drag state (for timed variants)
 * @param {Function} [props.handleInternalDragStart] - Handler for internal drag start (for timed variants)
 */
export const CalendarTask = ({
  task,
  createDraggableId,
  date,
  variant = "timed",
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
}) => {
  const { mode, colorMode } = useSemanticColors();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  // Determine if this is a timed or untimed variant
  const isTimed = variant === "timed" || variant === "timed-week";
  const isWeek = variant === "timed-week" || variant === "untimed-week";

  // Create appropriate draggable ID based on variant
  const draggableId = isTimed
    ? createDraggableId.calendarTimed(task.id, date)
    : createDraggableId.calendarUntimed(task.id, date);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableId,
    data: { task, type: "TASK" },
  });

  const isNoDuration = !task.duration || task.duration === 0;
  const isCompleted = isCompletedOnDate(task.id, date);
  const outcome = getOutcomeOnDate(task.id, date);
  const isNotCompleted = outcome === "not_completed";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";

  // Get task color from first tag, or use neutral gray if no tags
  const taskColor = getTaskDisplayColor(task, theme, colorMode);

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

  // Base style
  const baseStyle = {
    opacity: isDragging && !internalDrag?.taskId ? 0 : isCompleted || isNotCompleted ? 0.6 : 1,
    filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
    pointerEvents: isDragging && !internalDrag?.taskId ? "none" : "auto",
    ...notCompletedPattern,
  };

  // Merge with positioning style for timed tasks
  const style = isTimed && getTaskStyle ? { ...getTaskStyle(task), ...baseStyle } : baseStyle;

  // Font sizes based on variant
  const titleFontSize = isWeek ? { base: "2xs", md: "xs" } : { base: "xs", md: "sm" };
  const timeFontSize = { base: "2xs", md: "xs" };

  // Padding based on variant
  const contentPadding = isTimed ? { px: 2, py: 1 } : { px: 1, py: isWeek ? 0.5 : 0 };

  // Show time text for timed tasks with sufficient duration
  const showTimeText = isTimed && (task.duration || 30) >= 45;

  // Render timed task (absolute positioned with resize handle)
  if (isTimed) {
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
        _hover={{ shadow: isWeek ? "md" : "lg" }}
        bg={isNoDuration ? mode.text.muted : taskColor || mode.task.neutral}
        borderWidth={isNoDuration ? "2px" : "0"}
        borderColor={isNoDuration ? taskColor || mode.border.default : "transparent"}
        minH={isNoDuration ? "24px" : undefined}
        style={style}
        boxShadow={internalDrag?.taskId === task.id ? "xl" : "none"}
        zIndex={internalDrag?.taskId === task.id ? 50 : "auto"}
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
              {...contentPadding}
              cursor="grab"
              onClick={e => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" h="100%">
                <Box flex={1} minW={0}>
                  <Text
                    fontSize={titleFontSize}
                    fontWeight="medium"
                    isTruncated
                    textDecoration={isCompleted || isNotCompleted ? "line-through" : "none"}
                  >
                    {task.title}
                  </Text>
                  {showTimeText && (
                    <Text fontSize={timeFontSize} opacity={0.8}>
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
          h={isWeek ? 2 : 3}
          cursor="ns-resize"
          _hover={{ bg: "blackAlpha.200" }}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onMouseDown={e => {
            if (!isDragging && handleInternalDragStart) {
              handleInternalDragStart(e, task, "resize");
            }
          }}
          onClick={e => e.stopPropagation()}
        >
          {!isWeek && <Box w={8} h={1} borderRadius="full" bg="whiteAlpha.500" />}
        </Box>
      </Box>
    );
  }

  // Render untimed task (simple layout)
  return (
    <Menu.Root open={menuOpen} onOpenChange={({ open }) => setMenuOpen(open)}>
      <Menu.Trigger asChild>
        <Box
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          {...contentPadding}
          borderRadius="md"
          bg={isNoDuration ? mode.text.muted : taskColor || mode.task.neutral}
          borderWidth={isNoDuration ? "2px" : "0"}
          borderColor={isNoDuration ? taskColor || mode.border.default : "transparent"}
          minH={isNoDuration ? "24px" : undefined}
          color={taskColor ? "white" : mode.task.neutralText}
          cursor="grab"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <Text
            fontSize={titleFontSize}
            fontWeight="medium"
            textDecoration={isCompleted || isNotCompleted ? "line-through" : "none"}
            isTruncated
          >
            {task.title}
          </Text>
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
  );
};

"use client";

import { useState } from "react";
import { Box, Text, Menu } from "@mantine/core";
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

  // Font sizes based on variant (Mantine array syntax: [xs, sm, md, lg, xl])
  const titleFontSize = isWeek ? ["0.625rem", "0.75rem"] : ["0.75rem", "0.875rem"];
  const timeFontSize = ["0.625rem", "0.75rem"];

  // Padding based on variant
  const contentPadding = isTimed ? { px: 8, py: 4 } : { px: 4, py: isWeek ? 2 : 0 };

  // Show time text for timed tasks with sufficient duration
  const showTimeText = isTimed && (task.duration || 30) >= 45;

  // Single unified render - timed tasks use absolute positioning, untimed use default
  return (
    <Box
      ref={setNodeRef}
      style={{
        position: isTimed ? "absolute" : undefined,
        left: isTimed ? task.left : undefined,
        width: isTimed ? task.width : undefined,
        marginLeft: isTimed ? 4 : undefined,
        marginRight: isTimed ? 4 : undefined,
        borderRadius: "0.375rem",
        color: taskColor ? "white" : mode.task.neutralText,
        overflow: isTimed ? "hidden" : undefined,
        cursor: "grab",
        background: isNoDuration ? mode.text.muted : taskColor || mode.task.neutral,
        borderWidth: isNoDuration ? "2px" : "0",
        borderColor: isNoDuration ? taskColor || mode.border.default : "transparent",
        borderStyle: "solid",
        minHeight: isNoDuration ? "24px" : undefined,
        boxShadow:
          internalDrag?.taskId === task.id
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "none",
        zIndex: internalDrag?.taskId === task.id ? 50 : "auto",
        ...style,
      }}
      onClick={e => e.stopPropagation()}
      onMouseEnter={e => {
        const target = e.currentTarget;
        if (!isWeek) {
          target.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
        } else {
          target.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
        }
      }}
      onMouseLeave={e => {
        const target = e.currentTarget;
        target.style.boxShadow =
          internalDrag?.taskId === task.id
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            : "none";
      }}
    >
      {/* Task content - drag handle for cross-container DnD */}
      <Menu opened={menuOpen} onClose={() => setMenuOpen(false)}>
        <Menu.Target>
          <Box
            {...attributes}
            {...listeners}
            style={{
              position: isTimed ? "absolute" : undefined,
              inset: isTimed ? 0 : undefined,
              paddingLeft: contentPadding.px,
              paddingRight: contentPadding.px,
              paddingTop: contentPadding.py,
              paddingBottom: contentPadding.py,
              cursor: "grab",
            }}
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: isTimed ? "100%" : undefined,
              }}
            >
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  size={titleFontSize}
                  fw={500}
                  truncate="end"
                  style={{
                    textDecoration: isCompleted || isNotCompleted ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </Text>
                {showTimeText && (
                  <Text size={timeFontSize} style={{ opacity: 0.8 }}>
                    {formatTime(task.time)}
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </Menu.Target>
        <Menu.Dropdown onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
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
        </Menu.Dropdown>
      </Menu>

      {/* Resize handle - only for timed tasks */}
      {isTimed && (
        <Box
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: isWeek ? 8 : 12,
            cursor: "ns-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={e => {
            const target = e.currentTarget;
            target.style.background = "rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={e => {
            const target = e.currentTarget;
            target.style.background = "transparent";
          }}
          onMouseDown={e => {
            if (!isDragging && handleInternalDragStart) {
              handleInternalDragStart(e, task, "resize");
            }
          }}
          onClick={e => e.stopPropagation()}
        >
          {!isWeek && <Box w={32} h={4} style={{ borderRadius: "9999px", background: "rgba(255, 255, 255, 0.5)" }} />}
        </Box>
      )}
    </Box>
  );
};

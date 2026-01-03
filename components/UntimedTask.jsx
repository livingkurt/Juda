"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { getTaskDisplayColor } from "@/lib/utils";
import { Edit2, X, Copy, Trash2, Check, Circle, Dumbbell } from "lucide-react";
import { TagMenuSelector } from "./TagMenuSelector";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useCompletionHandlers } from "@/hooks/useCompletionHandlers";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

export const UntimedTask = ({ task, createDraggableId, date }) => {
  const { mode } = useSemanticColors();
  const [menuOpen, setMenuOpen] = useState(false);

  // Use hooks directly (they use Redux internally)
  const taskOps = useTaskOperations();
  const completionHandlers = useCompletionHandlers();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const { isCompletedOnDate, getOutcomeOnDate } = useCompletionHelpers();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarUntimed(task.id, date),
    data: { task, type: "TASK" },
  });

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
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : isCompleted || isNotCompleted ? 0.6 : 1,
    filter: isCompleted || isNotCompleted ? "brightness(0.7)" : "none",
    pointerEvents: isDragging ? "none" : "auto",
    ...notCompletedPattern,
  };

  return (
    <Menu.Root open={menuOpen} onOpenChange={({ open }) => setMenuOpen(open)}>
      <Menu.Trigger asChild>
        <Box
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          p={2}
          borderRadius="md"
          bg={taskColor || mode.task.neutral}
          color={taskColor ? "white" : mode.task.neutralText}
          cursor="grab"
          boxShadow="sm"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <Text
            fontSize={{ base: "xs", md: "sm" }}
            fontWeight="medium"
            textDecoration={isCompleted || isNotCompleted ? "line-through" : "none"}
          >
            {task.title}
          </Text>
        </Box>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <Menu.Item
              onClick={e => {
                e.stopPropagation();
                taskOps.handleEditTask(task);
                setMenuOpen(false);
              }}
            >
              <HStack gap={2}>
                <Box
                  as="span"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w="14px"
                  h="14px"
                  flexShrink={0}
                >
                  <Edit2 size={14} />
                </Box>
                <Text>Edit</Text>
              </HStack>
            </Menu.Item>
            {/* Edit Workout option for workout-type tasks */}
            {isWorkoutTask && (
              <Menu.Item
                onClick={e => {
                  e.stopPropagation();
                  taskOps.handleEditWorkout(task);
                  setMenuOpen(false);
                }}
              >
                <HStack gap={2}>
                  <Box
                    as="span"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w="14px"
                    h="14px"
                    flexShrink={0}
                  >
                    <Dumbbell size={14} />
                  </Box>
                  <Text>Edit Workout</Text>
                </HStack>
              </Menu.Item>
            )}
            {/* Completion options for recurring tasks */}
            {isRecurring && (
              <>
                {outcome !== null && (
                  <>
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        completionHandlers.handleOutcomeChange(task.id, date, null);
                        setMenuOpen(false);
                      }}
                    >
                      <HStack gap={2}>
                        <Box
                          as="span"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          w="14px"
                          h="14px"
                          flexShrink={0}
                        >
                          <Circle size={14} />
                        </Box>
                        <Text>Uncheck</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Separator />
                  </>
                )}
                {outcome !== "completed" && (
                  <Menu.Item
                    onClick={e => {
                      e.stopPropagation();
                      completionHandlers.handleOutcomeChange(task.id, date, "completed");
                      setMenuOpen(false);
                    }}
                  >
                    <HStack gap={2}>
                      <Box
                        as="span"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        w="14px"
                        h="14px"
                        flexShrink={0}
                      >
                        <Check size={14} />
                      </Box>
                      <Text>Complete</Text>
                    </HStack>
                  </Menu.Item>
                )}
                {outcome !== "not_completed" && (
                  <Menu.Item
                    onClick={e => {
                      e.stopPropagation();
                      completionHandlers.handleOutcomeChange(task.id, date, "not_completed");
                      setMenuOpen(false);
                    }}
                  >
                    <HStack gap={2}>
                      <Box
                        as="span"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        w="14px"
                        h="14px"
                        flexShrink={0}
                      >
                        <X size={14} />
                      </Box>
                      <Text>Not Completed</Text>
                    </HStack>
                  </Menu.Item>
                )}
                <Menu.Separator />
              </>
            )}
            <Menu.Item
              onClick={e => {
                e.stopPropagation();
                taskOps.handleDuplicateTask(task.id);
                setMenuOpen(false);
              }}
            >
              <HStack gap={2}>
                <Box
                  as="span"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w="14px"
                  h="14px"
                  flexShrink={0}
                >
                  <Copy size={14} />
                </Box>
                <Text>Duplicate</Text>
              </HStack>
            </Menu.Item>
            {/* Tags submenu */}
            <TagMenuSelector
              task={task}
              tags={tags}
              onTagsChange={taskOps.handleTaskTagsChange}
              onCreateTag={async (name, color) => {
                return await createTagMutation({ name, color }).unwrap();
              }}
            />
            <Menu.Item
              color="red.500"
              onClick={e => {
                e.stopPropagation();
                taskOps.handleDeleteTask(task.id);
                setMenuOpen(false);
              }}
            >
              <HStack gap={2}>
                <Box
                  as="span"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  w="14px"
                  h="14px"
                  flexShrink={0}
                >
                  <Trash2 size={14} />
                </Box>
                <Text>Delete</Text>
              </HStack>
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

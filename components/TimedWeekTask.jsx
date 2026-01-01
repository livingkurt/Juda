"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { getTaskDisplayColor } from "@/lib/utils";
import { Edit2, X, Copy, Trash2, Check, Circle, Dumbbell } from "lucide-react";

export const TimedWeekTask = ({
  task,
  createDraggableId,
  day,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
  isCompletedOnDate,
  getOutcomeOnDate,
  onEditTask,
  onEditWorkout,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const isNoDuration = task.duration === 0;
  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, day) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
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
      color={taskColor ? "white" : "gray.800"}
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "md" }}
      bg={isNoDuration ? "gray.600" : taskColor || "gray.200"}
      borderWidth={isNoDuration ? "2px" : "0"}
      borderColor={isNoDuration ? taskColor || "gray.300" : "transparent"}
      _dark={{
        color: taskColor ? "white" : "gray.100",
        bg: isNoDuration ? "gray.600" : taskColor || "gray.700",
        borderColor: isNoDuration ? taskColor || "gray.600" : "transparent",
      }}
      minH={isNoDuration ? "24px" : undefined}
      style={style}
      boxShadow={internalDrag.taskId === task.id ? "xl" : "none"}
      zIndex={internalDrag.taskId === task.id ? 50 : "auto"}
      onClick={e => e.stopPropagation()}
    >
      {/* Task content */}
      <Menu.Root open={menuOpen} onOpenChange={({ open }) => setMenuOpen(open)}>
        <Menu.Trigger asChild>
          <Box
            {...attributes}
            {...listeners}
            position="absolute"
            inset={0}
            px={1}
            py={0.5}
            cursor="grab"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <Text
              fontSize={{ base: "2xs", md: "xs" }}
              isTruncated
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
              {onEditTask && (
                <Menu.Item
                  onClick={e => {
                    e.stopPropagation();
                    onEditTask(task);
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
              )}
              {/* Edit Workout option for workout-type tasks */}
              {isWorkoutTask && onEditWorkout && (
                <Menu.Item
                  onClick={e => {
                    e.stopPropagation();
                    onEditWorkout(task);
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
              {isRecurring && onOutcomeChange && (
                <>
                  {outcome !== null && (
                    <>
                      <Menu.Item
                        onClick={e => {
                          e.stopPropagation();
                          onOutcomeChange(task.id, day, null);
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
                        onOutcomeChange(task.id, day, "completed");
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
                        onOutcomeChange(task.id, day, "not_completed");
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
              {onDuplicateTask && (
                <Menu.Item
                  onClick={e => {
                    e.stopPropagation();
                    onDuplicateTask(task.id);
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
              )}
              {onDeleteTask && (
                <Menu.Item
                  color="red.500"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
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
              )}
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
        h={2}
        cursor="ns-resize"
        _hover={{ bg: "blackAlpha.200" }}
        onMouseDown={e => {
          if (!isDragging) {
            handleInternalDragStart(e, task, "resize");
          }
        }}
        onClick={e => e.stopPropagation()}
      />
    </Box>
  );
};

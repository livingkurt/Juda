"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { formatTime } from "@/lib/utils";
import { Edit2, SkipForward, Copy, Trash2, Check, Circle } from "lucide-react";

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
  onEditTask,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, date),
    data: { task, type: "TASK" },
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const isNoDuration = task.duration === 0;
  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, date) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, date) : null;
  const isSkipped = outcome === "skipped";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";

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
                <Text fontWeight="medium" isTruncated textDecoration={isCompleted || isSkipped ? "line-through" : "none"}>
                  {task.title}
                </Text>
                {(task.duration || 30) >= 45 && (
                  <Text fontSize="xs" opacity={0.8}>
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
              {onEditTask && (
                <Menu.Item
                  onClick={e => {
                    e.stopPropagation();
                    onEditTask(task);
                    setMenuOpen(false);
                  }}
                >
                  <HStack>
                    <Edit2 size={14} />
                    <Text>Edit</Text>
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
                          onOutcomeChange(task.id, date, null);
                          setMenuOpen(false);
                        }}
                      >
                        <HStack>
                          <Circle size={14} />
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
                        onOutcomeChange(task.id, date, "completed");
                        setMenuOpen(false);
                      }}
                    >
                      <HStack>
                        <Check size={14} />
                        <Text>Complete</Text>
                      </HStack>
                    </Menu.Item>
                  )}
                  {outcome !== "skipped" && (
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        onOutcomeChange(task.id, date, "skipped");
                        setMenuOpen(false);
                      }}
                    >
                      <HStack>
                        <SkipForward size={14} />
                        <Text>Skip</Text>
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
                  <HStack>
                    <Copy size={14} />
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
                  <HStack>
                    <Trash2 size={14} />
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

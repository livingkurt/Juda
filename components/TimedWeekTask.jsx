"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { Edit2, SkipForward, Copy, Trash2, Check, Circle } from "lucide-react";
import { ColorSubmenu } from "./ColorSubmenu";

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
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
  onUpdateTaskColor,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: createDraggableId.calendarTimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const isNoDuration = task.duration === 0;
  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, day) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
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
      overflow="hidden"
      cursor="grab"
      _hover={{ shadow: "md" }}
      bg={isNoDuration ? "gray.600" : task.color || "#3b82f6"}
      borderWidth={isNoDuration ? "2px" : "0"}
      borderColor={isNoDuration ? task.color || "#3b82f6" : "transparent"}
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
              textDecoration={isCompleted || isSkipped ? "line-through" : "none"}
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
              {/* Color submenu */}
              {onUpdateTaskColor && (
                <ColorSubmenu
                  currentColor={task.color || "#3b82f6"}
                  onColorChange={color => {
                    onUpdateTaskColor(task.id, color);
                    setMenuOpen(false);
                  }}
                  onClose={() => setMenuOpen(false)}
                  onCloseParentMenu={() => setMenuOpen(false)}
                />
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
                  {outcome !== "skipped" && (
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        onOutcomeChange(task.id, day, "skipped");
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
                          <SkipForward size={14} />
                        </Box>
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

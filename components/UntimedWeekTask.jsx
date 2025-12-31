"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { Edit2, X, Copy, Trash2, Check, Circle } from "lucide-react";
import { ColorSubmenu } from "./ColorSubmenu";

export const UntimedWeekTask = ({
  task,
  createDraggableId,
  day,
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
    id: createDraggableId.calendarUntimed(task.id, day),
    data: { task, type: "TASK" },
  });

  const isCompleted = isCompletedOnDate ? isCompletedOnDate(task.id, day) : false;
  const outcome = getOutcomeOnDate ? getOutcomeOnDate(task.id, day) : null;
  const isNotCompleted = outcome === "not_completed";
  const isRecurring = task.recurrence && task.recurrence.type !== "none";

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
          p={1}
          borderRadius="sm"
          bg={task.color || "#3b82f6"}
          color="white"
          cursor="grab"
          boxShadow="sm"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
        >
          <Text
            fontSize={{ base: "3xs", md: "2xs" }}
            fontWeight="medium"
            noOfLines={2}
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
  );
};

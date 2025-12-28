"use client";

import { useState } from "react";
import { Box, Text, Menu, HStack, Portal } from "@chakra-ui/react";
import { useDraggable } from "@dnd-kit/core";
import { Edit2, SkipForward, Copy, Trash2, Check, Circle } from "lucide-react";
import { ColorSubmenu } from "./ColorSubmenu";

export const UntimedTask = ({
  task,
  createDraggableId,
  date,
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
    id: createDraggableId.calendarUntimed(task.id, date),
    data: { task, type: "TASK" },
  });

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
    // Don't apply transform for draggable items - DragOverlay handles the preview
    // Only hide the original element when dragging
    opacity: isDragging ? 0 : isCompleted || isSkipped ? 0.6 : 1,
    filter: isCompleted || isSkipped ? "brightness(0.7)" : "none",
    pointerEvents: isDragging ? "none" : "auto",
    ...skippedPattern,
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
            fontSize={{ base: "xs", md: "sm" }}
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
                        onOutcomeChange(task.id, date, null);
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
                      onOutcomeChange(task.id, date, "completed");
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
                      onOutcomeChange(task.id, date, "skipped");
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
  );
};

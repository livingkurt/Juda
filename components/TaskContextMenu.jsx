"use client";

import { HStack, Box, Text, Menu } from "@chakra-ui/react";
import { Edit2, Check, X, Circle, Copy, Trash2, Dumbbell } from "lucide-react";

export const TaskContextMenu = ({
  task,
  date,
  isRecurring,
  isWorkoutTask,
  outcome,
  onEditTask,
  onEditWorkout,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
  onClose,
}) => {
  return (
    <>
      {onEditTask && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            onEditTask(task);
            onClose?.();
          }}
        >
          <HStack gap={2}>
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
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
            onClose?.();
          }}
        >
          <HStack gap={2}>
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
              <Dumbbell size={14} />
            </Box>
            <Text>Edit Workout</Text>
          </HStack>
        </Menu.Item>
      )}

      {/* Completion options for recurring tasks */}
      {isRecurring && onOutcomeChange && date && (
        <>
          {outcome !== null && (
            <>
              <Menu.Item
                onClick={e => {
                  e.stopPropagation();
                  onOutcomeChange(task.id, date, null);
                  onClose?.();
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
                onClose?.();
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
                onOutcomeChange(task.id, date, "not_completed");
                onClose?.();
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
            onClose?.();
          }}
        >
          <HStack gap={2}>
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
              <Copy size={14} />
            </Box>
            <Text>Duplicate</Text>
          </HStack>
        </Menu.Item>
      )}

      {onDeleteTask && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            onDeleteTask(task.id);
            onClose?.();
          }}
          color={{ _light: "red.600", _dark: "red.400" }}
        >
          <HStack gap={2}>
            <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
              <Trash2 size={14} />
            </Box>
            <Text>Delete</Text>
          </HStack>
        </Menu.Item>
      )}
    </>
  );
};

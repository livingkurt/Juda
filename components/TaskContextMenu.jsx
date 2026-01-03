"use client";

import { HStack, Box, Text, Menu } from "@chakra-ui/react";
import { Edit2, Check, X, Circle, Copy, Trash2, Dumbbell, Clock } from "lucide-react";
import { TagMenuSelector } from "./TagMenuSelector";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const TaskContextMenu = ({
  task,
  date,
  isRecurring,
  isWorkoutTask,
  outcome,
  onEdit,
  onEditWorkout,
  onOutcomeChange,
  onDuplicate,
  onDelete,
  onClose,
  tags,
  onTagsChange,
  onCreateTag,
  onStatusChange,
}) => {
  const { mode } = useSemanticColors();

  // Support both naming conventions
  const handleEdit = onEdit;
  const handleDuplicate = onDuplicate;
  const handleDelete = onDelete;

  return (
    <>
      {/* Edit - always show if handler provided */}
      {handleEdit && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            handleEdit(task);
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
      {/* Status options for non-recurring tasks */}
      {onStatusChange && !isRecurring && (
        <>
          <Menu.Separator />
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onStatusChange(task.id, "todo");
              onClose?.();
            }}
            disabled={task.status === "todo"}
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
              <Text>Set to Todo</Text>
            </HStack>
          </Menu.Item>
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onStatusChange(task.id, "in_progress");
              onClose?.();
            }}
            disabled={task.status === "in_progress"}
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
                <Clock size={14} />
              </Box>
              <Text>Set to In Progress</Text>
            </HStack>
          </Menu.Item>
          <Menu.Item
            onClick={e => {
              e.stopPropagation();
              onStatusChange(task.id, "complete");
              onClose?.();
            }}
            disabled={task.status === "complete"}
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
              <Text>Set to Complete</Text>
            </HStack>
          </Menu.Item>
          <Menu.Separator />
        </>
      )}
      {handleDuplicate && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            handleDuplicate(task.id);
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

      {/* Tags submenu */}
      {tags && onTagsChange && onCreateTag && (
        <TagMenuSelector task={task} tags={tags} onTagsChange={onTagsChange} onCreateTag={onCreateTag} />
      )}

      {handleDelete && (
        <Menu.Item
          onClick={e => {
            e.stopPropagation();
            handleDelete(task.id);
            onClose?.();
          }}
          color={mode.status.error}
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

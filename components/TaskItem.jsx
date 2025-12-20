"use client";

import {
  Box,
  Checkbox,
  Text,
  Flex,
  HStack,
  IconButton,
  VStack,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { Draggable } from "@hello-pangea/dnd";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import { DragPreview } from "./DragPreview";

export const TaskItem = ({
  task,
  index,
  onToggle,
  onToggleSubtask,
  onToggleExpand,
  onEdit,
  onDelete,
  hoveredDroppable,
  draggableId,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const subtaskText = useColorModeValue("gray.700", "gray.200");
  const gripColor = useColorModeValue("gray.400", "gray.500");

  const allSubtasksComplete =
    task.subtasks &&
    task.subtasks.length > 0 &&
    task.subtasks.every(st => st.completed);

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => {
        // Show unified drag preview when dragging
        if (snapshot.isDragging) {
          return (
            <DragPreview
              title={task.title}
              provided={provided}
              snapshot={snapshot}
            />
          );
        }

        // Show normal component when not dragging
        return (
          <Box ref={provided.innerRef} {...provided.draggableProps} mb={2}>
            <Box
              borderWidth="1px"
              borderRadius="lg"
              bg={bgColor}
              borderColor={borderColor}
              transition="box-shadow 0.2s, border-color 0.2s"
            >
              <Flex
                align="center"
                gap={2}
                p={3}
                _hover={{ bg: hoverBg }}
                cursor="grab"
                _active={{ cursor: "grabbing" }}
              >
                {/* Drag handle */}
                <Box
                  {...provided.dragHandleProps}
                  cursor="grab"
                  _active={{ cursor: "grabbing" }}
                  color={gripColor}
                >
                  <GripVertical size={16} />
                </Box>

                {/* Expand button for subtasks */}
                {task.subtasks && task.subtasks.length > 0 ? (
                  <IconButton
                    icon={
                      task.expanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )
                    }
                    onClick={e => {
                      e.stopPropagation();
                      onToggleExpand(task.id);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    size="sm"
                    variant="ghost"
                    aria-label="Toggle expand"
                  />
                ) : (
                  <Box w={6} />
                )}

                {/* Checkbox */}
                <Checkbox
                  isChecked={task.completed || allSubtasksComplete}
                  size="lg"
                  onChange={() => onToggle(task.id)}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                />

                {/* Color indicator */}
                <Box
                  w={3}
                  h={3}
                  borderRadius="full"
                  bg={task.color || "#3b82f6"}
                  flexShrink={0}
                />

                {/* Task content */}
                <Box flex={1} minW={0}>
                  <Text
                    fontWeight="medium"
                    textDecoration={
                      task.completed || allSubtasksComplete
                        ? "line-through"
                        : "none"
                    }
                    opacity={task.completed || allSubtasksComplete ? 0.5 : 1}
                    color={textColor}
                  >
                    {task.title}
                  </Text>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <Text as="span" ml={2} fontSize="xs" color={mutedText}>
                      ({task.subtasks.filter(st => st.completed).length}/
                      {task.subtasks.length})
                    </Text>
                  )}
                </Box>

                {/* Time display */}
                {task.time && (
                  <HStack spacing={1}>
                    <Clock size={14} />
                    <Text fontSize="sm" color={mutedText}>
                      {formatTime(task.time)}
                    </Text>
                  </HStack>
                )}

                {/* Action buttons */}
                <IconButton
                  icon={<Edit2 size={16} />}
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  size="sm"
                  variant="ghost"
                  aria-label="Edit task"
                />
                <IconButton
                  icon={<Trash2 size={16} />}
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="Delete task"
                />
              </Flex>

              {/* Expanded subtasks */}
              {task.expanded && task.subtasks && task.subtasks.length > 0 && (
                <Box pl={16} pr={3} pb={3}>
                  <VStack align="stretch" spacing={2}>
                    {task.subtasks.map(subtask => (
                      <Flex
                        key={subtask.id}
                        align="center"
                        gap={2}
                        p={1}
                        borderRadius="md"
                        _hover={{ bg: hoverBg }}
                        cursor="pointer"
                        onClick={() => onToggleSubtask(task.id, subtask.id)}
                      >
                        <Checkbox
                          isChecked={subtask.completed}
                          size="sm"
                          onChange={() => onToggleSubtask(task.id, subtask.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <Text
                          fontSize="sm"
                          textDecoration={
                            subtask.completed ? "line-through" : "none"
                          }
                          opacity={subtask.completed ? 0.5 : 1}
                          color={subtaskText}
                        >
                          {subtask.title}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                </Box>
              )}
            </Box>
          </Box>
        );
      }}
    </Draggable>
  );
};

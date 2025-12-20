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

export const TaskItem = ({
  task,
  index,
  onToggle,
  onToggleSubtask,
  onToggleExpand,
  onEdit,
  onDelete,
  hoveredDroppable,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  const allSubtasksComplete =
    task.subtasks &&
    task.subtasks.length > 0 &&
    task.subtasks.every(st => st.completed);

  // Determine preview style based on hovered droppable
  const getPreviewStyle = (isDragging, hovered) => {
    if (!isDragging || !hovered) return {};

    if (hovered.startsWith("calendar-") && !hovered.includes("untimed")) {
      // Calendar view style - compact, colored block
      return {
        bg: task.color || "#3b82f6",
        color: "white",
        borderRadius: "md",
        p: 2,
        minH: "auto",
        borderWidth: 0,
      };
    } else if (hovered === "backlog") {
      // Backlog style - left border accent
      return {
        borderLeftWidth: "3px",
        borderLeftColor: task.color || "#3b82f6",
        borderWidth: "0 0 0 3px",
      };
    }
    // Default today view style
    return {};
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => {
        const previewStyle = getPreviewStyle(
          snapshot.isDragging,
          hoveredDroppable
        );

        return (
          <Box
            ref={provided.innerRef}
            {...provided.draggableProps}
            mb={2}
            opacity={snapshot.isDragging ? 0.5 : 1}
          >
            <Box
              borderWidth={
                previewStyle.borderWidth !== undefined
                  ? previewStyle.borderWidth
                  : "1px"
              }
              borderRadius={previewStyle.borderRadius || "lg"}
              bg={previewStyle.bg || bgColor}
              borderColor={borderColor}
              borderLeftWidth={previewStyle.borderLeftWidth}
              borderLeftColor={previewStyle.borderLeftColor}
              color={previewStyle.color}
              p={previewStyle.p !== undefined ? previewStyle.p : undefined}
              minH={previewStyle.minH}
            >
              <Flex
                align="center"
                gap={2}
                p={previewStyle.p !== undefined ? undefined : 3}
                _hover={{ bg: previewStyle.bg ? undefined : hoverBg }}
                cursor="grab"
                _active={{ cursor: "grabbing" }}
              >
                {!previewStyle.bg && (
                  <Box
                    {...provided.dragHandleProps}
                    cursor="grab"
                    _active={{ cursor: "grabbing" }}
                    color={mutedText}
                  >
                    <GripVertical size={16} />
                  </Box>
                )}

                {task.subtasks &&
                task.subtasks.length > 0 &&
                !previewStyle.bg ? (
                  <IconButton
                    icon={
                      task.expanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )
                    }
                    onClick={() => onToggleExpand(task.id)}
                    size="sm"
                    variant="ghost"
                    aria-label="Toggle expand"
                  />
                ) : !previewStyle.bg ? (
                  <Box w={6} />
                ) : null}

                {!previewStyle.bg && (
                  <Checkbox
                    isChecked={task.completed || allSubtasksComplete}
                    size="lg"
                    onChange={() => onToggle(task.id)}
                  />
                )}

                {!previewStyle.bg && (
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg={task.color || "#3b82f6"}
                  />
                )}

                <Box flex={1} minW={0}>
                  <Text
                    fontWeight="medium"
                    textDecoration={
                      task.completed || allSubtasksComplete
                        ? "line-through"
                        : "none"
                    }
                    opacity={task.completed || allSubtasksComplete ? 0.5 : 1}
                    color={previewStyle.color || textColor}
                    fontSize={previewStyle.bg ? "sm" : undefined}
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

                {task.time && !previewStyle.bg && (
                  <HStack spacing={1}>
                    <Clock size={14} />
                    <Text fontSize="sm" color={mutedText}>
                      {formatTime(task.time)}
                    </Text>
                  </HStack>
                )}

                {!previewStyle.bg && (
                  <>
                    <IconButton
                      icon={<Edit2 size={16} />}
                      onClick={() => onEdit(task)}
                      size="sm"
                      variant="ghost"
                      aria-label="Edit task"
                    />
                    <IconButton
                      icon={<Trash2 size={16} />}
                      onClick={() => onDelete(task.id)}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      aria-label="Delete task"
                    />
                  </>
                )}
              </Flex>

              {task.expanded &&
                task.subtasks &&
                task.subtasks.length > 0 &&
                !previewStyle.bg && (
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
                          <Checkbox isChecked={subtask.completed} size="sm" />
                          <Text
                            fontSize="sm"
                            textDecoration={
                              subtask.completed ? "line-through" : "none"
                            }
                            opacity={subtask.completed ? 0.5 : 1}
                            color={useColorModeValue("gray.700", "gray.200")}
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

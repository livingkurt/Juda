"use client";

import { memo } from "react";
import {
  Box,
  Checkbox,
  Text,
  Flex,
  HStack,
  IconButton,
  VStack,
  Progress,
} from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

const TaskItemComponent = ({
  task,
  index,
  onToggle,
  onToggleSubtask,
  onToggleExpand,
  onEdit,
  onDelete,
}) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const progressBg = useColorModeValue("gray.200", "gray.700");

  const allSubtasksComplete =
    task.subtasks &&
    task.subtasks.length > 0 &&
    task.subtasks.every(st => st.completed);

  const subtaskProgress =
    task.subtasks && task.subtasks.length > 0
      ? (task.subtasks.filter(st => st.completed).length /
          task.subtasks.length) *
        100
      : 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "TASK",
      task,
      source: "today",
      sectionId: task.sectionId,
      droppableId: task.sectionId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} mb={2}>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        bg={bgColor}
        borderColor={borderColor}
      >
        <Flex
          align="center"
          gap={2}
          p={3}
          _hover={{ bg: hoverBg }}
          cursor="grab"
          _active={{ cursor: "grabbing" }}
        >
          <Box
            {...attributes}
            {...listeners}
            cursor="grab"
            _active={{ cursor: "grabbing" }}
            color={mutedText}
          >
            <GripVertical size={16} />
          </Box>

          {task.subtasks && task.subtasks.length > 0 ? (
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
          ) : (
            <Box w={6} />
          )}

          <Checkbox
            isChecked={task.completed || allSubtasksComplete}
            size="lg"
            onChange={() => onToggle(task.id)}
          />

          <Box w={3} h={3} borderRadius="full" bg={task.color || "#3b82f6"} />

          <Box flex={1} minW={0}>
            <Text
              fontWeight="medium"
              textDecoration={
                task.completed || allSubtasksComplete ? "line-through" : "none"
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

          {task.time && (
            <HStack spacing={1}>
              <Clock size={14} />
              <Text fontSize="sm" color={mutedText}>
                {formatTime(task.time)}
              </Text>
            </HStack>
          )}

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
        </Flex>

        {task.subtasks && task.subtasks.length > 0 && (
          <Box px={3} pb={2}>
            <Progress
              value={subtaskProgress}
              size="sm"
              colorScheme={task.color || "blue"}
              borderRadius="full"
              bg={progressBg}
            />
          </Box>
        )}

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
                  <Checkbox isChecked={subtask.completed} size="sm" />
                  <Text
                    fontSize="sm"
                    textDecoration={subtask.completed ? "line-through" : "none"}
                    opacity={subtask.completed ? 0.5 : 1}
                    color={textColor}
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
};

export const TaskItem = memo(TaskItemComponent);

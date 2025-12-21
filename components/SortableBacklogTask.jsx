"use client";

import { Box, Flex, Text, IconButton, HStack, Badge } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, Trash2, GripVertical, AlertCircle } from "lucide-react";
import { isOverdue } from "@/lib/utils";

export const SortableBacklogTask = ({
  task,
  onEditTask,
  onDeleteTask,
  getSectionName,
  textColor,
  mutedText,
  gripColor,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.draggableId,
    data: {
      type: "TASK",
      containerId: "backlog",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Flex
      ref={setNodeRef}
      style={style}
      align="center"
      gap={2}
      p={3}
      borderRadius="md"
      borderLeftWidth="3px"
      borderLeftColor={task.color || "#3b82f6"}
      bg="transparent"
    >
      <Box flexShrink={0} {...attributes} {...listeners}>
        <GripVertical size={16} style={{ color: gripColor, cursor: "grab" }} />
      </Box>
      <Box flex={1} minW={0}>
        <HStack spacing={2} align="center">
          <Text fontSize="sm" fontWeight="medium" color={textColor}>
            {task.title}
          </Text>
          {isOverdue(task) && (
            <Badge size="sm" colorScheme="red" fontSize="2xs">
              <HStack spacing={1} align="center">
                <AlertCircle size={10} />
                <Text as="span">Overdue</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
        <HStack spacing={2} mt={1}>
          <Text fontSize="xs" color={mutedText}>
            {getSectionName(task.sectionId)}
          </Text>
          {task.recurrence && task.recurrence.type !== "none" && (
            <Badge size="sm" colorScheme="purple" fontSize="2xs">
              {task.recurrence.type === "daily" ? "Daily" : task.recurrence.type === "weekly" ? "Weekly" : "Recurring"}
            </Badge>
          )}
          {!task.time && (
            <Badge size="sm" colorScheme="orange" fontSize="2xs">
              No time
            </Badge>
          )}
        </HStack>
      </Box>
      <IconButton
        icon={<Edit2 size={14} />}
        onClick={e => {
          e.stopPropagation();
          onEditTask(task);
        }}
        onMouseDown={e => e.stopPropagation()}
        size="sm"
        variant="ghost"
        aria-label="Edit task"
      />
      <IconButton
        icon={<Trash2 size={14} />}
        onClick={e => {
          e.stopPropagation();
          onDeleteTask(task.id);
        }}
        onMouseDown={e => e.stopPropagation()}
        size="sm"
        variant="ghost"
        colorScheme="red"
        aria-label="Delete task"
      />
    </Flex>
  );
};

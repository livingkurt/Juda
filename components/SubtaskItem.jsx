"use client";

import { Box, Checkbox, Text, Flex, HStack, IconButton, Badge } from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";
import { Clock, GripVertical, Edit2, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/utils";

export const SubtaskItem = ({
  subtask,
  parentTaskId,
  onToggle,
  onEdit,
  onDelete,
  isDragging = false,
  dragHandleProps = {},
}) => {
  const bgColor = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const gripColor = useColorModeValue("gray.400", "gray.500");

  return (
    <Box
      borderWidth="1px"
      borderRadius="md"
      bg={bgColor}
      borderColor={borderColor}
      opacity={isDragging ? 0.5 : 1}
      transition="all 0.2s"
      _hover={{ bg: hoverBg }}
    >
      <Flex align="center" gap={2} p={2}>
        {/* Drag handle */}
        {dragHandleProps && Object.keys(dragHandleProps).length > 0 && (
          <Box {...dragHandleProps} cursor="grab" _active={{ cursor: "grabbing" }} color={gripColor}>
            <GripVertical size={12} stroke="currentColor" />
          </Box>
        )}

        {/* Checkbox */}
        <Checkbox
          isChecked={subtask.completed}
          size="sm"
          onChange={() => onToggle?.(parentTaskId, subtask.id)}
          onClick={e => e.stopPropagation()}
        />

        {/* Color indicator */}
        <Box w={2} h={2} borderRadius="full" bg={subtask.color || "#3b82f6"} flexShrink={0} />

        {/* Subtask content */}
        <Box flex={1} minW={0}>
          <Text
            fontSize="sm"
            fontWeight="medium"
            textDecoration={subtask.completed ? "line-through" : "none"}
            opacity={subtask.completed ? 0.5 : 1}
            color={textColor}
          >
            {subtask.title}
          </Text>
          <HStack spacing={2} mt={0.5}>
            {subtask.time && (
              <Badge size="sm" colorScheme="blue" fontSize="2xs">
                <HStack spacing={0.5}>
                  <Clock size={8} stroke="currentColor" />
                  <Text as="span">{formatTime(subtask.time)}</Text>
                </HStack>
              </Badge>
            )}
            {subtask.duration && subtask.duration > 0 && (
              <Badge size="sm" colorScheme="gray" fontSize="2xs">
                {subtask.duration}m
              </Badge>
            )}
          </HStack>
        </Box>

        {/* Action buttons */}
        {onEdit && (
          <IconButton
            icon={
              <Box as="span" color="currentColor">
                <Edit2 size={12} stroke="currentColor" />
              </Box>
            }
            onClick={e => {
              e.stopPropagation();
              onEdit(subtask);
            }}
            size="xs"
            variant="ghost"
            aria-label="Edit subtask"
          />
        )}
        {onDelete && (
          <IconButton
            icon={
              <Box as="span" color="currentColor">
                <Trash2 size={12} stroke="currentColor" />
              </Box>
            }
            onClick={e => {
              e.stopPropagation();
              onDelete(parentTaskId, subtask.id);
            }}
            size="xs"
            variant="ghost"
            colorScheme="red"
            aria-label="Delete subtask"
          />
        )}
      </Flex>
    </Box>
  );
};

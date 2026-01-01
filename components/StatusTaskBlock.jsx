"use client";

import { memo } from "react";
import { Box, Text, HStack } from "@chakra-ui/react";
import { Clock, PlayCircle } from "lucide-react";

export const StatusTaskBlock = memo(function StatusTaskBlock({
  task,
  top,
  height,
  isInProgress,
  onTaskClick,
  startedAt,
  completedAt,
}) {
  const bgColor = isInProgress
    ? { _light: "blue.100", _dark: "blue.900" }
    : { _light: "green.100", _dark: "green.900" };
  const borderColor = isInProgress ? "blue.400" : "green.400";

  // Calculate duration
  const startTime = startedAt ? new Date(startedAt) : new Date();
  const endTime = completedAt ? new Date(completedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <Box
      position="absolute"
      top={`${top}px`}
      left="4px"
      right="4px"
      height={`${height}px`}
      bg={bgColor}
      borderLeft="3px solid"
      borderColor={borderColor}
      borderRadius="md"
      px={2}
      py={1}
      cursor="pointer"
      onClick={() => onTaskClick(task)}
      overflow="hidden"
      opacity={isInProgress ? 1 : 0.8}
      _hover={{ opacity: 1 }}
    >
      <HStack spacing={1} fontSize="xs">
        {isInProgress ? <PlayCircle size={12} /> : <Clock size={12} />}
        <Text fontWeight="medium" noOfLines={1}>
          {task.title}
        </Text>
      </HStack>
      <Text fontSize="2xs" color="gray.600">
        {durationText}
      </Text>
    </Box>
  );
});

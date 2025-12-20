"use client";

import { Box, Text } from "@chakra-ui/react";
import { useColorModeValue } from "@chakra-ui/react";

export const DragPreview = ({ title, provided, snapshot }) => {
  const bgColor = useColorModeValue("blue.100", "blue.800");
  const textColor = useColorModeValue("blue.900", "blue.100");
  const borderColor = useColorModeValue("blue.400", "blue.500");

  return (
    <Box
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      px={4}
      py={2}
      borderRadius="lg"
      bg={bgColor}
      borderWidth="2px"
      borderColor={borderColor}
      borderStyle="solid"
      boxShadow="0 10px 25px -5px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)"
      minW="120px"
      maxW="200px"
      style={provided.draggableProps.style}
    >
      <Text
        fontSize="sm"
        fontWeight="semibold"
        color={textColor}
        isTruncated
        noOfLines={1}
      >
        {title}
      </Text>
    </Box>
  );
};

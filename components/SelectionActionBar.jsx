"use client";

import { Box, HStack, Text, Button, IconButton } from "@chakra-ui/react";
import { X, Edit2, Trash2, Palette } from "lucide-react";

export const SelectionActionBar = ({ selectedCount, onEdit, onDelete, onClearSelection, onQuickColor, isVisible }) => {
  const bgColor = { _light: "blue.500", _dark: "blue.600" };
  const textColor = "white";

  if (!isVisible || selectedCount === 0) return null;

  return (
    <Box
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      bg={bgColor}
      color={textColor}
      px={4}
      py={3}
      borderRadius="xl"
      boxShadow="xl"
      minW="300px"
      zIndex={1000}
    >
      <HStack spacing={4} justify="space-between">
        <HStack spacing={3}>
          <IconButton
            icon={<X size={18} />}
            onClick={onClearSelection}
            variant="ghost"
            size="sm"
            color={textColor}
            _hover={{ bg: "whiteAlpha.200" }}
            aria-label="Clear selection"
          />
          <Text fontWeight="semibold">
            {selectedCount} task{selectedCount !== 1 ? "s" : ""} selected
          </Text>
        </HStack>

        <HStack spacing={2}>
          {/* Quick color picker */}
          <IconButton
            icon={<Palette size={18} />}
            onClick={onQuickColor}
            variant="ghost"
            size="sm"
            color={textColor}
            _hover={{ bg: "whiteAlpha.200" }}
            aria-label="Change color"
            title="Quick color change"
          />

          {/* Full edit */}
          <Button
            leftIcon={<Edit2 size={16} />}
            onClick={onEdit}
            size="sm"
            variant="solid"
            bg="whiteAlpha.200"
            _hover={{ bg: "whiteAlpha.300" }}
          >
            Edit
          </Button>

          {/* Delete */}
          <IconButton
            icon={<Trash2 size={18} />}
            onClick={onDelete}
            variant="ghost"
            size="sm"
            color={textColor}
            _hover={{ bg: "red.600" }}
            aria-label="Delete selected"
          />
        </HStack>
      </HStack>
    </Box>
  );
};

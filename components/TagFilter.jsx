"use client";

import { useState, useRef, useEffect } from "react";
import { Box, HStack, Tag, Menu, Button, Input, Text } from "@chakra-ui/react";
import { Tag as TagIcon, Plus, X } from "lucide-react";
import { TagChip } from "./TagChip";

export const TagFilter = ({
  tags = [],
  selectedTagIds = [],
  onTagSelect,
  onTagDeselect,
  onCreateTag,
  compact = false,
}) => {
  const [newTagName, setNewTagName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const inputRef = useRef(null);

  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const hoverBg = { _light: "gray.100", _dark: "gray.700" };
  const mutedText = { _light: "gray.500", _dark: "gray.400" };

  // Focus input when menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await onCreateTag(newTagName.trim());
      onTagSelect(newTag.id);
      setNewTagName("");
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && newTagName.trim()) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <HStack spacing={2} flexWrap="wrap" align="center">
      {/* Selected tags as removable pills */}
      {selectedTags.map(tag => (
        <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={onTagDeselect} />
      ))}

      {/* Tag selector dropdown */}
      <Menu.Root open={isOpen} onOpenChange={({ open }) => (open ? onOpen() : onClose())} closeOnSelect={false}>
        <Menu.Trigger asChild>
          <Button size="xs" variant="ghost" onClick={onOpen} color={mutedText} _hover={{ bg: hoverBg }}>
            <TagIcon size={14} />
            {compact ? "" : selectedTags.length === 0 ? "" : "Add"}
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content bg={bgColor} borderColor={borderColor} minW="200px" maxH="300px" overflowY="auto">
            {/* Create new tag input */}
            <Box px={3} py={2}>
              <HStack>
                <Input
                  ref={inputRef}
                  size="sm"
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button size="sm" colorPalette="blue" onClick={handleCreateTag} isDisabled={!newTagName.trim()}>
                  <Plus size={14} />
                </Button>
              </HStack>
            </Box>

            {availableTags.length > 0 && (
              <>
                <Box borderTopWidth="1px" borderColor={borderColor} my={1} />
                <Text px={3} py={1} fontSize={{ base: "2xs", md: "xs" }} color={mutedText} fontWeight="semibold">
                  Available Tags
                </Text>
                {availableTags.map(tag => (
                  <Menu.Item
                    key={tag.id}
                    onClick={() => {
                      onTagSelect(tag.id);
                    }}
                    _hover={{ bg: hoverBg }}
                  >
                    <HStack>
                      <Box w={3} h={3} borderRadius="full" bg={tag.color} />
                      <Text>{tag.name}</Text>
                    </HStack>
                  </Menu.Item>
                ))}
              </>
            )}

            {availableTags.length === 0 && tags.length > 0 && (
              <Text px={3} py={2} fontSize={{ base: "xs", md: "sm" }} color={mutedText}>
                All tags selected
              </Text>
            )}

            {tags.length === 0 && !newTagName && (
              <Text px={3} py={2} fontSize={{ base: "xs", md: "sm" }} color={mutedText}>
                No tags yet. Create one above!
              </Text>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>

      {/* Clear all filters button */}
      {selectedTags.length > 0 && (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => selectedTagIds.forEach(id => onTagDeselect(id))}
          color={mutedText}
          _hover={{ bg: hoverBg }}
        >
          <X size={14} />
        </Button>
      )}
    </HStack>
  );
};

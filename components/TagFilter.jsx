"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Input,
  Divider,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { Tag as TagIcon, Plus, X } from "lucide-react";

export const TagFilter = ({
  tags = [],
  selectedTagIds = [],
  onTagSelect,
  onTagDeselect,
  onCreateTag,
  compact = false,
}) => {
  const [newTagName, setNewTagName] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const inputRef = useRef(null);

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const mutedText = useColorModeValue("gray.500", "gray.400");

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
        <Tag key={tag.id} size="sm" borderRadius="full" variant="solid" bg={tag.color} color="white">
          <TagLabel>{tag.name}</TagLabel>
          <TagCloseButton onClick={() => onTagDeselect(tag.id)} />
        </Tag>
      ))}

      {/* Tag selector dropdown */}
      <Menu isOpen={isOpen} onClose={onClose} closeOnSelect={false}>
        <MenuButton
          as={Button}
          size="xs"
          variant="ghost"
          leftIcon={<TagIcon size={14} />}
          onClick={onOpen}
          color={mutedText}
          _hover={{ bg: hoverBg }}
        >
          {compact ? "" : selectedTags.length === 0 ? "Filter by tag" : "Add"}
        </MenuButton>
        <MenuList bg={bgColor} borderColor={borderColor} minW="200px" maxH="300px" overflowY="auto">
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
              <Button size="sm" colorScheme="blue" onClick={handleCreateTag} isDisabled={!newTagName.trim()}>
                <Plus size={16} />
              </Button>
            </HStack>
          </Box>

          {availableTags.length > 0 && (
            <>
              <Divider />
              <Text px={3} py={1} fontSize="xs" color={mutedText} fontWeight="semibold">
                Available Tags
              </Text>
              {availableTags.map(tag => (
                <MenuItem
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
                </MenuItem>
              ))}
            </>
          )}

          {availableTags.length === 0 && tags.length > 0 && (
            <Text px={3} py={2} fontSize="sm" color={mutedText}>
              All tags selected
            </Text>
          )}

          {tags.length === 0 && !newTagName && (
            <Text px={3} py={2} fontSize="sm" color={mutedText}>
              No tags yet. Create one above!
            </Text>
          )}
        </MenuList>
      </Menu>

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

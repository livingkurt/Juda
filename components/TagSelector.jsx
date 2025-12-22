"use client";

import { useState, useRef, useEffect } from "react";
import { Box, HStack, VStack, Tag, Menu, Button, Input, Text, IconButton, Wrap, WrapItem } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { Tag as TagIcon, Plus, Trash2 } from "lucide-react";

export const TagSelector = ({
  tags = [],
  selectedTagIds = [],
  onTagsChange,
  onCreateTag,
  onDeleteTag,
  inline = false,
}) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const inputRef = useRef(null);

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBg = useColorModeValue("gray.100", "gray.700");
  const mutedText = useColorModeValue("gray.500", "gray.400");

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id));

  const handleAddTag = tagId => {
    onTagsChange([...selectedTagIds, tagId]);
  };

  const handleRemoveTag = tagId => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const newTag = await onCreateTag(newTagName.trim(), newTagColor);
      onTagsChange([...selectedTagIds, newTag.id]);
      setNewTagName("");
      setNewTagColor("#6366f1");
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

  // If inline mode, only show the menu button (tags are displayed elsewhere)
  if (inline) {
    return (
      <Menu.Root open={isOpen} onOpenChange={({ open }) => (open ? onOpen() : onClose())} closeOnSelect={false}>
        <Menu.Trigger asChild>
          <Button size="xs" variant="ghost" onClick={onOpen}>
            <TagIcon size={14} />
            Add
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content bg={bgColor} borderColor={borderColor} minW="250px" maxH="350px" overflowY="auto">
            {/* Create new tag section */}
            <Box px={3} py={2}>
              <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2}>
                Create New Tag
              </Text>
              <VStack spacing={2} align="stretch">
                <Input
                  ref={inputRef}
                  size="sm"
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <HStack spacing={1} flexWrap="wrap">
                  {colors.map(c => (
                    <Button
                      key={c}
                      w={6}
                      h={6}
                      minW={6}
                      borderRadius="full"
                      bg={c}
                      onClick={() => setNewTagColor(c)}
                      borderWidth={newTagColor === c ? "2px" : "0px"}
                      borderColor="white"
                      boxShadow={newTagColor === c ? "0 0 0 2px var(--chakra-colors-blue-400)" : "none"}
                      _hover={{ transform: "scale(1.1)" }}
                    />
                  ))}
                </HStack>
                <Button size="sm" colorPalette="blue" onClick={handleCreateTag} isDisabled={!newTagName.trim()}>
                  <Plus size={16} />
                  Create Tag
                </Button>
              </VStack>
            </Box>

            {/* Available tags list */}
            {availableTags.length > 0 && (
              <>
                <Box borderTopWidth="1px" borderColor={borderColor} my={2} />
                <Text px={3} py={1} fontSize="xs" fontWeight="semibold" color={mutedText}>
                  Available Tags
                </Text>
                {availableTags.map(tag => (
                  <Menu.Item key={tag.id} onClick={() => handleAddTag(tag.id)} _hover={{ bg: hoverBg }}>
                    <HStack justify="space-between" w="full">
                      <HStack>
                        <Box w={3} h={3} borderRadius="full" bg={tag.color} />
                        <Text>{tag.name}</Text>
                      </HStack>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteTag(tag.id);
                        }}
                        aria-label="Delete tag"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </HStack>
                  </Menu.Item>
                ))}
              </>
            )}

            {availableTags.length === 0 && tags.length > 0 && (
              <Text px={3} py={2} fontSize="sm" color={mutedText}>
                All tags assigned to this task
              </Text>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    );
  }

  return (
    <Box>
      {/* Selected tags */}
      <Wrap spacing={2} mb={2}>
        {selectedTags.map(tag => (
          <WrapItem key={tag.id}>
            <Tag.Root size="sm" borderRadius="full" variant="solid" bg={tag.color} color="white" fontSize="xs">
              <Tag.Label>{tag.name}</Tag.Label>
              <Tag.CloseTrigger onClick={() => handleRemoveTag(tag.id)} />
            </Tag.Root>
          </WrapItem>
        ))}
      </Wrap>

      {/* Add tag button/menu */}
      <Menu.Root open={isOpen} onOpenChange={({ open }) => (open ? onOpen() : onClose())} closeOnSelect={false}>
        <Menu.Trigger asChild>
          <Button size="sm" variant="outline" onClick={onOpen}>
            <TagIcon size={16} />
            Add Tag
          </Button>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content bg={bgColor} borderColor={borderColor} minW="250px" maxH="350px" overflowY="auto">
            {/* Create new tag section */}
            <Box px={3} py={2}>
              <Text fontSize="xs" fontWeight="semibold" color={mutedText} mb={2}>
                Create New Tag
              </Text>
              <VStack spacing={2} align="stretch">
                <Input
                  ref={inputRef}
                  size="sm"
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <HStack spacing={1} flexWrap="wrap">
                  {colors.map(c => (
                    <Button
                      key={c}
                      w={6}
                      h={6}
                      minW={6}
                      borderRadius="full"
                      bg={c}
                      onClick={() => setNewTagColor(c)}
                      borderWidth={newTagColor === c ? "2px" : "0px"}
                      borderColor="white"
                      boxShadow={newTagColor === c ? "0 0 0 2px var(--chakra-colors-blue-400)" : "none"}
                      _hover={{ transform: "scale(1.1)" }}
                    />
                  ))}
                </HStack>
                <Button size="sm" colorPalette="blue" onClick={handleCreateTag} isDisabled={!newTagName.trim()}>
                  <Plus size={16} />
                  Create Tag
                </Button>
              </VStack>
            </Box>

            {/* Available tags list */}
            {availableTags.length > 0 && (
              <>
                <Box borderTopWidth="1px" borderColor={borderColor} my={2} />
                <Text px={3} py={1} fontSize="xs" fontWeight="semibold" color={mutedText}>
                  Available Tags
                </Text>
                {availableTags.map(tag => (
                  <Menu.Item key={tag.id} onClick={() => handleAddTag(tag.id)} _hover={{ bg: hoverBg }}>
                    <HStack justify="space-between" w="full">
                      <HStack>
                        <Box w={3} h={3} borderRadius="full" bg={tag.color} />
                        <Text>{tag.name}</Text>
                      </HStack>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteTag(tag.id);
                        }}
                        aria-label="Delete tag"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </HStack>
                  </Menu.Item>
                ))}
              </>
            )}

            {availableTags.length === 0 && tags.length > 0 && (
              <Text px={3} py={2} fontSize="sm" color={mutedText}>
                All tags assigned to this task
              </Text>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </Box>
  );
};

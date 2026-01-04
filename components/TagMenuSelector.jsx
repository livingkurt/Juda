"use client";

import { useState, useRef } from "react";
import { Box, HStack, VStack, Menu, Button, Input, Text, Checkbox, Portal } from "@chakra-ui/react";
import { Tag as TagIcon, Plus, Search } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { TagChip } from "./TagChip";

export const TagMenuSelector = ({ task }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Use hooks directly (they use Redux internally)
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const taskOps = useTaskOperations();

  // Local state for selected tags (optimistic updates)
  const initialTagIds = task.tags?.map(t => t.id) || [];
  const [selectedTagIds, setSelectedTagIds] = useState(initialTagIds);
  const [hasChanges, setHasChanges] = useState(false);

  const { mode, interactive } = useSemanticColors();
  const { tagColors, canonicalColors } = useThemeColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const mutedText = mode.text.secondary;

  // Get current task's tag IDs
  const currentTagIds = selectedTagIds;

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Check if search query matches any existing tag
  const exactMatch = tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());

  // Show "Add New" button if there's a search query and no exact match
  const showAddNew = searchQuery.trim() && !exactMatch;

  const handleToggleTag = tagId => {
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];
    setSelectedTagIds(newTagIds);
    setHasChanges(true);
  };

  const handleCreateAndAssign = async colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      // Store canonical color (not theme color)
      const newTag = await createTagMutation({
        name: searchQuery.trim(),
        color: canonicalColors[colorIndex],
      }).unwrap();
      // Add the new tag to the local state
      setSelectedTagIds([...currentTagIds, newTag.id]);
      setHasChanges(true);
      // Reset search and color picker
      setSearchQuery("");
      setShowColorPicker(false);
      setSelectedColorIndex(0);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  // Save changes when menu closes
  const handleOpenChange = ({ open }) => {
    if (!open && hasChanges) {
      // Menu is closing and we have changes - save them
      taskOps.handleTaskTagsChange(task.id, selectedTagIds);
      setHasChanges(false);
    } else if (!open && !hasChanges) {
      // Menu is closing without changes - reset to initial state
      setSelectedTagIds(initialTagIds);
    }
  };

  return (
    <Menu.Root closeOnSelect={false} onOpenChange={handleOpenChange}>
      <Menu.TriggerItem>
        <HStack gap={2}>
          <Box as="span" display="flex" alignItems="center" justifyContent="center" w="14px" h="14px" flexShrink={0}>
            <TagIcon size={14} />
          </Box>
          <Text>Tags</Text>
        </HStack>
      </Menu.TriggerItem>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg={bgColor}
            borderColor={borderColor}
            minW="280px"
            maxH="400px"
            overflowY="auto"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Search bar */}
            <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
              <HStack spacing={2}>
                <Box as="span" color={mutedText}>
                  <Search size={14} />
                </Box>
                <Input
                  ref={searchInputRef}
                  size="sm"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowColorPicker(false); // Hide color picker when typing
                  }}
                  variant="unstyled"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  bg="transparent"
                  _hover={{
                    bg: "transparent",
                  }}
                  _focus={{
                    outline: "none",
                    bg: "transparent",
                    boxShadow: "none",
                  }}
                  _focusVisible={{
                    outline: "none",
                    bg: "transparent",
                    boxShadow: "none",
                  }}
                />
              </HStack>
            </Box>

            {/* Add New button (shown when search doesn't match existing tags) */}
            {showAddNew && !showColorPicker && (
              <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                  w="full"
                  onClick={e => {
                    e.stopPropagation();
                    setShowColorPicker(true);
                  }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <Plus size={14} />
                  <Text ml={1}>Add &quot;{searchQuery}&quot;</Text>
                </Button>
              </Box>
            )}

            {/* Color picker (shown after clicking Add New) */}
            {showAddNew && showColorPicker && (
              <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                <VStack spacing={2} align="stretch">
                  <Text fontSize="xs" fontWeight="semibold" color={mutedText}>
                    Choose a color:
                  </Text>
                  <HStack spacing={1} flexWrap="wrap" justify="center">
                    {tagColors.map((themeColor, index) => (
                      <Button
                        key={index}
                        w={8}
                        h={8}
                        minW={8}
                        borderRadius="md"
                        bg={themeColor}
                        onClick={e => {
                          e.stopPropagation();
                          handleCreateAndAssign(index);
                        }}
                        onMouseDown={e => e.stopPropagation()}
                        borderWidth={selectedColorIndex === index ? "2px" : "0px"}
                        borderColor="white"
                        boxShadow={selectedColorIndex === index ? `0 0 0 2px ${interactive.primary}` : "none"}
                        _hover={{ transform: "scale(1.1)" }}
                        transition="transform 0.1s"
                      />
                    ))}
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Tags list with checkboxes */}
            {filteredTags.length > 0 ? (
              <Box py={1}>
                {filteredTags.map(tag => (
                  <Menu.Item
                    key={tag.id}
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleTag(tag.id);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    _hover={{ bg: hoverBg }}
                    cursor="pointer"
                  >
                    <HStack justify="space-between" w="full" spacing={3}>
                      <HStack spacing={2} flex={1} minW={0}>
                        <Checkbox.Root checked={currentTagIds.includes(tag.id)} size="sm" pointerEvents="none">
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Indicator />
                        </Checkbox.Root>
                        <TagChip tag={tag} size="xs" />
                      </HStack>
                    </HStack>
                  </Menu.Item>
                ))}
              </Box>
            ) : !showAddNew ? (
              <Box px={3} py={4}>
                <Text fontSize="sm" color={mutedText} textAlign="center">
                  No tags found
                </Text>
              </Box>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

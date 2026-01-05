"use client";

import { useState, useRef } from "react";
import { Box, Group, Stack, Menu, Button, TextInput, Text, Checkbox } from "@mantine/core";
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
  const handleOpenChange = opened => {
    if (!opened && hasChanges) {
      // Menu is closing and we have changes - save them
      taskOps.handleTaskTagsChange(task.id, selectedTagIds);
      setHasChanges(false);
    } else if (!opened && !hasChanges) {
      // Menu is closing without changes - reset to initial state
      setSelectedTagIds(initialTagIds);
    }
  };

  return (
    <Menu closeOnItemClick={false} onOpenChange={handleOpenChange}>
      <Menu.Target>
        <Menu.Item>
          <Group gap={8}>
            <Box
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "14px",
                height: "14px",
                flexShrink: 0,
              }}
            >
              <TagIcon size={14} />
            </Box>
            <Text>Tags</Text>
          </Group>
        </Menu.Item>
      </Menu.Target>
      <Menu.Dropdown
        bg={bgColor}
        style={{
          borderColor: borderColor,
          minWidth: "280px",
          maxHeight: "400px",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
          <Group gap={8}>
            <Search size={14} style={{ color: mutedText }} />
            <TextInput
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
              style={{
                flex: 1,
                background: "transparent",
              }}
              styles={{
                input: {
                  background: "transparent",
                  "&:hover": {
                    background: "transparent",
                  },
                  "&:focus": {
                    outline: "none",
                    background: "transparent",
                    boxShadow: "none",
                  },
                },
              }}
            />
          </Group>
        </Box>

        {/* Add New button (shown when search doesn't match existing tags) */}
        {showAddNew && !showColorPicker && (
          <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
            <Button
              size="sm"
              variant="outline"
              color="blue"
              w="100%"
              onClick={e => {
                e.stopPropagation();
                setShowColorPicker(true);
              }}
              onMouseDown={e => e.stopPropagation()}
              leftSection={<Plus size={14} />}
            >
              Add &quot;{searchQuery}&quot;
            </Button>
          </Box>
        )}

        {/* Color picker (shown after clicking Add New) */}
        {showAddNew && showColorPicker && (
          <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
            <Stack gap={8}>
              <Text size="xs" fw={600} c={mutedText}>
                Choose a color:
              </Text>
              <Group gap={4} wrap="wrap" justify="center">
                {tagColors.map((themeColor, index) => (
                  <Button
                    key={index}
                    w={32}
                    h={32}
                    style={{
                      minWidth: 32,
                      borderRadius: "0.375rem",
                      background: themeColor,
                      border: selectedColorIndex === index ? "2px solid white" : "0px",
                      boxShadow: selectedColorIndex === index ? `0 0 0 2px ${interactive.primary}` : "none",
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleCreateAndAssign(index);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  />
                ))}
              </Group>
            </Stack>
          </Box>
        )}

        {/* Tags list with checkboxes */}
        {filteredTags.length > 0 ? (
          <Box py={4}>
            {filteredTags.map(tag => (
              <Menu.Item
                key={tag.id}
                onClick={e => {
                  e.stopPropagation();
                  handleToggleTag(tag.id);
                }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  backgroundColor: hoverBg,
                  cursor: "pointer",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Group justify="space-between" w="100%" gap={12}>
                  <Group gap={8} style={{ flex: 1, minWidth: 0 }}>
                    <Checkbox checked={currentTagIds.includes(tag.id)} size="sm" pointerEvents="none" />
                    <TagChip tag={tag} size="xs" />
                  </Group>
                </Group>
              </Menu.Item>
            ))}
          </Box>
        ) : !showAddNew ? (
          <Box px={12} py={16}>
            <Text size="sm" c={mutedText} style={{ textAlign: "center" }}>
              No tags found
            </Text>
          </Box>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  );
};

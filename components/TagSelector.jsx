"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Group, Stack, Menu, Button, TextInput, Text, ActionIcon, Flex } from "@mantine/core";
import { Tag as TagIcon, Plus, Trash2 } from "lucide-react";
import { TagChip } from "./TagChip";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useThemeColors } from "@/hooks/useThemeColors";

export const TagSelector = ({
  tags = [],
  selectedTagIds = [],
  onTagsChange,
  onCreateTag,
  onDeleteTag,
  inline = false,
}) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColorIndex, setNewTagColorIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const { mode, interactive } = useSemanticColors();
  const { tagColors, canonicalColors } = useThemeColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const mutedText = mode.text.secondary;

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
      // Store canonical color (not theme color)
      const newTag = await onCreateTag(newTagName.trim(), canonicalColors[newTagColorIndex]);
      onTagsChange([...selectedTagIds, newTag.id]);
      setNewTagName("");
      setNewTagColorIndex(0);
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

  const menuContent = (
    <Menu.Dropdown
      bg={bgColor}
      style={{ borderColor: borderColor, minWidth: "250px", maxHeight: "350px", overflowY: "auto" }}
    >
      {/* Create new tag section */}
      <Box px={12} py={8}>
        <Text size="xs" fw={600} c={mutedText} mb={8}>
          Create New Tag
        </Text>
        <Stack gap={8}>
          <TextInput
            ref={inputRef}
            size="sm"
            placeholder="Tag name..."
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Group gap={4} wrap="wrap">
            {tagColors.map((themeColor, index) => (
              <Button
                key={index}
                w={24}
                h={24}
                style={{
                  minWidth: 24,
                  borderRadius: "50%",
                  background: themeColor,
                  border: newTagColorIndex === index ? "2px solid white" : "0px",
                  boxShadow: newTagColorIndex === index ? `0 0 0 2px ${interactive.primary}` : "none",
                }}
                onClick={() => setNewTagColorIndex(index)}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            ))}
          </Group>
          <Button
            size="sm"
            color="blue"
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            leftSection={<Plus size={16} />}
          >
            Create Tag
          </Button>
        </Stack>
      </Box>

      {/* Available tags list */}
      {availableTags.length > 0 && (
        <>
          <Box style={{ borderTop: `1px solid ${borderColor}`, marginTop: 8, marginBottom: 8 }} />
          <Text px={12} py={4} size="xs" fw={600} c={mutedText}>
            Available Tags
          </Text>
          {availableTags.map(tag => (
            <Menu.Item
              key={tag.id}
              onClick={() => handleAddTag(tag.id)}
              style={{
                backgroundColor: hoverBg,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = hoverBg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Group justify="space-between" w="100%">
                <TagChip tag={tag} size="xs" />
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteTag(tag.id);
                  }}
                  aria-label="Delete tag"
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </Group>
            </Menu.Item>
          ))}
        </>
      )}

      {availableTags.length === 0 && tags.length > 0 && (
        <Text px={12} py={8} size="sm" c={mutedText}>
          {inline ? "All tags assigned to this task" : "All tags assigned to this task"}
        </Text>
      )}
    </Menu.Dropdown>
  );

  // If inline mode, only show the menu button (tags are displayed elsewhere)
  if (inline) {
    return (
      <Menu opened={isOpen} onClose={() => setIsOpen(false)} closeOnItemClick={false}>
        <Menu.Target>
          <Button size="xs" variant="subtle" onClick={() => setIsOpen(true)} leftSection={<TagIcon size={14} />}>
            Add
          </Button>
        </Menu.Target>
        {menuContent}
      </Menu>
    );
  }

  return (
    <Box>
      {/* Selected tags */}
      <Flex gap={8} wrap="wrap" mb={8}>
        {selectedTags.map(tag => (
          <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={handleRemoveTag} />
        ))}
      </Flex>

      {/* Add tag button/menu */}
      <Menu opened={isOpen} onClose={() => setIsOpen(false)} closeOnItemClick={false}>
        <Menu.Target>
          <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} leftSection={<TagIcon size={16} />}>
            Add Tag
          </Button>
        </Menu.Target>
        {menuContent}
      </Menu>
    </Box>
  );
};

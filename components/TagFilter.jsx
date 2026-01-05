"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Group, Menu, Button, TextInput, Text } from "@mantine/core";
import { Tag as TagIcon, Plus, X } from "lucide-react";
import { TagChip } from "./TagChip";
import { useSemanticColors } from "@/hooks/useSemanticColors";

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
  const inputRef = useRef(null);

  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const mutedText = mode.text.secondary;

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
    <Group gap={8} wrap="wrap" align="center">
      {/* Selected tags as removable pills */}
      {selectedTags.map(tag => (
        <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={onTagDeselect} />
      ))}

      {/* Tag selector dropdown */}
      <Menu opened={isOpen} onClose={() => setIsOpen(false)} closeOnItemClick={false}>
        <Menu.Target>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => setIsOpen(true)}
            c={mutedText}
            style={{
              backgroundColor: hoverBg,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = hoverBg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            leftSection={<TagIcon size={14} />}
          >
            {compact ? "" : selectedTags.length === 0 ? "" : "Add"}
          </Button>
        </Menu.Target>
        <Menu.Dropdown
          bg={bgColor}
          style={{ borderColor: borderColor, minWidth: "200px", maxHeight: "300px", overflowY: "auto" }}
        >
          {/* Create new tag input */}
          <Box px={12} py={8}>
            <Group gap={8}>
              <TextInput
                ref={inputRef}
                size="sm"
                placeholder="New tag name..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1 }}
              />
              <Button
                size="sm"
                color="blue"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                leftSection={<Plus size={14} />}
              />
            </Group>
          </Box>

          {availableTags.length > 0 && (
            <>
              <Box style={{ borderTop: `1px solid ${borderColor}`, marginTop: 4, marginBottom: 4 }} />
              <Text px={12} py={4} size={["0.625rem", "0.75rem"]} c={mutedText} fw={600}>
                Available Tags
              </Text>
              {availableTags.map(tag => (
                <Menu.Item
                  key={tag.id}
                  onClick={() => {
                    onTagSelect(tag.id);
                  }}
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
                  <Group gap={8}>
                    <Box w={12} h={12} style={{ borderRadius: "50%", background: tag.color }} />
                    <Text>{tag.name}</Text>
                  </Group>
                </Menu.Item>
              ))}
            </>
          )}

          {availableTags.length === 0 && tags.length > 0 && (
            <Text px={12} py={8} size={["0.75rem", "0.875rem"]} c={mutedText}>
              All tags selected
            </Text>
          )}

          {tags.length === 0 && !newTagName && (
            <Text px={12} py={8} size={["0.75rem", "0.875rem"]} c={mutedText}>
              No tags yet. Create one above!
            </Text>
          )}
        </Menu.Dropdown>
      </Menu>

      {/* Clear all filters button */}
      {selectedTags.length > 0 && (
        <Button
          size="xs"
          variant="subtle"
          onClick={() => selectedTagIds.forEach(id => onTagDeselect(id))}
          c={mutedText}
          style={{
            backgroundColor: hoverBg,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = hoverBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          leftSection={<X size={14} />}
        />
      )}
    </Group>
  );
};

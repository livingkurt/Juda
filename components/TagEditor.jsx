"use client";

import { useState } from "react";
import { Box, Button, Modal, Group, ActionIcon, TextInput, SimpleGrid, Text, Stack } from "@mantine/core";
import { Edit2, Plus, Trash2, X, Check, Tag as TagIcon } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { TagChip } from "./TagChip";

export const TagEditor = ({ isOpen, onClose, tags, onCreateTag, onUpdateTag, onDeleteTag }) => {
  const { mode, interactive } = useSemanticColors();
  const { tagColors, canonicalColors } = useThemeColors();
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.muted;

  const [newTagName, setNewTagName] = useState("");
  const [newTagColorIndex, setNewTagColorIndex] = useState(0);
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingColorIndex, setEditingColorIndex] = useState(0);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    // Store canonical color (not theme color)
    await onCreateTag(newTagName.trim(), canonicalColors[newTagColorIndex]);
    setNewTagName("");
    setNewTagColorIndex(0);
  };

  const startEditing = tag => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    // Find the index of this color in canonical colors
    const colorIndex = canonicalColors.findIndex(c => c.toLowerCase() === tag.color.toLowerCase());
    setEditingColorIndex(colorIndex >= 0 ? colorIndex : 0);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingName("");
    setEditingColorIndex(0);
  };

  const saveEditing = async () => {
    if (!editingName.trim()) return;
    await onUpdateTag(editingTagId, {
      name: editingName.trim(),
      color: canonicalColors[editingColorIndex],
    });
    cancelEditing();
  };

  const handleDelete = async tagId => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Delete this tag? It will be removed from all tasks.")) {
      await onDeleteTag(tagId);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap={8}>
          <TagIcon size={20} />
          <Text>Manage Tags</Text>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Create new tag section */}
        <Box p={12} style={{ border: `1px solid ${borderColor}`, borderRadius: "0.375rem" }}>
          <Text size="sm" fw={500} mb={8}>
            Create New Tag
          </Text>
          <TextInput
            placeholder="Tag name"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTag()}
            size="sm"
            mb={8}
          />
          <Text size="xs" c={mode.text.secondary} mb={4}>
            Color
          </Text>
          <SimpleGrid cols={10} spacing={4}>
            {tagColors.map((themeColor, index) => (
              <Box
                key={index}
                w={24}
                h={24}
                style={{
                  borderRadius: "0.375rem",
                  background: themeColor,
                  cursor: "pointer",
                  border:
                    newTagColorIndex === index ? `2px solid ${interactive.primary}` : `1px solid ${mode.border.input}`,
                  transition: "all 0.15s",
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
          </SimpleGrid>
          <Button
            size="sm"
            color="blue"
            mt={12}
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            leftSection={<Plus size={14} />}
          >
            Create Tag
          </Button>
        </Box>

        {/* Existing tags list */}
        <Box>
          <Text size="sm" fw={500} mb={8}>
            Existing Tags ({tags.length})
          </Text>
          <Stack gap={8} style={{ maxHeight: "300px", overflowY: "auto" }}>
            {tags.length === 0 ? (
              <Text
                size="sm"
                c={mode.text.secondary}
                style={{ textAlign: "center", paddingTop: 16, paddingBottom: 16 }}
              >
                No tags yet. Create your first tag above.
              </Text>
            ) : (
              tags.map(tag => (
                <Box
                  key={tag.id}
                  p={8}
                  style={{
                    border: `1px solid ${borderColor}`,
                    borderRadius: "0.375rem",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = hoverBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {editingTagId === tag.id ? (
                    <Stack gap={8}>
                      <TextInput
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        size="sm"
                        autoFocus
                      />
                      <SimpleGrid cols={10} spacing={4}>
                        {tagColors.map((themeColor, index) => (
                          <Box
                            key={index}
                            w={20}
                            h={20}
                            style={{
                              borderRadius: "0.125rem",
                              background: themeColor,
                              cursor: "pointer",
                              border:
                                editingColorIndex === index
                                  ? `2px solid ${interactive.primary}`
                                  : `1px solid ${borderColor}`,
                            }}
                            onClick={() => setEditingColorIndex(index)}
                          />
                        ))}
                      </SimpleGrid>
                      <Group justify="flex-end" gap={4}>
                        <ActionIcon size="xs" variant="subtle" onClick={cancelEditing} aria-label="Cancel">
                          <X size={14} />
                        </ActionIcon>
                        <ActionIcon size="xs" color="blue" onClick={saveEditing} aria-label="Save">
                          <Check size={14} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  ) : (
                    <Group justify="space-between">
                      <TagChip tag={tag} size="sm" />
                      <Group gap={4}>
                        <ActionIcon size="xs" variant="subtle" onClick={() => startEditing(tag)} aria-label="Edit tag">
                          <Edit2 size={14} />
                        </ActionIcon>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(tag.id)}
                          aria-label="Delete tag"
                        >
                          <Trash2 size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  )}
                </Box>
              ))
            )}
          </Stack>
        </Box>
      </Stack>
    </Modal>
  );
};

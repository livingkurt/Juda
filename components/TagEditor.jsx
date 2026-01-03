"use client";

import { useState } from "react";
import { Box, Button, Dialog, HStack, IconButton, Input, SimpleGrid, Text, VStack, Portal } from "@chakra-ui/react";
import { Edit2, Plus, Trash2, X, Check, Tag as TagIcon } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { TagChip } from "./TagChip";

export const TagEditor = ({ isOpen, onClose, tags, onCreateTag, onUpdateTag, onDeleteTag }) => {
  const { mode, interactive } = useSemanticColors();
  const { tagColors, canonicalColors } = useThemeColors();
  const bgColor = mode.bg.surface;
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
    <Dialog.Root open={isOpen} onOpenChange={e => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg={bgColor} maxW="500px" w="90vw">
            <Dialog.Header>
              <HStack>
                <TagIcon size={20} />
                <Text>Manage Tags</Text>
              </HStack>
            </Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body pb={6}>
              <VStack spacing={4} align="stretch">
                {/* Create new tag section */}
                <Box p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Create New Tag
                  </Text>
                  <Input
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateTag()}
                    size="sm"
                    mb={2}
                  />
                  <Text fontSize="xs" color={mode.text.secondary} mb={1}>
                    Color
                  </Text>
                  <SimpleGrid columns={10} gap={1}>
                    {tagColors.map((themeColor, index) => (
                      <Box
                        key={index}
                        w={6}
                        h={6}
                        borderRadius="md"
                        bg={themeColor}
                        cursor="pointer"
                        borderWidth={newTagColorIndex === index ? "2px" : "1px"}
                        borderColor={newTagColorIndex === index ? interactive.primary : mode.border.input}
                        _hover={{ transform: "scale(1.1)" }}
                        onClick={() => setNewTagColorIndex(index)}
                        transition="all 0.15s"
                      />
                    ))}
                  </SimpleGrid>
                  <Button size="sm" colorPalette="blue" mt={3} onClick={handleCreateTag} disabled={!newTagName.trim()}>
                    <Plus size={14} />
                    Create Tag
                  </Button>
                </Box>

                {/* Existing tags list */}
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Existing Tags ({tags.length})
                  </Text>
                  <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                    {tags.length === 0 ? (
                      <Text fontSize="sm" color={mode.text.secondary} textAlign="center" py={4}>
                        No tags yet. Create your first tag above.
                      </Text>
                    ) : (
                      tags.map(tag => (
                        <Box
                          key={tag.id}
                          p={2}
                          borderWidth="1px"
                          borderColor={borderColor}
                          borderRadius="md"
                          _hover={{ bg: hoverBg }}
                        >
                          {editingTagId === tag.id ? (
                            <VStack spacing={2} align="stretch">
                              <Input
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                size="sm"
                                autoFocus
                              />
                              <SimpleGrid columns={10} gap={1}>
                                {tagColors.map((themeColor, index) => (
                                  <Box
                                    key={index}
                                    w={5}
                                    h={5}
                                    borderRadius="sm"
                                    bg={themeColor}
                                    cursor="pointer"
                                    borderWidth={editingColorIndex === index ? "2px" : "1px"}
                                    borderColor={editingColorIndex === index ? interactive.primary : borderColor}
                                    onClick={() => setEditingColorIndex(index)}
                                  />
                                ))}
                              </SimpleGrid>
                              <HStack justify="flex-end" spacing={1}>
                                <IconButton size="xs" variant="ghost" onClick={cancelEditing} aria-label="Cancel">
                                  <X size={14} />
                                </IconButton>
                                <IconButton size="xs" colorPalette="blue" onClick={saveEditing} aria-label="Save">
                                  <Check size={14} />
                                </IconButton>
                              </HStack>
                            </VStack>
                          ) : (
                            <HStack justify="space-between">
                              <TagChip tag={tag} size="sm" />
                              <HStack spacing={1}>
                                <IconButton
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => startEditing(tag)}
                                  aria-label="Edit tag"
                                >
                                  <Edit2 size={14} />
                                </IconButton>
                                <IconButton
                                  size="xs"
                                  variant="ghost"
                                  colorPalette="red"
                                  onClick={() => handleDelete(tag.id)}
                                  aria-label="Delete tag"
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </HStack>
                            </HStack>
                          )}
                        </Box>
                      ))
                    )}
                  </VStack>
                </Box>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

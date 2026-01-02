"use client";

import { useState } from "react";
import { Box, Button, Dialog, HStack, IconButton, Input, SimpleGrid, Text, VStack, Portal } from "@chakra-ui/react";
import { Edit2, Plus, Trash2, X, Check, Tag as TagIcon } from "lucide-react";
import { TASK_COLORS } from "@/lib/constants";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const TagEditor = ({ isOpen, onClose, tags, onCreateTag, onUpdateTag, onDeleteTag }) => {
  const { mode, interactive } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.muted;

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TASK_COLORS[0]);
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await onCreateTag(newTagName.trim(), newTagColor);
    setNewTagName("");
    setNewTagColor(TASK_COLORS[0]);
  };

  const startEditing = tag => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingName("");
    setEditingColor("");
  };

  const saveEditing = async () => {
    if (!editingName.trim()) return;
    await onUpdateTag(editingTagId, {
      name: editingName.trim(),
      color: editingColor,
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
                    {TASK_COLORS.map(color => (
                      <Box
                        key={color}
                        w={6}
                        h={6}
                        borderRadius="md"
                        bg={color}
                        cursor="pointer"
                        borderWidth={newTagColor === color ? "2px" : "1px"}
                        borderColor={newTagColor === color ? interactive.primary : mode.border.input}
                        _hover={{ transform: "scale(1.1)" }}
                        onClick={() => setNewTagColor(color)}
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
                                {TASK_COLORS.map(color => (
                                  <Box
                                    key={color}
                                    w={5}
                                    h={5}
                                    borderRadius="sm"
                                    bg={color}
                                    cursor="pointer"
                                    borderWidth={editingColor === color ? "2px" : "1px"}
                                    borderColor={editingColor === color ? "blue.500" : "gray.300"}
                                    _dark={{ borderColor: editingColor === color ? "blue.400" : "gray.600" }}
                                    onClick={() => setEditingColor(color)}
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
                              <HStack>
                                <Box w={4} h={4} borderRadius="full" bg={tag.color} />
                                <Text fontSize="sm">{tag.name}</Text>
                              </HStack>
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

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Flex,
  HStack,
  Input,
  IconButton,
  Menu,
  MenuItem,
  Tag,
  Text,
  Separator,
  createListCollection,
} from "@chakra-ui/react";
import { MoreVertical, Trash2, CheckSquare, Type, Folder, Plus, Tag as TagIcon } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { SelectDropdown } from "./SelectDropdown";

export const NoteEditor = ({ note, folders, allTags: _allTags, onUpdate, onDelete, onConvertToTask }) => {
  // Initialize state from note prop
  const [title, setTitle] = useState(() => note.title || "");
  const [content, setContent] = useState(() => note.content || "");
  const [tags, setTags] = useState(() => {
    const tagNames = (note.tags || []).map(tag => (typeof tag === "string" ? tag : tag.name));
    return tagNames;
  });
  const [folderId, setFolderId] = useState(() => note.folderId || "");
  const [newTag, setNewTag] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(note.id);

  // Create folder collection for Select
  const folderCollection = useMemo(
    () =>
      createListCollection({
        items: [{ label: "No folder", value: "" }, ...folders.map(f => ({ label: f.name, value: f.id }))],
      }),
    [folders]
  );

  // Update local state when note ID changes (switching to different note)
  if (note.id !== currentNoteId) {
    setCurrentNoteId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    const tagNames = (note.tags || []).map(tag => (typeof tag === "string" ? tag : tag.name));
    setTags(tagNames);
    setFolderId(note.folderId || "");
  }

  // Debounced save
  useEffect(() => {
    const timeout = setTimeout(() => {
      const currentTagNames = (note.tags || []).map(tag => (typeof tag === "string" ? tag : tag.name));

      if (
        title !== note.title ||
        content !== note.content ||
        JSON.stringify(tags) !== JSON.stringify(currentTagNames) ||
        folderId !== note.folderId
      ) {
        onUpdate(note.id, { title, content, folderId: folderId || null });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [title, content, tags, folderId, note, onUpdate]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = tagToRemove => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Get folder name for display
  const currentFolder = folders.find(f => f.id === folderId);

  return (
    <Flex direction="column" h="100%" bg={{ base: "white", _dark: "gray.800" }}>
      {/* Minimal Header - Notion/Apple Notes style */}
      <Flex px={6} pt={4} pb={2} align="center" justify="space-between" flexShrink={0}>
        {/* Left side - folder/tag indicators */}
        <HStack gap={2} color={{ base: "gray.500", _dark: "gray.400" }} fontSize="xs">
          {currentFolder && (
            <HStack gap={1} cursor="pointer" onClick={() => setShowMetadata(!showMetadata)}>
              <Folder size={12} />
              <Text>{currentFolder.name}</Text>
            </HStack>
          )}
          {tags.length > 0 && (
            <HStack gap={1} cursor="pointer" onClick={() => setShowMetadata(!showMetadata)}>
              <TagIcon size={12} />
              <Text>
                {tags.length} tag{tags.length > 1 ? "s" : ""}
              </Text>
            </HStack>
          )}
          {!currentFolder && tags.length === 0 && (
            <Text
              cursor="pointer"
              onClick={() => setShowMetadata(!showMetadata)}
              _hover={{ color: { base: "gray.700", _dark: "gray.300" } }}
            >
              Add folder or tags...
            </Text>
          )}
        </HStack>

        {/* Right side - actions */}
        <HStack gap={1}>
          <Text fontSize="xs" color={{ base: "gray.400", _dark: "gray.500" }}>
            {new Date(note.updatedAt).toLocaleDateString()}
          </Text>
          <Menu.Root>
            <Menu.Trigger asChild>
              <IconButton
                variant="ghost"
                size="sm"
                aria-label="Note options"
                border="none"
                outline="none"
                _hover={{ border: "none", outline: "none" }}
                _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                _active={{ border: "none", outline: "none" }}
              >
                <MoreVertical size={16} />
              </IconButton>
            </Menu.Trigger>
            <Menu.Positioner>
              <Menu.Content>
                <MenuItem onClick={() => setShowMetadata(!showMetadata)}>
                  <HStack>
                    <Folder size={16} />
                    <Text>{showMetadata ? "Hide" : "Show"} folder & tags</Text>
                  </HStack>
                </MenuItem>
                <Separator />
                <MenuItem onClick={() => onConvertToTask(note)}>
                  <HStack>
                    <CheckSquare size={16} />
                    <Text>Convert to Task</Text>
                  </HStack>
                </MenuItem>
                <MenuItem onClick={() => onUpdate(note.id, { completionType: "text" })}>
                  <HStack>
                    <Type size={16} />
                    <Text>Convert to Text Input Task</Text>
                  </HStack>
                </MenuItem>
                <Separator />
                <MenuItem onClick={() => onDelete(note.id)} color="red.500">
                  <HStack>
                    <Trash2 size={16} />
                    <Text>Delete Note</Text>
                  </HStack>
                </MenuItem>
              </Menu.Content>
            </Menu.Positioner>
          </Menu.Root>
        </HStack>
      </Flex>

      {/* Collapsible Metadata Panel */}
      {showMetadata && (
        <Box
          px={6}
          py={3}
          bg={{ base: "gray.50", _dark: "gray.900" }}
          borderTopWidth="1px"
          borderBottomWidth="1px"
          borderColor={{ base: "gray.100", _dark: "gray.700" }}
        >
          <Flex gap={6} flexWrap="wrap" align="center">
            {/* Folder Select */}
            <HStack gap={2}>
              <Text fontSize="xs" fontWeight="medium" color={{ base: "gray.500", _dark: "gray.400" }} minW="50px">
                Folder
              </Text>
              <SelectDropdown
                collection={folderCollection}
                value={[folderId]}
                onValueChange={({ value }) => setFolderId(value[0])}
                placeholder="No folder"
                size="sm"
                width="160px"
              />
            </HStack>

            {/* Tags */}
            <HStack gap={2} flex={1} flexWrap="wrap">
              <Text fontSize="xs" fontWeight="medium" color={{ base: "gray.500", _dark: "gray.400" }} minW="50px">
                Tags
              </Text>
              {tags.map(tag => (
                <Tag.Root key={tag} size="sm" colorScheme="blue" borderRadius="full">
                  <Tag.Label>{tag}</Tag.Label>
                  <Tag.CloseTrigger onClick={() => removeTag(tag)} />
                </Tag.Root>
              ))}
              <HStack gap={1}>
                <Input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  size="xs"
                  w="80px"
                  variant="flushed"
                  bg="transparent"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                {newTag.trim() && (
                  <IconButton size="xs" variant="ghost" onClick={addTag} aria-label="Add tag">
                    <Plus size={12} />
                  </IconButton>
                )}
              </HStack>
            </HStack>
          </Flex>
        </Box>
      )}

      {/* Title - Large, clean input */}
      <Box px={6} pt={4} pb={2} flexShrink={0}>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Untitled"
          variant="unstyled"
          bg="transparent"
          fontSize="2xl"
          fontWeight="bold"
          color={{ base: "gray.900", _dark: "gray.50" }}
          _placeholder={{ color: { base: "gray.300", _dark: "gray.600" } }}
          _focus={{ bg: "transparent" }}
          _focusVisible={{ bg: "transparent" }}
        />
      </Box>

      {/* Rich Text Editor - Takes remaining space */}
      <Box flex={1} overflow="hidden">
        <RichTextEditor content={content} onChange={setContent} placeholder="Start writing..." showToolbar={true} />
      </Box>
    </Flex>
  );
};

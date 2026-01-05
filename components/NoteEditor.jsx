"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, Flex, Group, TextInput, ActionIcon, Menu, Badge, Text, Divider } from "@mantine/core";
import { MoreVertical, Trash2, CheckSquare, Type, Folder, Plus, Tag as TagIcon } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { SelectDropdown } from "./SelectDropdown";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const NoteEditor = ({ note, folders, allTags: _allTags, onUpdate, onDelete, onConvertToTask }) => {
  const { mode } = useSemanticColors();
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

  // Create folder options for Select
  const folderOptions = useMemo(
    () => [{ label: "No folder", value: "" }, ...folders.map(f => ({ label: f.name, value: f.id }))],
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
    <Flex direction="column" style={{ height: "100%", background: mode.bg.surface }}>
      {/* Minimal Header - Notion/Apple Notes style */}
      <Flex
        style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 16, paddingBottom: 8, flexShrink: 0 }}
        align="center"
        justify="space-between"
      >
        {/* Left side - folder/tag indicators */}
        <Group gap={8} style={{ color: mode.text.secondary, fontSize: "var(--mantine-font-size-xs)" }}>
          {currentFolder && (
            <Group gap={4} style={{ cursor: "pointer" }} onClick={() => setShowMetadata(!showMetadata)}>
              <Folder size={12} />
              <Text>{currentFolder.name}</Text>
            </Group>
          )}
          {tags.length > 0 && (
            <Group gap={4} style={{ cursor: "pointer" }} onClick={() => setShowMetadata(!showMetadata)}>
              <TagIcon size={12} />
              <Text>
                {tags.length} tag{tags.length > 1 ? "s" : ""}
              </Text>
            </Group>
          )}
          {!currentFolder && tags.length === 0 && (
            <Text
              style={{ cursor: "pointer" }}
              onClick={() => setShowMetadata(!showMetadata)}
              onMouseEnter={e => {
                e.currentTarget.style.color = mode.text.primary;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = mode.text.secondary;
              }}
            >
              Add folder or tags...
            </Text>
          )}
        </Group>

        {/* Right side - actions */}
        <Group gap={4}>
          <Text size="xs" c="gray.5">
            {new Date(note.updatedAt).toLocaleDateString()}
          </Text>
          <Menu>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                size="sm"
                aria-label="Note options"
                style={{ border: "none", outline: "none" }}
              >
                <MoreVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setShowMetadata(!showMetadata)}>
                <Group gap={8}>
                  <Folder size={16} />
                  <Text>{showMetadata ? "Hide" : "Show"} folder & tags</Text>
                </Group>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item onClick={() => onConvertToTask(note)}>
                <Group gap={8}>
                  <CheckSquare size={16} />
                  <Text>Convert to Task</Text>
                </Group>
              </Menu.Item>
              <Menu.Item onClick={() => onUpdate(note.id, { completionType: "text" })}>
                <Group gap={8}>
                  <Type size={16} />
                  <Text>Convert to Text Input Task</Text>
                </Group>
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item onClick={() => onDelete(note.id)} c="red">
                <Group gap={8}>
                  <Trash2 size={16} />
                  <Text>Delete Note</Text>
                </Group>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Flex>

      {/* Collapsible Metadata Panel */}
      {showMetadata && (
        <Box
          style={{
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 12,
            paddingBottom: 12,
            background: mode.bg.canvas,
            borderTopWidth: "1px",
            borderBottomWidth: "1px",
            borderTopColor: mode.border.default,
            borderBottomColor: mode.border.default,
            borderTopStyle: "solid",
            borderBottomStyle: "solid",
          }}
        >
          <Flex gap={24} wrap="wrap" align="center">
            {/* Folder Select */}
            <Group gap={8}>
              <Text size="xs" fw={500} c="gray.6" style={{ minWidth: "50px" }}>
                Folder
              </Text>
              <SelectDropdown
                data={folderOptions}
                value={folderId || null}
                onChange={setFolderId}
                placeholder="No folder"
                size="sm"
                width="160px"
              />
            </Group>

            {/* Tags */}
            <Group gap={8} style={{ flex: 1 }} wrap="wrap">
              <Text size="xs" fw={500} c="gray.6" style={{ minWidth: "50px" }}>
                Tags
              </Text>
              {tags.map(tag => (
                <Badge key={tag} size="sm" color="blue" style={{ borderRadius: "50%" }}>
                  {tag}
                  <ActionIcon size="xs" variant="subtle" onClick={() => removeTag(tag)} style={{ marginLeft: 4 }}>
                    ×
                  </ActionIcon>
                </Badge>
              ))}
              <Group gap={4}>
                <TextInput
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  size="xs"
                  style={{ width: "80px" }}
                  variant="unstyled"
                  styles={{
                    input: {
                      backgroundColor: "transparent",
                    },
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                {newTag.trim() && (
                  <ActionIcon size="xs" variant="subtle" onClick={addTag} aria-label="Add tag">
                    <Plus size={12} />
                  </ActionIcon>
                )}
              </Group>
            </Group>
          </Flex>
        </Box>
      )}

      {/* Title - Large, clean input */}
      <Box style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 16, paddingBottom: 8, flexShrink: 0 }}>
        <TextInput
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Untitled"
          variant="unstyled"
          styles={{
            input: {
              backgroundColor: "transparent",
              fontSize: "var(--mantine-font-size-2xl)",
              fontWeight: 700,
              color: mode.text.primary,
              "&::placeholder": {
                color: mode.text.muted,
              },
              "&:focus": {
                backgroundColor: "transparent",
              },
              "&:focusVisible": {
                backgroundColor: "transparent",
              },
            },
          }}
        />
      </Box>

      {/* Rich Text Editor - Takes remaining space */}
      <Box flex={1} overflow="hidden">
        <RichTextEditor content={content} onChange={setContent} placeholder="Start writing..." showToolbar={true} />
      </Box>
    </Flex>
  );
};

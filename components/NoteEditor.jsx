"use client";

import { useState, useCallback, useRef } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
} from "@mui/material";
import { MoreVert as MoreVertical, Delete, CheckBox } from "@mui/icons-material";
import { RichTextEditor } from "./RichTextEditor";
import { TagChip } from "./TagChip";
import dayjs from "dayjs";

export const NoteEditor = ({ note, folders = [], onUpdate, onDelete, onConvertToTask }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [localTitle, setLocalTitle] = useState(note?.title || "");
  const saveTimeoutRef = useRef(null);

  // Sync title when note changes (using key prop ensures remount on note change)
  if (note?.title !== localTitle && note?.id) {
    setLocalTitle(note.title || "");
  }

  const debouncedSave = useCallback(
    updates => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate?.(note?.id, updates);
      }, 500);
    },
    [note, onUpdate]
  );

  const handleTitleChange = newTitle => {
    setLocalTitle(newTitle);
    debouncedSave({ title: newTitle });
  };

  const handleContentChange = newContent => {
    debouncedSave({ content: newContent });
  };

  const handleFolderChange = folderId => {
    onUpdate?.(note.id, { folderId: folderId || null });
  };

  const handleTagToggle = tag => {
    const currentIds = note.tags?.map(t => t.id) || [];
    const newIds = currentIds.includes(tag.id) ? currentIds.filter(id => id !== tag.id) : [...currentIds, tag.id];
    onUpdate?.(note.id, { tagIds: newIds });
  };

  if (!note) return null;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          value={localTitle}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          variant="standard"
          fullWidth
          InputProps={{ disableUnderline: true, sx: { fontSize: "1.5rem", fontWeight: 600 } }}
        />
        <IconButton onClick={e => setMenuAnchor(e.currentTarget)}>
          <MoreVertical fontSize="small" />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              onConvertToTask?.(note, "checkbox");
              setMenuAnchor(null);
            }}
          >
            <CheckBox fontSize="small" sx={{ mr: 1 }} /> Convert to Task
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              onDelete?.(note.id);
              setMenuAnchor(null);
            }}
            sx={{ color: "error.main" }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </Stack>

      {/* Metadata */}
      <Stack direction="row" spacing={2} sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Folder</InputLabel>
          <Select value={note.folderId || ""} onChange={e => handleFolderChange(e.target.value)} label="Folder">
            <MenuItem value="">None</MenuItem>
            {folders.map(f => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
          {note.tags?.map(tag => (
            <TagChip key={tag.id} tag={tag} size="small" onDelete={() => handleTagToggle(tag)} />
          ))}
        </Stack>
      </Stack>

      {/* Editor */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <RichTextEditor content={note.content || ""} onChange={handleContentChange} placeholder="Start writing..." />
      </Box>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" sx={{ p: 1, textAlign: "right" }}>
        Last updated: {dayjs(note.updatedAt).format("MMM D, YYYY h:mm A")}
      </Typography>
    </Box>
  );
};

export default NoteEditor;

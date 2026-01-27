"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  IconButton,
  TextField,
  Typography,
  MenuItem,
  Divider,
  useTheme,
} from "@mui/material";
import { Edit, Add, Delete, Close, Check, Label, Search } from "@mui/icons-material";
import { useThemeColors } from "@/hooks/useThemeColors";
import { TagChip } from "./TagChip";
import { useDialogState } from "@/hooks/useDialogState";
import {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} from "@/lib/store/api/tagsApi";

/**
 * TagEditor - Full tag management dialog
 * 
 * Features:
 * - Search tags
 * - Create new tags with color picker
 * - Edit existing tags (rename, change color)
 * - Delete tags
 */
export const TagEditor = () => {
  const theme = useTheme();
  const dialogState = useDialogState();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [updateTagMutation] = useUpdateTagMutation();
  const [deleteTagMutation] = useDeleteTagMutation();
  const { tagColors, canonicalColors } = useThemeColors();
  const searchInputRef = useRef(null);

  const isOpen = dialogState.tagEditorOpen;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingColorIndex, setEditingColorIndex] = useState(0);

  // Auto-focus search when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    dialogState.setTagEditorOpen(false);
    setSearchQuery("");
    setShowColorPicker(false);
    setEditingTagId(null);
  };

  // Filter tags based on search
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search matches existing tag
  const exactMatch = tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());
  const showCreateButton = searchQuery.trim() && !exactMatch;

  // Create new tag
  const handleCreateTag = async colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      await createTagMutation({
        name: searchQuery.trim(),
        color: canonicalColors[colorIndex],
      }).unwrap();

      setSearchQuery("");
      setShowColorPicker(false);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  // Start editing a tag
  const startEditing = tag => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    const colorIndex = canonicalColors.findIndex(c => c.toLowerCase() === tag.color.toLowerCase());
    setEditingColorIndex(colorIndex >= 0 ? colorIndex : 0);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingName("");
    setEditingColorIndex(0);
  };

  // Save edited tag
  const saveEditing = async () => {
    if (!editingName.trim()) return;

    try {
      await updateTagMutation({
        id: editingTagId,
        name: editingName.trim(),
        color: canonicalColors[editingColorIndex],
      }).unwrap();

      cancelEditing();
    } catch (err) {
      console.error("Failed to update tag:", err);
    }
  };

  // Delete tag
  const handleDelete = async tagId => {
    // eslint-disable-next-line no-alert
    if (window.confirm("Delete this tag? It will be removed from all tasks.")) {
      try {
        await deleteTagMutation(tagId).unwrap();
      } catch (err) {
        console.error("Failed to delete tag:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Label fontSize="medium" />
          <Typography>Manage Tags</Typography>
        </Stack>
        <IconButton onClick={handleClose} sx={{ position: "absolute", right: 8, top: 8 }} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ px: 2, py: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Search fontSize="small" sx={{ color: "text.secondary" }} />
            <TextField
              inputRef={searchInputRef}
              size="small"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowColorPicker(false);
              }}
              variant="standard"
              fullWidth
              sx={{
                "& .MuiInput-underline:before": { borderBottom: "none" },
                "& .MuiInput-underline:hover:before": { borderBottom: "none" },
                "& .MuiInput-underline:after": { borderBottom: "none" },
              }}
            />
          </Stack>
        </Box>

        <Divider />

        {/* Create new tag button */}
        {showCreateButton && !showColorPicker && (
          <Box sx={{ px: 2, py: 2 }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => setShowColorPicker(true)}
            >
              Create &quot;{searchQuery}&quot;
            </Button>
          </Box>
        )}

        {/* Color picker for new tag */}
        {showCreateButton && showColorPicker && (
          <Box sx={{ px: 2, py: 2 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" mb={1}>
              Choose a color:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tagColors.map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: color,
                    cursor: "pointer",
                    border: "2px solid transparent",
                    "&:hover": {
                      border: `2px solid ${theme.palette.primary.main}`,
                      transform: "scale(1.1)",
                    },
                    transition: "all 0.15s",
                  }}
                  onClick={() => handleCreateTag(index)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {(showCreateButton && showColorPicker) && <Divider />}

        {/* Tag list */}
        <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
          {filteredTags.length > 0 ? (
            filteredTags.map(tag => (
              <Box key={tag.id}>
                {editingTagId === tag.id ? (
                  // Editing mode
                  <Box sx={{ px: 2, py: 2 }}>
                    <Stack spacing={2}>
                      <TextField
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        size="small"
                        autoFocus
                        fullWidth
                        placeholder="Tag name"
                      />
                      <Box>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" mb={1}>
                          Color:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
                          {tagColors.map((color, index) => (
                            <Box
                              key={index}
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 1,
                                bgcolor: color,
                                cursor: "pointer",
                                border:
                                  editingColorIndex === index
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : "2px solid transparent",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                },
                                transition: "all 0.15s",
                              }}
                              onClick={() => setEditingColorIndex(index)}
                            />
                          ))}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button size="small" variant="contained" onClick={saveEditing}>
                          <Check fontSize="small" sx={{ mr: 0.5 }} />
                          Save
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ) : (
                  // View mode
                  <MenuItem
                    sx={{
                      py: 1.5,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <TagChip tag={tag} size="sm" />
                    <Box sx={{ flex: 1 }} />
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          startEditing(tag);
                        }}
                        aria-label="Edit tag"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(tag.id);
                        }}
                        aria-label="Delete tag"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </MenuItem>
                )}
              </Box>
            ))
          ) : !showCreateButton ? (
            <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? "No tags found" : "No tags yet. Create your first tag above."}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

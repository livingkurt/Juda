"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  IconButton,
  TextField,
  Grid,
  Typography,
  useTheme,
} from "@mui/material";
import { Edit, Add, Delete, Close, Check, Label } from "@mui/icons-material";
import { useThemeColors } from "@/hooks/useThemeColors";
import { TagChip } from "./TagChip";

export const TagEditor = ({ isOpen, onClose, tags, onCreateTag, onUpdateTag, onDeleteTag }) => {
  const { tagColors, canonicalColors } = useThemeColors();
  const theme = useTheme();

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
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Label fontSize="medium" />
          <Typography>Manage Tags</Typography>
        </Stack>
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Create new tag section */}
          <Box
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" fontWeight={500} mb={2}>
              Create New Tag
            </Typography>
            <TextField
              placeholder="Tag name"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateTag()}
              size="small"
              fullWidth
              sx={{ mb: 2 }}
            />
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Color
            </Typography>
            <Grid container spacing={0.5} sx={{ mb: 2 }}>
              {tagColors.map((themeColor, index) => (
                <Grid item key={index}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      bgcolor: themeColor,
                      cursor: "pointer",
                      border: newTagColorIndex === index ? `2px solid ${theme.palette.primary.main}` : "1px solid",
                      borderColor: newTagColorIndex === index ? "primary.main" : "divider",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.15s",
                    }}
                    onClick={() => setNewTagColorIndex(index)}
                  />
                </Grid>
              ))}
            </Grid>
            <Button size="small" variant="contained" onClick={handleCreateTag} disabled={!newTagName.trim()}>
              <Add fontSize="small" />
              Create Tag
            </Button>
          </Box>

          {/* Existing tags list */}
          <Box>
            <Typography variant="body2" fontWeight={500} mb={2}>
              Existing Tags ({tags.length})
            </Typography>
            <Stack spacing={2} sx={{ maxHeight: "300px", overflowY: "auto" }}>
              {tags.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No tags yet. Create your first tag above.
                </Typography>
              ) : (
                tags.map(tag => (
                  <Box
                    key={tag.id}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    {editingTagId === tag.id ? (
                      <Stack spacing={2}>
                        <TextField
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          size="small"
                          autoFocus
                          fullWidth
                        />
                        <Grid container spacing={0.5}>
                          {tagColors.map((themeColor, index) => (
                            <Grid item key={index}>
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 0.5,
                                  bgcolor: themeColor,
                                  cursor: "pointer",
                                  border:
                                    editingColorIndex === index
                                      ? `2px solid ${theme.palette.primary.main}`
                                      : "1px solid",
                                  borderColor: editingColorIndex === index ? "primary.main" : "divider",
                                }}
                                onClick={() => setEditingColorIndex(index)}
                              />
                            </Grid>
                          ))}
                        </Grid>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <IconButton size="small" onClick={cancelEditing} aria-label="Cancel">
                            <Close fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="primary" onClick={saveEditing} aria-label="Save">
                            <Check fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <TagChip tag={tag} size="sm" />
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => startEditing(tag)} aria-label="Edit tag">
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(tag.id)}
                            aria-label="Delete tag"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    )}
                  </Box>
                ))
              )}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

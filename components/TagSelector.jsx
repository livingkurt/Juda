"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Stack, Menu, MenuItem, Button, TextField, Typography, IconButton } from "@mui/material";
import { Label, Add, Delete } from "@mui/icons-material";
import { TagChip } from "./TagChip";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTheme } from "@mui/material/styles";

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
  const [anchorEl, setAnchorEl] = useState(null);
  const inputRef = useRef(null);
  const muiTheme = useTheme();
  const { tagColors, canonicalColors } = useThemeColors();

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

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setIsOpen(false);
  };

  // If inline mode, only show the menu button (tags are displayed elsewhere)
  if (inline) {
    return (
      <>
        <Button size="small" variant="text" onClick={handleMenuOpen} startIcon={<Label fontSize="small" />}>
          Add
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={isOpen}
          onClose={handleMenuClose}
          PaperProps={{ sx: { minWidth: "250px", maxHeight: "350px", overflowY: "auto" } }}
        >
          <Box sx={{ p: 2, minWidth: "250px", maxHeight: "350px", overflowY: "auto" }}>
            {/* Create new tag section */}
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 2, display: "block" }}>
              Create New Tag
            </Typography>
            <Stack spacing={2}>
              <TextField
                inputRef={inputRef}
                size="small"
                placeholder="Tag name..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                fullWidth
              />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {tagColors.map((themeColor, index) => (
                  <Button
                    key={index}
                    sx={{
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      borderRadius: "50%",
                      bgcolor: themeColor,
                      border: newTagColorIndex === index ? `2px solid white` : "none",
                      boxShadow: newTagColorIndex === index ? `0 0 0 2px ${muiTheme.palette.primary.main}` : "none",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                      p: 0,
                    }}
                    onClick={() => setNewTagColorIndex(index)}
                  />
                ))}
              </Stack>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                startIcon={<Add fontSize="small" />}
              >
                Create Tag
              </Button>
            </Stack>

            {/* Available tags list */}
            {availableTags.length > 0 && (
              <>
                <Box
                  sx={{
                    borderTop: "1px solid",
                    borderColor: "divider",
                    my: 2,
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.secondary"
                  sx={{ px: 1, py: 0.5, display: "block" }}
                >
                  Available Tags
                </Typography>
                {availableTags.map(tag => (
                  <MenuItem
                    key={tag.id}
                    onClick={() => handleAddTag(tag.id)}
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
                      <TagChip tag={tag} size="xs" />
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteTag(tag.id);
                        }}
                        aria-label="Delete tag"
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </MenuItem>
                ))}
              </>
            )}

            {availableTags.length === 0 && tags.length > 0 && (
              <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
                All tags assigned to this task
              </Typography>
            )}
          </Box>
        </Menu>
      </>
    );
  }

  return (
    <Box>
      {/* Selected tags */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {selectedTags.map(tag => (
          <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={handleRemoveTag} />
        ))}
      </Box>

      {/* Add tag button/menu */}
      <Button size="small" variant="outlined" onClick={handleMenuOpen} startIcon={<Label fontSize="small" />}>
        Add Tag
      </Button>
      <Menu anchorEl={anchorEl} open={isOpen} onClose={handleMenuClose}>
        <Box sx={{ p: 2, minWidth: "250px", maxHeight: "350px", overflowY: "auto" }}>
          {/* Create new tag section */}
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 2, display: "block" }}>
            Create New Tag
          </Typography>
          <Stack spacing={2}>
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="Tag name..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              fullWidth
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {tagColors.map((themeColor, index) => (
                <Button
                  key={index}
                  sx={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: "50%",
                    bgcolor: themeColor,
                    border: newTagColorIndex === index ? `2px solid white` : "none",
                    boxShadow: newTagColorIndex === index ? `0 0 0 2px ${muiTheme.palette.primary.main}` : "none",
                    "&:hover": {
                      transform: "scale(1.1)",
                    },
                    p: 0,
                  }}
                  onClick={() => setNewTagColorIndex(index)}
                />
              ))}
            </Stack>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              startIcon={<Add fontSize="small" />}
            >
              Create Tag
            </Button>
          </Stack>

          {/* Available tags list */}
          {availableTags.length > 0 && (
            <>
              <Box
                sx={{
                  borderTop: "1px solid",
                  borderColor: "divider",
                  my: 2,
                }}
              />
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                sx={{ px: 1, py: 0.5, display: "block" }}
              >
                Available Tags
              </Typography>
              {availableTags.map(tag => (
                <MenuItem
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  sx={{
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
                    <TagChip tag={tag} size="xs" />
                    <IconButton
                      size="small"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteTag(tag.id);
                      }}
                      aria-label="Delete tag"
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                </MenuItem>
              ))}
            </>
          )}

          {availableTags.length === 0 && tags.length > 0 && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
              All tags assigned to this task
            </Typography>
          )}
        </Box>
      </Menu>
    </Box>
  );
};

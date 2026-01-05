"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Stack, Menu, MenuItem, Button, TextField, Typography, IconButton } from "@mui/material";
import { Label, Add, Close } from "@mui/icons-material";
import { TagChip } from "./TagChip";

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
  const [anchorEl, setAnchorEl] = useState(null);
  const inputRef = useRef(null);

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

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setIsOpen(false);
  };

  return (
    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
      {/* Selected tags as removable pills */}
      {selectedTags.map(tag => (
        <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={onTagDeselect} />
      ))}

      {/* Tag selector dropdown */}
      <Button
        size="small"
        variant="text"
        onClick={handleMenuOpen}
        sx={{
          color: "text.secondary",
          minWidth: "auto",
          px: 1,
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <Label fontSize="small" />
        {compact ? "" : selectedTags.length === 0 ? "" : "Add"}
      </Button>
      <Menu anchorEl={anchorEl} open={isOpen} onClose={handleMenuClose}>
        <Box sx={{ p: 2, minWidth: "200px", maxHeight: "300px", overflowY: "auto" }}>
          {/* Create new tag input */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              inputRef={inputRef}
              size="small"
              placeholder="New tag name..."
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={handleCreateTag} disabled={!newTagName.trim()} color="primary">
              <Add fontSize="small" />
            </IconButton>
          </Stack>

          {availableTags.length > 0 && (
            <Box>
              <Box
                sx={{
                  borderTop: "1px solid",
                  borderColor: "divider",
                  my: 1,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Available Tags
              </Typography>
              {availableTags.map(tag => (
                <MenuItem
                  key={tag.id}
                  onClick={() => {
                    onTagSelect(tag.id);
                  }}
                  sx={{
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: tag.color,
                      }}
                    />
                    <Typography variant="body2">{tag.name}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Box>
          )}

          {availableTags.length === 0 && tags.length > 0 && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
              All tags selected
            </Typography>
          )}

          {tags.length === 0 && !newTagName && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary" }}>
              No tags yet. Create one above!
            </Typography>
          )}
        </Box>
      </Menu>

      {/* Clear all filters button */}
      {selectedTags.length > 0 && (
        <IconButton
          size="small"
          onClick={() => selectedTagIds.forEach(id => onTagDeselect(id))}
          sx={{
            color: "text.secondary",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
};

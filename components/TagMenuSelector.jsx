"use client";

import { useState, useRef } from "react";
import {
  Box,
  Stack,
  Menu,
  MenuItem,
  Button,
  TextField,
  Typography,
  Checkbox,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Label, Add, Search } from "@mui/icons-material";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTheme } from "@mui/material/styles";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { TagChip } from "./TagChip";

export const TagMenuSelector = ({
  task,
  anchorEl: externalAnchorEl,
  open: externalOpen,
  onClose: externalOnClose,
  tags: externalTags,
  selectedTagIds: externalSelectedTagIds,
  onTagsChange: externalOnTagsChange,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [internalAnchorEl, setInternalAnchorEl] = useState(null);
  const searchInputRef = useRef(null);
  const theme = useTheme();

  // Use hooks directly (they use Redux internally)
  const { data: tagsFromQuery = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const taskOps = useTaskOperations();

  // Use external props if provided, otherwise use internal state
  const tags = externalTags || tagsFromQuery;
  const isControlled = externalAnchorEl !== undefined;
  const anchorEl = isControlled ? externalAnchorEl : internalAnchorEl;
  const isOpen = isControlled ? externalOpen : Boolean(anchorEl);

  // Local state for selected tags (optimistic updates)
  const initialTagIds = task?.tags?.map(t => t.id) || externalSelectedTagIds || [];
  const [selectedTagIds, setSelectedTagIds] = useState(initialTagIds);
  const [hasChanges, setHasChanges] = useState(false);

  const { tagColors, canonicalColors } = useThemeColors();

  // Get current task's tag IDs
  const currentTagIds = selectedTagIds;

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Check if search query matches any existing tag
  const exactMatch = tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());

  // Show "Add New" button if there's a search query and no exact match
  const showAddNew = searchQuery.trim() && !exactMatch;

  const handleToggleTag = tagId => {
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];
    setSelectedTagIds(newTagIds);
    setHasChanges(true);
  };

  const handleCreateAndAssign = async colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      // Store canonical color (not theme color)
      const newTag = await createTagMutation({
        name: searchQuery.trim(),
        color: canonicalColors[colorIndex],
      }).unwrap();
      // Add the new tag to the local state
      setSelectedTagIds([...currentTagIds, newTag.id]);
      setHasChanges(true);
      // Reset search and color picker
      setSearchQuery("");
      setShowColorPicker(false);
      setSelectedColorIndex(0);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleMenuOpen = event => {
    if (!isControlled) {
      setInternalAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    if (hasChanges) {
      // Menu is closing and we have changes - save them
      if (task) {
        taskOps.handleTaskTagsChange(task.id, selectedTagIds);
      } else if (externalOnTagsChange) {
        externalOnTagsChange(selectedTagIds);
      }
      setHasChanges(false);
    } else {
      // Menu is closing without changes - reset to initial state
      setSelectedTagIds(initialTagIds);
    }
    if (!isControlled) {
      setInternalAnchorEl(null);
    }
    if (externalOnClose) {
      externalOnClose();
    }
    setSearchQuery("");
    setShowColorPicker(false);
  };

  const menuContent = (
    <Menu
      anchorEl={anchorEl}
      open={isOpen}
      onClose={handleMenuClose}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      PaperProps={{
        sx: {
          minWidth: "280px",
          maxHeight: "400px",
          overflowY: "auto",
        },
      }}
    >
      {/* Search bar */}
      <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}>
            <Search fontSize="small" />
          </Box>
          <TextField
            inputRef={searchInputRef}
            size="small"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowColorPicker(false); // Hide color picker when typing
            }}
            variant="standard"
            autoFocus
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            sx={{
              flex: 1,
              "& .MuiInput-underline:before": {
                borderBottom: "none",
              },
              "& .MuiInput-underline:hover:before": {
                borderBottom: "none",
              },
              "& .MuiInput-underline:after": {
                borderBottom: "none",
              },
            }}
          />
        </Stack>
      </Box>

      {/* Add New button (shown when search doesn't match existing tags) */}
      {showAddNew && !showColorPicker && (
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            onClick={e => {
              e.stopPropagation();
              setShowColorPicker(true);
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            <Add fontSize="small" />
            <Typography ml={1}>Add &quot;{searchQuery}&quot;</Typography>
          </Button>
        </Box>
      )}

      {/* Color picker (shown after clicking Add New) */}
      {showAddNew && showColorPicker && (
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack spacing={2}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Choose a color:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              {tagColors.map((themeColor, index) => (
                <Button
                  key={index}
                  sx={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    borderRadius: 1,
                    bgcolor: themeColor,
                    border: selectedColorIndex === index ? `2px solid white` : "0px",
                    boxShadow: selectedColorIndex === index ? `0 0 0 2px ${theme.palette.primary.main}` : "none",
                    "&:hover": {
                      transform: "scale(1.1)",
                    },
                    transition: "transform 0.1s",
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    handleCreateAndAssign(index);
                  }}
                  onMouseDown={e => e.stopPropagation()}
                />
              ))}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Tags list with checkboxes */}
      {filteredTags.length > 0 ? (
        <Box sx={{ py: 1 }}>
          {filteredTags.map(tag => (
            <MenuItem
              key={tag.id}
              onClick={e => {
                e.stopPropagation();
                handleToggleTag(tag.id);
              }}
              onMouseDown={e => e.stopPropagation()}
              sx={{
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                  <Checkbox checked={currentTagIds.includes(tag.id)} size="small" sx={{ pointerEvents: "none" }} />
                  <TagChip tag={tag} size="xs" />
                </Stack>
              </Stack>
            </MenuItem>
          ))}
        </Box>
      ) : !showAddNew ? (
        <Box sx={{ px: 3, py: 4 }}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No tags found
          </Typography>
        </Box>
      ) : null}
    </Menu>
  );

  // If used as MenuItem (in TaskContextMenu), render MenuItem + Menu
  if (task && !isControlled) {
    return (
      <>
        <MenuItem onClick={handleMenuOpen}>
          <ListItemIcon>
            <Label fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tags</ListItemText>
        </MenuItem>
        {menuContent}
      </>
    );
  }

  // If used with external anchorEl (in RecurringTableView), just render Menu
  return menuContent;
};

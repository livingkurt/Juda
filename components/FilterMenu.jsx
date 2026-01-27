"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Stack,
  Menu,
  MenuItem,
  Button,
  TextField,
  Typography,
  IconButton,
  Checkbox,
  Chip,
  Divider,
} from "@mui/material";
import {
  FilterList,
  Flag,
  Sort,
  Add,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
  Label,
} from "@mui/icons-material";
import { PRIORITY_LEVELS } from "@/lib/constants";
import { UNTAGGED_ID } from "./BacklogTagSidebar";

const iconMap = {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
};

export const FilterMenu = ({
  tags = [],
  tasks = [],
  selectedTagIds = [],
  onTagSelect,
  onTagDeselect,
  onCreateTag,
  selectedPriorities = [],
  onPrioritySelect,
  onPriorityDeselect,
  sortByPriority = false,
  onSortToggle,
  sortByTag = false,
  onTagSortToggle,
  showPriorityFilter = true,
  showSort = true,
  showUntaggedOption = true,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [newTagName, setNewTagName] = useState("");
  const inputRef = useRef(null);
  const isOpen = Boolean(anchorEl);

  // Focus input when menu opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Calculate tag counts based on tasks
  const tagCounts = useMemo(() => {
    const counts = new Map();

    // Initialize all tags with 0
    tags.forEach(tag => {
      counts.set(tag.id, 0);
    });

    // Count tasks for each tag
    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
        });
      }
    });

    return counts;
  }, [tags, tasks]);

  // Calculate untagged count
  const untaggedCount = useMemo(() => {
    return tasks.filter(task => !task.tags || task.tags.length === 0).length;
  }, [tasks]);

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
  const hasUntaggedSelected = selectedTagIds.includes(UNTAGGED_ID);
  const filterablePriorities = PRIORITY_LEVELS.filter(level => level.value !== null);

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNewTagName("");
  };

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

  const handleTagToggle = tagId => {
    if (selectedTagIds.includes(tagId)) {
      onTagDeselect(tagId);
    } else {
      onTagSelect(tagId);
    }
  };

  const handlePriorityToggle = priority => {
    if (selectedPriorities.includes(priority)) {
      onPriorityDeselect(priority);
    } else {
      onPrioritySelect(priority);
    }
  };

  const handleClearAllTags = () => {
    selectedTagIds.forEach(id => onTagDeselect(id));
  };

  const handleClearAllPriorities = () => {
    selectedPriorities.forEach(priority => onPriorityDeselect(priority));
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: "text.secondary",
          "&:hover": { color: "text.primary" },
        }}
      >
        <FilterList />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            maxHeight: "80vh",
            minWidth: "280px",
            maxWidth: "320px",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Tags Section */}
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.5,
              color: "text.secondary",
              fontWeight: 600,
              display: "block",
              mb: 1,
            }}
          >
            Tags
          </Typography>

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

          {/* Untagged option */}
          {showUntaggedOption && (
            <MenuItem
              onClick={() => handleTagToggle(UNTAGGED_ID)}
              sx={{
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Checkbox checked={hasUntaggedSelected} size="small" />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  bgcolor: "transparent",
                  borderWidth: 1.5,
                  borderStyle: "solid",
                  borderColor: hasUntaggedSelected ? "text.primary" : "text.secondary",
                  borderRadius: "50%",
                  mr: 1,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>
                Untagged
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                ({untaggedCount})
              </Typography>
            </MenuItem>
          )}

          {/* Available tags - show all tags, not just available ones */}
          {tags.length > 0 && (
            <>
              {tags.map(tag => {
                const count = tagCounts.get(tag.id) || 0;
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <MenuItem
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    sx={{
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Checkbox checked={isSelected} size="small" />
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: tag.color,
                        mr: 1,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {tag.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                      ({count})
                    </Typography>
                  </MenuItem>
                );
              })}
            </>
          )}

          {/* Selected tags display */}
          {selectedTags.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                {selectedTags.map(tag => (
                  <Chip
                    key={tag.id}
                    label={tag.name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      bgcolor: tag.color,
                      color: "white",
                      "& .MuiChip-deleteIcon": {
                        color: "white",
                        fontSize: "0.875rem",
                      },
                    }}
                    onDelete={() => onTagDeselect(tag.id)}
                  />
                ))}
                {hasUntaggedSelected && (
                  <Chip
                    label="Untagged"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                    }}
                    onDelete={() => onTagDeselect(UNTAGGED_ID)}
                  />
                )}
              </Stack>
              <Button
                size="small"
                onClick={handleClearAllTags}
                sx={{
                  mt: 0.5,
                  fontSize: "0.7rem",
                  minWidth: "auto",
                  px: 1,
                }}
              >
                Clear all tags
              </Button>
            </Box>
          )}

          {tags.length === 0 && !newTagName && (
            <Typography variant="body2" sx={{ px: 1, py: 2, color: "text.secondary", textAlign: "center" }}>
              No tags yet. Create one above!
            </Typography>
          )}

          {showPriorityFilter && (
            <>
              <Divider sx={{ my: 2 }} />

              {/* Priority Filter Section */}
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                  mb: 1,
                }}
              >
                Priority
              </Typography>

              {filterablePriorities.map(level => {
                const IconComponent = level.icon ? iconMap[level.icon] : Flag;
                const isSelected = selectedPriorities.includes(level.value);

                return (
                  <MenuItem key={level.value} onClick={() => handlePriorityToggle(level.value)}>
                    <Checkbox checked={isSelected} size="small" />
                    <IconComponent fontSize="small" sx={{ color: level.color, mx: 1 }} />
                    <Typography variant="body2">{level.label}</Typography>
                  </MenuItem>
                );
              })}

              {/* Selected priorities display */}
              {selectedPriorities.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                    {selectedPriorities.map(priority => {
                      const level = PRIORITY_LEVELS.find(l => l.value === priority);
                      if (!level) return null;
                      const IconComponent = level.icon ? iconMap[level.icon] : Flag;
                      return (
                        <Chip
                          key={priority}
                          icon={<IconComponent fontSize="small" />}
                          label={level.label}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.7rem",
                            "& .MuiChip-deleteIcon": {
                              fontSize: "0.875rem",
                            },
                          }}
                          onDelete={() => onPriorityDeselect(priority)}
                        />
                      );
                    })}
                  </Stack>
                  <Button
                    size="small"
                    onClick={handleClearAllPriorities}
                    sx={{
                      mt: 0.5,
                      fontSize: "0.7rem",
                      minWidth: "auto",
                      px: 1,
                    }}
                  >
                    Clear all priorities
                  </Button>
                </Box>
              )}
            </>
          )}

          {showSort && (
            <>
              <Divider sx={{ my: 2 }} />

              {/* Sort Section */}
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.5,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                  mb: 1,
                }}
              >
                Sort
              </Typography>

              <MenuItem onClick={() => onSortToggle()}>
                <Checkbox checked={sortByPriority} size="small" />
                <Sort fontSize="small" sx={{ mx: 1 }} />
                <Typography variant="body2">Priority Sort</Typography>
              </MenuItem>
              <MenuItem onClick={() => onTagSortToggle()}>
                <Checkbox checked={sortByTag} size="small" />
                <Label fontSize="small" sx={{ mx: 1 }} />
                <Typography variant="body2">Tag Sort</Typography>
              </MenuItem>
            </>
          )}
        </Box>
      </Menu>
    </>
  );
};

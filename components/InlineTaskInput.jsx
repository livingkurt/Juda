"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TextField, Box, Menu, MenuItem, ListItemText, Stack, Button, Checkbox, InputAdornment } from "@mui/material";
import { Add, Search } from "@mui/icons-material";
import { TagChip } from "./TagChip";
import { useThemeColors } from "@/hooks/useThemeColors";

/**
 * Reusable inline task input component with tag selector
 * Opens tag selector menu after task creation
 */
export const InlineTaskInput = ({
  placeholder = "New task...",
  onCreate,
  initialTagIds = [],
  size = "small",
  variant = "standard",
  ...inputProps
}) => {
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  const { tagColors } = useThemeColors();
  // Note: Tags query would need to be passed as prop or use hook here
  const tags = []; // Placeholder - should use useGetTagsQuery() or pass as prop

  // Filter tags based on search query
  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const exactMatch = tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());
  const showAddNew = searchQuery.trim() && !exactMatch;

  // Focus search input when menu opens
  useEffect(() => {
    if (showTagMenu && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showTagMenu]);

  const handleClick = () => {
    setIsActive(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleCreateTask = useCallback(async () => {
    if (!value.trim() || createdTaskId !== null) {
      // Don't create if no value or already created
      setIsActive(false);
      return;
    }

    try {
      // Create the task
      const newTask = await onCreate(value.trim());

      if (newTask && newTask.id) {
        setCreatedTaskId(newTask.id);
        setSelectedTagIds(initialTagIds);
        setShowTagMenu(true);
        setMenuAnchor(inputRef.current);
        setValue("");
        setIsActive(false);
      } else {
        setIsActive(false);
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      setIsActive(false);
    }
  }, [value, onCreate, initialTagIds, createdTaskId]);

  const handleKeyDown = async e => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      await handleCreateTask();
    } else if (e.key === "Escape") {
      setValue("");
      setIsActive(false);
      setShowTagMenu(false);
      setMenuAnchor(null);
      inputRef.current?.blur();
    }
  };

  const handleToggleTag = tagId => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newTagIds);
  };

  const handleCreateAndAssignTag = async _colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      // Note: createTagMutation would need to be passed as prop or use hook here
      // const newTag = await createTagMutation({ name: searchQuery.trim(), color: canonicalColors[colorIndex] }).unwrap();
      // setSelectedTagIds([...selectedTagIds, newTag.id]);
      setSearchQuery("");
      setShowColorPicker(false);
      setSelectedColorIndex(0);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleApplyTags = async () => {
    if (createdTaskId && selectedTagIds.length >= 0) {
      try {
        // Note: updateTaskTagsMutation would need to be passed as prop or use hook here
        // await updateTaskTagsMutation({ taskId: createdTaskId, tagIds: selectedTagIds }).unwrap();
      } catch (err) {
        console.error("Failed to update task tags:", err);
      }
    }
    setShowTagMenu(false);
    setMenuAnchor(null);
    setCreatedTaskId(null);
    setSelectedTagIds([]);
    setSearchQuery("");
  };

  const handleCancelTags = () => {
    setShowTagMenu(false);
    setMenuAnchor(null);
    setCreatedTaskId(null);
    setSelectedTagIds([]);
    setSearchQuery("");
  };

  // Handle blur with proper check to prevent infinite loops
  const handleBlur = useCallback(
    e => {
      // Use a ref to track if we're currently creating to prevent loops
      if (createdTaskId !== null) {
        // Already created a task, don't create again
        return;
      }

      // Check if we're clicking into the menu
      const relatedTarget = e.relatedTarget;
      const isClickingMenu =
        relatedTarget?.closest('[role="menu"]') ||
        relatedTarget?.closest("[data-menu-content]") ||
        relatedTarget?.closest("[data-mui-menu-content]");

      // Only create task if menu is closed, we're not clicking into menu, and we have a value
      if (!isClickingMenu && !showTagMenu && value.trim() && createdTaskId === null) {
        handleCreateTask();
      }
    },
    [showTagMenu, value, handleCreateTask, createdTaskId]
  );

  return (
    <>
      <TextField
        inputRef={inputRef}
        fullWidth
        size={size}
        variant={variant}
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Add fontSize="small" sx={{ opacity: 0.5 }} />
            </InputAdornment>
          ),
          disableUnderline: variant === "standard" && !isActive,
          sx: {
            fontSize: size === "small" ? "0.875rem" : undefined,
            color: isActive ? "text.primary" : "text.secondary",
          },
        }}
        {...inputProps}
      />

      {/* Tag Selector Menu */}
      <Menu
        open={showTagMenu}
        anchorEl={menuAnchor}
        onClose={handleCancelTags}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        PaperProps={{
          sx: {
            minWidth: 280,
            maxHeight: 400,
            overflowY: "auto",
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <ListItemText
            primary="Select tags for task"
            primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }}
          />
        </Box>

        {/* Search bar */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Search fontSize="small" sx={{ color: "inherit", opacity: 0.7 }} />
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
              autoFocus
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              InputProps={{
                disableUnderline: true,
              }}
            />
          </Stack>
        </Box>

        {/* Add New button */}
        {showAddNew && !showColorPicker && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<Add fontSize="small" />}
              onClick={e => {
                e.stopPropagation();
                setShowColorPicker(true);
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              Add &quot;{searchQuery}&quot;
            </Button>
          </Box>
        )}

        {/* Color picker */}
        {showAddNew && showColorPicker && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Box sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary" }}>Choose a color:</Box>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center">
                {tagColors.map((themeColor, index) => (
                  <Button
                    key={index}
                    sx={{
                      minWidth: 32,
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      bgcolor: themeColor,
                      border: selectedColorIndex === index ? 2 : 0,
                      borderColor: "white",
                      boxShadow: selectedColorIndex === index ? `0 0 0 2px primary.main` : "none",
                      "&:hover": { transform: "scale(1.1)" },
                      transition: "transform 0.1s",
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleCreateAndAssignTag(index);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        )}

        {/* Tags list */}
        {filteredTags.length > 0 ? (
          <Box sx={{ py: 0.5 }}>
            {filteredTags.map(tag => (
              <MenuItem
                key={tag.id}
                onClick={e => {
                  e.stopPropagation();
                  handleToggleTag(tag.id);
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                <Checkbox checked={selectedTagIds.includes(tag.id)} size="small" sx={{ pointerEvents: "none" }} />
                <TagChip tag={tag} size="xs" />
              </MenuItem>
            ))}
          </Box>
        ) : !showAddNew ? (
          <Box sx={{ px: 2, py: 2 }}>
            <Box sx={{ fontSize: "0.875rem", color: "text.secondary", textAlign: "center" }}>No tags found</Box>
          </Box>
        ) : null}

        {/* Action buttons */}
        <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={handleCancelTags}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleApplyTags}>
              Apply
            </Button>
          </Stack>
        </Box>
      </Menu>
    </>
  );
};

export default InlineTaskInput;

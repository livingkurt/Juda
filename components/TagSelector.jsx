"use client";

import { useState, useRef, useEffect } from "react";
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
  Divider,
} from "@mui/material";
import { Label, Search, Settings } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { useTaskOperations } from "@/hooks/useTaskOperations";
import { useDialogState } from "@/hooks/useDialogState";
import { TagChip } from "./TagChip";

/**
 * TagSelector - For selecting tags with search and quick create
 *
 * Features:
 * - Search tags
 * - Select/deselect with checkboxes
 * - Quick create new tags when search doesn't match
 * - Color picker for new tags
 * - Optional "Manage Tags" button
 *
 * @param {Object} props
 * @param {string[]} props.selectedTagIds - Currently selected tag IDs
 * @param {Function} props.onSelectionChange - Callback when selection changes
 * @param {Object} props.task - Task object (for auto-save mode)
 * @param {boolean} props.autoSave - Auto-save changes to task
 * @param {boolean} props.showManageButton - Show "Manage Tags" button
 * @param {Element} props.anchorEl - Anchor element (controlled mode)
 * @param {boolean} props.open - Open state (controlled mode)
 * @param {Function} props.onClose - Close callback (controlled mode)
 * @param {boolean} props.asMenuItem - Render as MenuItem (for context menus)
 */
export const TagSelector = ({
  selectedTagIds: externalSelectedTagIds = [],
  onSelectionChange,
  task,
  autoSave = false,
  showManageButton = false,
  anchorEl: externalAnchorEl,
  open: externalOpen,
  onClose: externalOnClose,
  asMenuItem = false,
  filterMode = false,
  renderTrigger,
}) => {
  const theme = useTheme();
  const { tagColors, canonicalColors } = useThemeColors();
  const dialogState = useDialogState();
  const taskOps = useTaskOperations();
  const searchInputRef = useRef(null);

  // Fetch tags
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();

  // Derive selected tag IDs from task if in autoSave mode, otherwise use external prop
  const derivedSelectedTagIds =
    task && autoSave ? (Array.isArray(task.tags) ? task.tags.map(t => t.id) : []) : externalSelectedTagIds;

  // Internal state
  const [searchQuery, setSearchQuery] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [internalAnchorEl, setInternalAnchorEl] = useState(null);
  const [internalSelectedTagIds, setInternalSelectedTagIds] = useState(derivedSelectedTagIds);
  const [hasChanges, setHasChanges] = useState(false);

  // Controlled vs uncontrolled
  const isControlled = externalAnchorEl !== undefined;
  const anchorEl = isControlled ? externalAnchorEl : internalAnchorEl;
  const isOpen = isControlled ? externalOpen : Boolean(anchorEl);

  // Auto-focus search when menu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Sync with external selection when menu opens
  useEffect(() => {
    if (isOpen) {
      setInternalSelectedTagIds(derivedSelectedTagIds);
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filter tags based on search
  const filteredTags = tags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Check if search matches existing tag
  const exactMatch = tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase());
  const showCreateButton = searchQuery.trim() && !exactMatch;

  // Toggle tag selection
  const handleToggleTag = tagId => {
    const newTagIds = internalSelectedTagIds.includes(tagId)
      ? internalSelectedTagIds.filter(id => id !== tagId)
      : [...internalSelectedTagIds, tagId];

    setInternalSelectedTagIds(newTagIds);
    setHasChanges(true);

    // In filter mode, apply changes immediately
    if (filterMode && onSelectionChange) {
      onSelectionChange(newTagIds);
    }
  };

  // Create new tag with selected color
  const handleCreateTag = async colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      const newTag = await createTagMutation({
        name: searchQuery.trim(),
        color: canonicalColors[colorIndex],
      }).unwrap();

      // Auto-select the newly created tag
      const newTagIds = [...internalSelectedTagIds, newTag.id];
      setInternalSelectedTagIds(newTagIds);
      setHasChanges(true);

      // Reset UI
      setSearchQuery("");
      setShowColorPicker(false);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  // Open menu
  const handleMenuOpen = event => {
    if (!isControlled) {
      setInternalAnchorEl(event.currentTarget);
    }
  };

  // Close menu and save changes
  const handleMenuClose = () => {
    if (hasChanges) {
      if (autoSave && task) {
        // Auto-save to task
        taskOps.handleTaskTagsChange(task.id, internalSelectedTagIds);
      } else if (onSelectionChange) {
        // Call onChange callback
        onSelectionChange(internalSelectedTagIds);
      }
    }

    // Close menu
    if (!isControlled) {
      setInternalAnchorEl(null);
    }
    if (externalOnClose) {
      externalOnClose();
    }

    // Reset UI
    setSearchQuery("");
    setShowColorPicker(false);
    setHasChanges(false);
  };

  // Open tag management dialog
  const handleOpenManageDialog = () => {
    handleMenuClose();
    dialogState.setTagEditorOpen(true);
  };

  // Menu content
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
          maxHeight: "450px",
        },
      }}
    >
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
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
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
            onClick={e => {
              e.stopPropagation();
              setShowColorPicker(true);
            }}
            onMouseDown={e => e.stopPropagation()}
          >
            Create &quot;{searchQuery}&quot;
          </Button>
        </Box>
      )}

      {/* Color picker */}
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
                onClick={e => {
                  e.stopPropagation();
                  handleCreateTag(index);
                }}
                onMouseDown={e => e.stopPropagation()}
              />
            ))}
          </Stack>
        </Box>
      )}

      {showCreateButton && showColorPicker && <Divider />}

      {/* Tag list */}
      <Box sx={{ maxHeight: "300px", overflowY: "auto" }}>
        {filteredTags.length > 0 ? (
          filteredTags.map(tag => (
            <MenuItem
              key={tag.id}
              onClick={e => {
                e.stopPropagation();
                handleToggleTag(tag.id);
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <Checkbox
                checked={internalSelectedTagIds.includes(tag.id)}
                sx={{ mr: 1, pointerEvents: "none" }}
                size="medium"
              />
              <TagChip tag={tag} size="sm" />
            </MenuItem>
          ))
        ) : !showCreateButton ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No tags found
            </Typography>
          </Box>
        ) : null}
      </Box>

      {/* Manage Tags button */}
      {showManageButton && [
        <Divider key="divider-manage" />,
        <MenuItem key="manage-tags" onClick={handleOpenManageDialog}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>Manage Tags</ListItemText>
        </MenuItem>,
      ]}
    </Menu>
  );

  // Render as MenuItem (for context menus)
  if (asMenuItem) {
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

  // Render in filter mode (show selected tags as chips)
  if (filterMode) {
    const selectedTags = tags.filter(t => internalSelectedTagIds.includes(t.id));
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {selectedTags.map(tag => (
          <TagChip key={tag.id} tag={tag} size="sm" showClose onClose={handleToggleTag} />
        ))}
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
        </Button>
        {menuContent}
      </Stack>
    );
  }

  // Render with custom trigger if provided
  if (renderTrigger) {
    const customTrigger = renderTrigger(handleMenuOpen);

    // If renderTrigger returns null/undefined and no tags selected, show default button
    if (!customTrigger && derivedSelectedTagIds.length === 0) {
      return (
        <>
          <Button size="small" variant="text" onClick={handleMenuOpen} startIcon={<Label fontSize="small" />}>
            Add Tags
          </Button>
          {menuContent}
        </>
      );
    }

    return (
      <>
        {customTrigger}
        {menuContent}
      </>
    );
  }

  // Render as button (only show if no tags selected)
  if (derivedSelectedTagIds.length === 0) {
    return (
      <>
        <Button size="small" variant="text" onClick={handleMenuOpen} startIcon={<Label fontSize="small" />}>
          Add Tags
        </Button>
        {menuContent}
      </>
    );
  }

  // If tags are selected, don't show the button (tags are displayed elsewhere)
  return menuContent;
};

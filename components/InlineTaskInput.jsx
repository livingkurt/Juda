"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TextInput, Box, Menu, Group, Text, Checkbox, Button, Stack } from "@mantine/core";
import { Plus, Search } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useGetTagsQuery, useCreateTagMutation, useUpdateTaskTagsMutation } from "@/lib/store/api/tagsApi";
import { TagChip } from "./TagChip";

/**
 * Reusable inline task input component with tag selector
 * Opens tag selector menu after task creation
 */
export const InlineTaskInput = ({
  placeholder = "New task...",
  onCreate,
  initialTagIds = [],
  size = "sm",
  variant = "unstyled",
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

  const inputRef = useRef(null);
  const searchInputRef = useRef(null);

  const { mode, interactive } = useSemanticColors();
  const { tagColors, canonicalColors } = useThemeColors();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const [updateTaskTagsMutation] = useUpdateTaskTagsMutation();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const hoverBg = mode.bg.surfaceHover;
  const mutedText = mode.text.secondary;
  const textColor = mode.text.primary;

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
      inputRef.current?.blur();
    }
  };

  const handleToggleTag = tagId => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(newTagIds);
  };

  const handleCreateAndAssignTag = async colorIndex => {
    if (!searchQuery.trim()) return;

    try {
      const newTag = await createTagMutation({
        name: searchQuery.trim(),
        color: canonicalColors[colorIndex],
      }).unwrap();
      setSelectedTagIds([...selectedTagIds, newTag.id]);
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
        await updateTaskTagsMutation({ taskId: createdTaskId, tagIds: selectedTagIds }).unwrap();
      } catch (err) {
        console.error("Failed to update task tags:", err);
      }
    }
    setShowTagMenu(false);
    setCreatedTaskId(null);
    setSelectedTagIds([]);
    setSearchQuery("");
  };

  const handleCancelTags = () => {
    setShowTagMenu(false);
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
        relatedTarget?.closest("[data-mantine-menu-dropdown]");

      // Only create task if menu is closed, we're not clicking into menu, and we have a value
      if (!isClickingMenu && !showTagMenu && value.trim() && createdTaskId === null) {
        handleCreateTask();
      }
    },
    [showTagMenu, value, handleCreateTask, createdTaskId]
  );

  return (
    <>
      <TextInput
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        size={size}
        variant={variant === "unstyled" ? "unstyled" : "default"}
        style={{
          background: "transparent",
          borderWidth: variant === "unstyled" ? 0 : undefined,
          paddingLeft: variant === "unstyled" ? 8 : undefined,
          paddingRight: variant === "unstyled" ? 8 : undefined,
          paddingTop: variant === "unstyled" ? 4 : undefined,
          paddingBottom: variant === "unstyled" ? 4 : undefined,
          fontSize: size === "sm" ? "0.875rem" : undefined,
          color: isActive ? textColor : mutedText,
        }}
        styles={{
          input: {
            color: isActive ? textColor : mutedText,
            "&::placeholder": {
              color: mutedText,
            },
            "&:focus": {
              outline: "none",
              color: textColor,
              ...(variant === "unstyled" && {
                borderWidth: 0,
                borderColor: "transparent",
                boxShadow: "none",
              }),
            },
            "&:hover": {
              color: textColor,
            },
          },
        }}
        {...inputProps}
      />

      <Menu opened={showTagMenu} onClose={handleCancelTags}>
        {/* Tag Selector Menu */}
        <Menu.Dropdown
          data-menu-content
          bg={bgColor}
          style={{
            borderColor: borderColor,
            minWidth: "280px",
            maxHeight: "400px",
            overflowY: "auto",
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Header */}
          <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
            <Text size="sm" fw={600} c={textColor}>
              Select tags for task
            </Text>
          </Box>

          {/* Search bar */}
          <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
            <Group gap={8}>
              <Search size={14} style={{ color: mutedText }} />
              <TextInput
                ref={searchInputRef}
                size="sm"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowColorPicker(false);
                }}
                variant="unstyled"
                autoFocus
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                style={{ flex: 1 }}
              />
            </Group>
          </Box>

          {/* Add New button */}
          {showAddNew && !showColorPicker && (
            <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
              <Button
                size="sm"
                variant="outline"
                color="blue"
                w="100%"
                onClick={e => {
                  e.stopPropagation();
                  setShowColorPicker(true);
                }}
                onMouseDown={e => e.stopPropagation()}
                leftSection={<Plus size={14} />}
              >
                Add &quot;{searchQuery}&quot;
              </Button>
            </Box>
          )}

          {/* Color picker */}
          {showAddNew && showColorPicker && (
            <Box px={12} py={8} style={{ borderBottom: `1px solid ${borderColor}` }}>
              <Stack gap={8}>
                <Text size="xs" fw={600} c={mutedText}>
                  Choose a color:
                </Text>
                <Group gap={4} justify="center" wrap="wrap">
                  {tagColors.map((themeColor, index) => (
                    <Button
                      key={index}
                      w={32}
                      h={32}
                      style={{
                        minWidth: 32,
                        borderRadius: "0.375rem",
                        background: themeColor,
                        border: selectedColorIndex === index ? `2px solid white` : "0px",
                        boxShadow: selectedColorIndex === index ? `0 0 0 2px ${interactive.primary}` : "none",
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        handleCreateAndAssignTag(index);
                      }}
                      onMouseDown={e => e.stopPropagation()}
                    />
                  ))}
                </Group>
              </Stack>
            </Box>
          )}

          {/* Tags list */}
          {filteredTags.length > 0 ? (
            <Box py={4}>
              {filteredTags.map(tag => (
                <Menu.Item
                  key={tag.id}
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleTag(tag.id);
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    backgroundColor: hoverBg,
                    cursor: "pointer",
                  }}
                >
                  <Group justify="space-between" w="100%" gap={12}>
                    <Group gap={8} style={{ flex: 1, minWidth: 0 }}>
                      <Checkbox checked={selectedTagIds.includes(tag.id)} size="sm" pointerEvents="none" />
                      <TagChip tag={tag} size="xs" />
                    </Group>
                  </Group>
                </Menu.Item>
              ))}
            </Box>
          ) : !showAddNew ? (
            <Box px={12} py={16}>
              <Text size="sm" c={mutedText} style={{ textAlign: "center" }}>
                No tags found
              </Text>
            </Box>
          ) : null}

          {/* Action buttons */}
          <Box px={12} py={8} style={{ borderTop: `1px solid ${borderColor}` }}>
            <Group gap={8} justify="flex-end">
              <Button size="sm" variant="subtle" onClick={handleCancelTags}>
                Cancel
              </Button>
              <Button size="sm" color="blue" onClick={handleApplyTags}>
                Apply
              </Button>
            </Group>
          </Box>
        </Menu.Dropdown>
      </Menu>
    </>
  );
};

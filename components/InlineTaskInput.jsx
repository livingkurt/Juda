"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input, Box, Menu, Portal, HStack, Text, Checkbox, Button, VStack } from "@chakra-ui/react";
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
        relatedTarget?.closest("[data-chakra-menu-content]");

      // Only create task if menu is closed, we're not clicking into menu, and we have a value
      if (!isClickingMenu && !showTagMenu && value.trim() && createdTaskId === null) {
        handleCreateTask();
      }
    },
    [showTagMenu, value, handleCreateTask, createdTaskId]
  );

  return (
    <>
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        placeholder={placeholder}
        size={size}
        variant={variant}
        bg="transparent"
        borderWidth={variant === "unstyled" ? "0px" : undefined}
        px={variant === "unstyled" ? 2 : undefined}
        py={variant === "unstyled" ? 1 : undefined}
        fontSize={size === "sm" ? "sm" : undefined}
        color={isActive ? textColor : mutedText}
        _focus={{
          outline: "none",
          color: textColor,
          ...(variant === "unstyled" && {
            borderWidth: "0px",
            borderColor: "transparent",
            boxShadow: "none",
          }),
        }}
        _focusVisible={{
          outline: "none",
          ...(variant === "unstyled" && {
            borderWidth: "0px",
            borderColor: "transparent",
            boxShadow: "none",
          }),
        }}
        _placeholder={{ color: mutedText }}
        _hover={{
          color: textColor,
        }}
        {...inputProps}
      />

      <Menu.Root open={showTagMenu} onOpenChange={({ open }) => !open && handleCancelTags()}>
        {/* Tag Selector Menu */}
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              data-menu-content
              bg={bgColor}
              borderColor={borderColor}
              minW="280px"
              maxH="400px"
              overflowY="auto"
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Header */}
              <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  Select tags for task
                </Text>
              </Box>

              {/* Search bar */}
              <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                <HStack spacing={2}>
                  <Box as="span" color={mutedText}>
                    <Search size={14} />
                  </Box>
                  <Input
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
                  />
                </HStack>
              </Box>

              {/* Add New button */}
              {showAddNew && !showColorPicker && (
                <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="blue"
                    w="full"
                    onClick={e => {
                      e.stopPropagation();
                      setShowColorPicker(true);
                    }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <Plus size={14} />
                    <Text ml={1}>Add &quot;{searchQuery}&quot;</Text>
                  </Button>
                </Box>
              )}

              {/* Color picker */}
              {showAddNew && showColorPicker && (
                <Box px={3} py={2} borderBottomWidth="1px" borderColor={borderColor}>
                  <VStack spacing={2} align="stretch">
                    <Text fontSize="xs" fontWeight="semibold" color={mutedText}>
                      Choose a color:
                    </Text>
                    <HStack spacing={1} flexWrap="wrap" justify="center">
                      {tagColors.map((themeColor, index) => (
                        <Button
                          key={index}
                          w={8}
                          h={8}
                          minW={8}
                          borderRadius="md"
                          bg={themeColor}
                          onClick={e => {
                            e.stopPropagation();
                            handleCreateAndAssignTag(index);
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          borderWidth={selectedColorIndex === index ? "2px" : "0px"}
                          borderColor="white"
                          boxShadow={selectedColorIndex === index ? `0 0 0 2px ${interactive.primary}` : "none"}
                          _hover={{ transform: "scale(1.1)" }}
                          transition="transform 0.1s"
                        />
                      ))}
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Tags list */}
              {filteredTags.length > 0 ? (
                <Box py={1}>
                  {filteredTags.map(tag => (
                    <Menu.Item
                      key={tag.id}
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleTag(tag.id);
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      _hover={{ bg: hoverBg }}
                      cursor="pointer"
                    >
                      <HStack justify="space-between" w="full" spacing={3}>
                        <HStack spacing={2} flex={1} minW={0}>
                          <Checkbox.Root checked={selectedTagIds.includes(tag.id)} size="sm" pointerEvents="none">
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                            <Checkbox.Indicator />
                          </Checkbox.Root>
                          <TagChip tag={tag} size="xs" />
                        </HStack>
                      </HStack>
                    </Menu.Item>
                  ))}
                </Box>
              ) : !showAddNew ? (
                <Box px={3} py={4}>
                  <Text fontSize="sm" color={mutedText} textAlign="center">
                    No tags found
                  </Text>
                </Box>
              ) : null}

              {/* Action buttons */}
              <Box px={3} py={2} borderTopWidth="1px" borderColor={borderColor}>
                <HStack spacing={2} justify="flex-end">
                  <Button size="sm" variant="ghost" onClick={handleCancelTags}>
                    Cancel
                  </Button>
                  <Button size="sm" colorPalette="blue" onClick={handleApplyTags}>
                    Apply
                  </Button>
                </HStack>
              </Box>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </>
  );
};

"use client";

import { useCallback, useMemo } from "react";
import { Box, Typography, IconButton, List, ListItemButton, Collapse, Divider } from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Sort,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
} from "@mui/icons-material";
import { useTheme } from "@/hooks/useTheme";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { mapColorToTheme } from "@/lib/themes";
import { PRIORITY_LEVELS } from "@/lib/constants";

// Special identifier for untagged items
export const UNTAGGED_ID = "__UNTAGGED__";

const iconMap = {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Remove,
  PriorityHigh,
};

export const BacklogTagSidebar = ({
  tags = [],
  selectedTagIds = [],
  onTagSelect,
  onTagDeselect,
  isOpen,
  onToggle,
  selectedPriorities = [],
  onPrioritySelect,
  onPriorityDeselect,
  sortByPriority = false,
  onSortToggle,
}) => {
  const { theme } = useTheme();
  const { colorMode } = useColorModeSync();

  // Filter priorities to exclude null (None)
  const filterablePriorities = useMemo(() => {
    return PRIORITY_LEVELS.filter(level => level.value !== null);
  }, []);

  // Calculate sidebar width based on longest item name (tags, priorities, "Untagged", "Priority Sort")
  const sidebarWidth = useMemo(() => {
    if (!isOpen) return 40; // Collapsed width
    const tagLengths = tags.map(t => t.name.length);
    const priorityLengths = filterablePriorities.map(p => p.label.length);
    const maxLength = Math.max(...tagLengths, ...priorityLengths, "Untagged".length, "Priority Sort".length, 0);
    const minWidth = 80;
    const maxWidth = 250;
    // Account for: left padding (8px) + icon/dot (12px) + spacing (8px) + text + right padding (8px)
    // Use ~7px per character for "sm" font size to be safe
    const textWidth = maxLength * 7;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 60));
    return calculatedWidth;
  }, [tags, filterablePriorities, isOpen]);

  const handleTagClick = useCallback(
    tagId => {
      const isSelected = selectedTagIds.includes(tagId);

      if (isSelected) {
        // Toggle off - remove from selection
        onTagDeselect(tagId);
      } else {
        // Toggle on - add to selection
        onTagSelect(tagId);
      }
    },
    [selectedTagIds, onTagSelect, onTagDeselect]
  );

  const handlePriorityClick = useCallback(
    priority => {
      const isSelected = selectedPriorities.includes(priority);

      if (isSelected) {
        // Toggle off - remove from selection
        onPriorityDeselect(priority);
      } else {
        // Toggle on - add to selection
        onPrioritySelect(priority);
      }
    },
    [selectedPriorities, onPrioritySelect, onPriorityDeselect]
  );

  // Map tag colors to theme
  const modeForTheme = colorMode || "dark";
  const themePalette = theme?.colors?.[modeForTheme]?.tagColors || {};

  return (
    <Box
      sx={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        height: "100%",
        borderRight: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        position: "relative",
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Toggle Button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={onToggle}
        role="button"
        aria-label={isOpen ? "Collapse tag sidebar" : "Expand tag sidebar"}
      >
        <IconButton size="small" aria-label={isOpen ? "Collapse" : "Expand"}>
          {isOpen ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
        </IconButton>
      </Box>

      {/* Tag List with Collapse Animation */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <List dense sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 0.5, px: isOpen ? 1 : 0.5 }}>
          {/* Untagged option */}
          <ListItemButton
            selected={selectedTagIds.includes(UNTAGGED_ID)}
            onClick={() => handleTagClick(UNTAGGED_ID)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              px: isOpen ? 1 : 0.5,
              py: 0.75,
            }}
            title={isOpen ? undefined : "Untagged"}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: "transparent",
                borderWidth: 1.5,
                borderStyle: "solid",
                borderColor: selectedTagIds.includes(UNTAGGED_ID) ? "text.primary" : "text.secondary",
                borderRadius: "50%",
                flexShrink: 0,
                mr: isOpen ? 1 : 0.5,
              }}
            />
            <Collapse orientation="horizontal" in={isOpen} timeout={400}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "0.875rem",
                  fontWeight: selectedTagIds.includes(UNTAGGED_ID) ? 600 : 400,
                  color: selectedTagIds.includes(UNTAGGED_ID) ? "text.primary" : "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                Untagged
              </Typography>
            </Collapse>
          </ListItemButton>

          {tags.length === 0 ? (
            <Collapse orientation="horizontal" in={isOpen} timeout={400}>
              <Box sx={{ px: 1, py: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
                  No tags
                </Typography>
              </Box>
            </Collapse>
          ) : (
            tags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              const displayColor = mapColorToTheme(tag.color, themePalette) || tag.color;

              return (
                <ListItemButton
                  key={tag.id}
                  selected={isSelected}
                  onClick={() => handleTagClick(tag.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    px: isOpen ? 1 : 0.5,
                    py: 0.75,
                  }}
                  title={isOpen ? undefined : tag.name}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: displayColor,
                      flexShrink: 0,
                      mr: isOpen ? 1 : 0.5,
                    }}
                  />
                  <Collapse orientation="horizontal" in={isOpen} timeout={400}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "text.primary" : "text.secondary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {tag.name}
                    </Typography>
                  </Collapse>
                </ListItemButton>
              );
            })
          )}

          {/* Priority Section */}
          {filterablePriorities.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              {filterablePriorities.map(level => {
                const IconComponent = level.icon ? iconMap[level.icon] : null;
                const isSelected = selectedPriorities.includes(level.value);

                return (
                  <ListItemButton
                    key={level.value}
                    selected={isSelected}
                    onClick={() => handlePriorityClick(level.value)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      px: isOpen ? 1 : 0.5,
                      py: 0.75,
                    }}
                    title={isOpen ? undefined : level.label}
                  >
                    {IconComponent ? (
                      <IconComponent
                        fontSize="small"
                        sx={{
                          color: level.color,
                          flexShrink: 0,
                          mr: isOpen ? 1 : 0.5,
                          width: 12,
                          height: 12,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: level.color,
                          flexShrink: 0,
                          mr: isOpen ? 1 : 0.5,
                        }}
                      />
                    )}
                    <Collapse orientation="horizontal" in={isOpen} timeout={400}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.875rem",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "text.primary" : "text.secondary",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {level.label}
                      </Typography>
                    </Collapse>
                  </ListItemButton>
                );
              })}
            </>
          )}

          {/* Priority Sort Toggle */}
          {onSortToggle && (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItemButton
                selected={sortByPriority}
                onClick={onSortToggle}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  px: isOpen ? 1 : 0.5,
                  py: 0.75,
                }}
                title={isOpen ? undefined : "Priority Sort"}
              >
                <Sort
                  fontSize="small"
                  sx={{
                    flexShrink: 0,
                    mr: isOpen ? 1 : 0.5,
                    width: 12,
                    height: 12,
                    color: sortByPriority ? "primary.main" : "text.secondary",
                  }}
                />
                <Collapse orientation="horizontal" in={isOpen} timeout={400}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: sortByPriority ? 600 : 400,
                      color: sortByPriority ? "text.primary" : "text.secondary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    Priority Sort
                  </Typography>
                </Collapse>
              </ListItemButton>
            </>
          )}
        </List>
      </Box>
    </Box>
  );
};

export default BacklogTagSidebar;

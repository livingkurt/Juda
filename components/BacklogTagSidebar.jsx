"use client";

import { useCallback, useMemo } from "react";
import { Box, Typography, IconButton, List, ListItemButton } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useTheme } from "@/hooks/useTheme";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { mapColorToTheme } from "@/lib/themes";

// Special identifier for untagged items
export const UNTAGGED_ID = "__UNTAGGED__";

export const BacklogTagSidebar = ({ tags = [], selectedTagIds = [], onTagSelect, onTagDeselect, isOpen, onToggle }) => {
  const { theme } = useTheme();
  const { colorMode } = useColorModeSync();

  // Calculate sidebar width based on longest tag name (including "Untagged")
  const sidebarWidth = useMemo(() => {
    if (!isOpen) return 40; // Collapsed width
    const tagLengths = tags.map(t => t.name.length);
    const maxTagLength = Math.max(...tagLengths, "Untagged".length, 0);
    const minWidth = 80;
    const maxWidth = 250;
    // Account for: left padding (8px) + dot (12px) + spacing (8px) + text + right padding (8px)
    // Use ~7px per character for "sm" font size to be safe
    const textWidth = maxTagLength * 7;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 60));
    return calculatedWidth;
  }, [tags, isOpen]);

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
        transition: "width 0.2s ease-in-out",
        flexShrink: 0,
        position: "relative",
        bgcolor: "background.paper",
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

      {/* Tag List */}
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
              borderRadius: "50%",
              bgcolor: "transparent",
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: selectedTagIds.includes(UNTAGGED_ID) ? "text.primary" : "text.secondary",
              flexShrink: 0,
              mr: isOpen ? 1 : 0,
            }}
          />
          {isOpen && (
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
          )}
        </ListItemButton>

        {tags.length === 0 ? (
          <Box sx={{ px: 1, py: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
              {isOpen ? "No tags" : ""}
            </Typography>
          </Box>
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
                    mr: isOpen ? 1 : 0,
                  }}
                />
                {isOpen && (
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
                )}
              </ListItemButton>
            );
          })
        )}
      </List>
    </Box>
  );
};

export default BacklogTagSidebar;

"use client";

import { useCallback, useMemo } from "react";
import { Box, Stack, Group, Text, ActionIcon, Flex } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTheme } from "@/hooks/useTheme";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { mapColorToTheme } from "@/lib/themes";

// Special identifier for untagged items
export const UNTAGGED_ID = "__UNTAGGED__";

export const BacklogTagSidebar = ({ tags = [], selectedTagIds = [], onTagSelect, onTagDeselect, isOpen, onToggle }) => {
  const { mode } = useSemanticColors();
  const { theme } = useTheme();
  const { colorMode } = useColorModeSync();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
  const hoverBg = mode.bg.surfaceHover;
  const activeBg = mode.bg.surfaceActive || hoverBg;

  // Calculate sidebar width based on longest tag name (including "Untagged")
  const sidebarWidth = useMemo(() => {
    if (!isOpen) return "40px"; // Collapsed width
    const tagLengths = tags.map(t => t.name.length);
    const maxTagLength = Math.max(...tagLengths, "Untagged".length, 0);
    const minWidth = 80;
    const maxWidth = 250;
    // Account for: left padding (8px) + dot (12px) + spacing (8px) + text + right padding (8px)
    // Use ~7px per character for "sm" font size to be safe
    const textWidth = maxTagLength * 7;
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + 60));
    return `${calculatedWidth}px`;
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
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
        height: "100%",
        background: bgColor,
        borderRight: `1px solid ${borderColor}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease-in-out",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Toggle Button */}
      <Flex
        justify="center"
        align="center"
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          borderBottom: `1px solid ${borderColor}`,
          cursor: "pointer",
        }}
        onClick={onToggle}
        role="button"
        aria-label={isOpen ? "Collapse tag sidebar" : "Expand tag sidebar"}
        onMouseEnter={e => {
          const target = e.currentTarget;
          target.style.backgroundColor = hoverBg;
        }}
        onMouseLeave={e => {
          const target = e.currentTarget;
          target.style.backgroundColor = "transparent";
        }}
      >
        <ActionIcon
          size="xs"
          variant="subtle"
          aria-label={isOpen ? "Collapse" : "Expand"}
          c={mutedText}
          style={{
            backgroundColor: "transparent",
            color: mutedText,
          }}
          onMouseEnter={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = "transparent";
            target.style.color = textColor;
          }}
          onMouseLeave={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = "transparent";
            target.style.color = mutedText;
          }}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </ActionIcon>
      </Flex>

      {/* Tag List */}
      <Stack
        gap={0}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: isOpen ? 8 : 4,
          paddingRight: isOpen ? 8 : 4,
        }}
      >
        {/* Untagged option */}
        <Box
          style={{
            paddingLeft: isOpen ? 8 : 4,
            paddingRight: isOpen ? 8 : 4,
            paddingTop: 6,
            paddingBottom: 6,
            cursor: "pointer",
            background: selectedTagIds.includes(UNTAGGED_ID) ? activeBg : "transparent",
            borderRadius: "0.375rem",
            transition: "background-color 0.15s",
          }}
          onClick={() => handleTagClick(UNTAGGED_ID)}
          title={isOpen ? undefined : "Untagged"}
          onMouseEnter={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = selectedTagIds.includes(UNTAGGED_ID) ? activeBg : hoverBg;
          }}
          onMouseLeave={e => {
            const target = e.currentTarget;
            target.style.backgroundColor = selectedTagIds.includes(UNTAGGED_ID) ? activeBg : "transparent";
          }}
        >
          <Group gap={isOpen ? 8 : 0} justify={isOpen ? "flex-start" : "center"}>
            <Box
              w={12}
              h={12}
              style={{
                borderRadius: "50%",
                background: "transparent",
                border: `1.5px solid ${selectedTagIds.includes(UNTAGGED_ID) ? textColor : mutedText}`,
                flexShrink: 0,
              }}
            />
            {isOpen && (
              <Text
                size="sm"
                fw={selectedTagIds.includes(UNTAGGED_ID) ? 600 : 400}
                c={selectedTagIds.includes(UNTAGGED_ID) ? textColor : mutedText}
                truncate="end"
                style={{ flex: 1, minWidth: 0 }}
              >
                Untagged
              </Text>
            )}
          </Group>
        </Box>

        {tags.length === 0 ? (
          <Text
            size="xs"
            c={mutedText}
            style={{
              textAlign: "center",
              paddingTop: 16,
              paddingBottom: 16,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            {isOpen ? "No tags" : ""}
          </Text>
        ) : (
          tags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            const displayColor = mapColorToTheme(tag.color, themePalette) || tag.color;

            return (
              <Box
                key={tag.id}
                style={{
                  paddingLeft: isOpen ? 8 : 4,
                  paddingRight: isOpen ? 8 : 4,
                  paddingTop: 6,
                  paddingBottom: 6,
                  cursor: "pointer",
                  background: isSelected ? activeBg : "transparent",
                  borderRadius: "0.375rem",
                  transition: "background-color 0.15s",
                }}
                onClick={() => handleTagClick(tag.id)}
                title={isOpen ? undefined : tag.name}
                onMouseEnter={e => {
                  const target = e.currentTarget;
                  target.style.backgroundColor = isSelected ? activeBg : hoverBg;
                }}
                onMouseLeave={e => {
                  const target = e.currentTarget;
                  target.style.backgroundColor = isSelected ? activeBg : "transparent";
                }}
              >
                <Group gap={isOpen ? 8 : 0} justify={isOpen ? "flex-start" : "center"}>
                  <Box w={12} h={12} style={{ borderRadius: "50%", background: displayColor, flexShrink: 0 }} />
                  {isOpen && (
                    <Text
                      size="sm"
                      fw={isSelected ? 600 : 400}
                      c={isSelected ? textColor : mutedText}
                      truncate="end"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      {tag.name}
                    </Text>
                  )}
                </Group>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
};

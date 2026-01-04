"use client";

import { useCallback, useMemo } from "react";
import { Box, VStack, HStack, Text, IconButton, Flex } from "@chakra-ui/react";
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
      w={sidebarWidth}
      minW={sidebarWidth}
      maxW={sidebarWidth}
      h="100%"
      bg={bgColor}
      borderRightWidth="1px"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      transition="width 0.2s ease-in-out"
      flexShrink={0}
      position="relative"
    >
      {/* Toggle Button */}
      <Flex
        justify="center"
        align="center"
        py={2}
        borderBottomWidth="1px"
        borderColor={borderColor}
        cursor="pointer"
        _hover={{ bg: hoverBg }}
        onClick={onToggle}
        role="button"
        aria-label={isOpen ? "Collapse tag sidebar" : "Expand tag sidebar"}
      >
        <IconButton
          size="xs"
          variant="ghost"
          aria-label={isOpen ? "Collapse" : "Expand"}
          color={mutedText}
          _hover={{ bg: "transparent", color: textColor }}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </IconButton>
      </Flex>

      {/* Tag List */}
      <VStack align="stretch" spacing={0} flex={1} overflowY="auto" overflowX="hidden" py={1} px={isOpen ? 2 : 1}>
        {/* Untagged option */}
        <Box
          px={isOpen ? 2 : 1}
          py={1.5}
          cursor="pointer"
          bg={selectedTagIds.includes(UNTAGGED_ID) ? activeBg : "transparent"}
          _hover={{ bg: selectedTagIds.includes(UNTAGGED_ID) ? activeBg : hoverBg }}
          onClick={() => handleTagClick(UNTAGGED_ID)}
          borderRadius="md"
          transition="background-color 0.15s"
          title={isOpen ? undefined : "Untagged"}
        >
          <HStack spacing={isOpen ? 2 : 0} justify={isOpen ? "flex-start" : "center"}>
            <Box
              w={"12px"}
              h={"12px"}
              borderRadius="full"
              bg="transparent"
              borderWidth="1.5px"
              borderColor={selectedTagIds.includes(UNTAGGED_ID) ? textColor : mutedText}
              flexShrink={0}
            />
            {isOpen && (
              <Text
                fontSize="sm"
                fontWeight={selectedTagIds.includes(UNTAGGED_ID) ? "semibold" : "normal"}
                color={selectedTagIds.includes(UNTAGGED_ID) ? textColor : mutedText}
                noOfLines={1}
                flex={1}
                minW={0}
              >
                Untagged
              </Text>
            )}
          </HStack>
        </Box>

        {tags.length === 0 ? (
          <Text fontSize="xs" color={mutedText} textAlign="center" py={4} px={2}>
            {isOpen ? "No tags" : ""}
          </Text>
        ) : (
          tags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id);
            const displayColor = mapColorToTheme(tag.color, themePalette) || tag.color;

            return (
              <Box
                key={tag.id}
                px={isOpen ? 2 : 1}
                py={1.5}
                cursor="pointer"
                bg={isSelected ? activeBg : "transparent"}
                _hover={{ bg: isSelected ? activeBg : hoverBg }}
                onClick={() => handleTagClick(tag.id)}
                borderRadius="md"
                transition="background-color 0.15s"
                title={isOpen ? undefined : tag.name}
              >
                <HStack spacing={isOpen ? 2 : 0} justify={isOpen ? "flex-start" : "center"}>
                  <Box w={"12px"} h={"12px"} borderRadius="full" bg={displayColor} flexShrink={0} />
                  {isOpen && (
                    <Text
                      fontSize="sm"
                      fontWeight={isSelected ? "semibold" : "normal"}
                      color={isSelected ? textColor : mutedText}
                      noOfLines={1}
                      flex={1}
                      minW={0}
                    >
                      {tag.name}
                    </Text>
                  )}
                </HStack>
              </Box>
            );
          })
        )}
      </VStack>
    </Box>
  );
};

"use client";

import { Box, HStack, Text, Portal, IconButton, Menu } from "@chakra-ui/react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * Theme selector dropdown component
 * Allows users to choose from available color themes
 */
export function ThemeSelector() {
  const { themeId, setTheme, themes } = useTheme();
  const { colorMode } = useColorModeSync();
  const { bg, text, border } = useSemanticColors();

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton
          variant="ghost"
          size={{ base: "xs", md: "md" }}
          aria-label="Select theme"
          minW={{ base: "28px", md: "40px" }}
          h={{ base: "28px", md: "40px" }}
          p={{ base: 0, md: 2 }}
        >
          <Box as="span" color="currentColor">
            <Palette size={16} stroke="currentColor" />
          </Box>
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content bg={bg.surface} borderColor={border.default} minW="180px">
            {themes.map(theme => {
              const isSelected = themeId === theme.id;
              const themeColors = theme.colors[colorMode];

              return (
                <Menu.Item
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  bg={isSelected ? bg.surfaceHover : "transparent"}
                  _hover={{ bg: bg.surfaceHover }}
                >
                  <HStack justify="space-between" w="full">
                    <HStack spacing={2}>
                      {/* Color swatch preview */}
                      <HStack spacing={0.5}>
                        <Box
                          w={3}
                          h={3}
                          borderRadius="sm"
                          bg={themeColors.primary}
                          borderWidth="1px"
                          borderColor={border.default}
                        />
                        <Box
                          w={3}
                          h={3}
                          borderRadius="sm"
                          bg={themeColors.accent}
                          borderWidth="1px"
                          borderColor={border.default}
                        />
                      </HStack>
                      <Text fontSize="sm">{theme.name}</Text>
                    </HStack>
                    {isSelected && (
                      <Box as="span" color={text.primary}>
                        <Check size={14} />
                      </Box>
                    )}
                  </HStack>
                </Menu.Item>
              );
            })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

"use client";

import { Box, Group, Text, ActionIcon, Menu } from "@mantine/core";
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
    <Menu>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size={["xs", "md"]}
          aria-label="Select theme"
          style={{
            minWidth: "28px",
            height: "28px",
            padding: 0,
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
        >
          <Palette size={16} stroke="currentColor" />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown bg={bg.surface} style={{ borderColor: border.default, minWidth: "180px" }}>
        {themes.map(theme => {
          const isSelected = themeId === theme.id;
          const themeColors = theme.colors[colorMode];

          return (
            <Menu.Item
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              bg={isSelected ? bg.surfaceHover : "transparent"}
              style={{
                backgroundColor: isSelected ? bg.surfaceHover : "transparent",
              }}
            >
              <Group justify="space-between" w="100%">
                <Group gap={8}>
                  {/* Color swatch preview */}
                  <Group gap={2}>
                    <Box
                      w={12}
                      h={12}
                      style={{
                        borderRadius: "0.125rem",
                        background: themeColors.primary,
                        border: `1px solid ${border.default}`,
                      }}
                    />
                    <Box
                      w={12}
                      h={12}
                      style={{
                        borderRadius: "0.125rem",
                        background: themeColors.accent,
                        border: `1px solid ${border.default}`,
                      }}
                    />
                  </Group>
                  <Text size="sm">{theme.name}</Text>
                </Group>
                {isSelected && <Check size={14} style={{ color: text.primary }} />}
              </Group>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

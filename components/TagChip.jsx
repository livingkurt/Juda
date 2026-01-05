"use client";

import { memo } from "react";
import { Badge, CloseButton } from "@mantine/core";
import { useTheme } from "@/hooks/useTheme";
import { useColorModeSync } from "@/hooks/useColorModeSync";
import { mapColorToTheme } from "@/lib/themes";

/**
 * Reusable TagChip component for displaying tags consistently across the app
 * Automatically maps stored tag colors to the current theme's palette
 *
 * @param {Object} tag - Tag object with {id, name, color}
 * @param {string | string[]} size - Size variant: "xs" | "sm" | "md" | "lg" | ["xs", "sm"] (Mantine responsive array)
 * @param {boolean} showClose - Whether to show a close button
 * @param {Function} onClose - Callback when close button is clicked
 * @param {Object} props - Additional props to pass to Badge
 */
export const TagChip = memo(function TagChip({ tag, size = "sm", showClose = false, onClose, ...props }) {
  const { theme } = useTheme();
  const { colorMode } = useColorModeSync();

  // Map the stored tag color to the current theme's palette
  const mode = colorMode || "dark";
  const themePalette = theme.colors[mode].tagColors;
  const displayColor = mapColorToTheme(tag.color, themePalette);

  // Handle responsive size objects
  const getSizeValue = (sizeObj, key) => {
    if (typeof sizeObj === "string") return sizeObj;
    return sizeObj[key] || sizeObj.base || "sm";
  };

  // Determine actual size
  const actualSize = typeof size === "object" ? getSizeValue(size, "base") : size;

  // Size mappings for fontSize and padding
  const sizeConfig = {
    xs: { fz: "0.625rem", py: 2, px: 6 },
    sm: { fz: "0.75rem", py: 4, px: 10 },
    md: { fz: "0.875rem", py: 6, px: 12 },
  };

  const config = sizeConfig[actualSize] || sizeConfig.sm;

  return (
    <Badge
      size={size}
      radius="xl"
      bg={displayColor}
      c="white"
      style={{
        textTransform: "uppercase",
        fontSize: config.fz,
        fontWeight: "bold",
        paddingTop: config.py,
        paddingBottom: config.py,
        paddingLeft: config.px,
        paddingRight: config.px,
      }}
      {...props}
    >
      {tag.name}
      {showClose && onClose && (
        <CloseButton size="xs" onClick={() => onClose(tag.id)} style={{ marginLeft: 4 }} aria-label="Remove tag" />
      )}
    </Badge>
  );
});

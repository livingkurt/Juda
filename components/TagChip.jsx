"use client";

import { memo } from "react";
import { Chip } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Reusable TagChip component for displaying tags consistently across the app
 * Automatically maps stored tag colors to the current theme's palette
 *
 * @param {Object} tag - Tag object with {id, name, color}
 * @param {string} size - Size variant: "xs" | "sm" | "md" | "lg"
 * @param {boolean} showClose - Whether to show a close button
 * @param {Function} onClose - Callback when close button is clicked
 * @param {Object} props - Additional props to pass to Chip
 */
export const TagChip = memo(function TagChip({ tag, size = "sm", showClose = false, onClose, ...props }) {
  const theme = useTheme();

  // Use the tag color directly, or map to theme palette if needed
  const displayColor = tag.color || theme.palette.primary.main;

  // Determine text color based on background luminance
  const getTextColor = hex => {
    if (!hex || hex.length < 7) return "white";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? "#333" : "white";
  };
  const textColor = getTextColor(displayColor);

  // Map size to MUI size prop
  const muiSize = size === "xs" ? "small" : size === "sm" ? "small" : size === "md" ? "medium" : "medium";

  return (
    <Chip
      label={tag.name}
      size={muiSize}
      onDelete={showClose && onClose ? () => onClose(tag.id) : undefined}
      sx={{
        bgcolor: displayColor,
        color: textColor,
        textTransform: "uppercase",
        fontWeight: "bold",
        borderRadius: "9999px",
        height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
        "& .MuiChip-label": {
          fontSize: size === "xs" ? "0.625rem" : size === "sm" ? "0.75rem" : "0.875rem",
          px: size === "xs" ? 0.75 : size === "sm" ? 1 : 1.25,
          whiteSpace: "nowrap",
        },
      }}
      {...props}
    />
  );
});

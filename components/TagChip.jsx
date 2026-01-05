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

  // Map size to MUI size prop
  const muiSize = size === "xs" ? "small" : size === "sm" ? "small" : size === "md" ? "medium" : "medium";

  return (
    <Chip
      label={tag.name}
      size={muiSize}
      onDelete={showClose && onClose ? () => onClose(tag.id) : undefined}
      sx={{
        bgcolor: displayColor,
        color: "white",
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

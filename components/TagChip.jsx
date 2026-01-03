"use client";

import { memo } from "react";
import { Tag } from "@chakra-ui/react";

/**
 * Reusable TagChip component for displaying tags consistently across the app
 * @param {Object} tag - Tag object with {id, name, color}
 * @param {string} size - Size variant: "xs" | "sm" | "md" | "lg" | {base: "xs", md: "sm"}
 * @param {boolean} showClose - Whether to show a close button
 * @param {Function} onClose - Callback when close button is clicked
 * @param {Object} props - Additional props to pass to Tag.Root
 */
export const TagChip = memo(function TagChip({ tag, size = "sm", showClose = false, onClose, ...props }) {
  // Default styling - consistent across all tag displays
  const defaultProps = {
    borderRadius: "full",
    bg: tag.color,
    color: "white",
    textTransform: "uppercase",
    fontSize: size === "sm" ? "xs" : size === "xs" ? "2xs" : "sm",
    fontWeight: "bold",
    py: size === "sm" ? 1 : size === "xs" ? 0.5 : 1.5,
    px: size === "sm" ? 2.5 : size === "xs" ? 1.5 : 3,
    variant: "solid",
  };

  // Handle responsive size objects
  const getSizeValue = (sizeObj, key) => {
    if (typeof sizeObj === "string") return sizeObj;
    return sizeObj[key] || sizeObj.base || "sm";
  };

  // Handle responsive fontSize
  const fontSize =
    typeof size === "object"
      ? {
          base: getSizeValue(size, "base") === "sm" ? "xs" : "2xs",
          md: getSizeValue(size, "md") === "sm" ? "xs" : "2xs",
        }
      : defaultProps.fontSize;

  // Handle responsive padding
  const py =
    typeof size === "object"
      ? {
          base: getSizeValue(size, "base") === "sm" ? 1 : 0.5,
          md: getSizeValue(size, "md") === "sm" ? 1 : 0.5,
        }
      : defaultProps.py;

  const px =
    typeof size === "object"
      ? {
          base: getSizeValue(size, "base") === "sm" ? 2.5 : 1.5,
          md: getSizeValue(size, "md") === "sm" ? 2.5 : 2,
        }
      : defaultProps.px;

  return (
    <Tag.Root size={size} {...defaultProps} fontSize={fontSize} py={py} px={px} {...props}>
      <Tag.Label>{tag.name}</Tag.Label>
      {showClose && onClose && <Tag.CloseTrigger onClick={() => onClose(tag.id)} />}
    </Tag.Root>
  );
});

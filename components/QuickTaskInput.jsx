"use client";

import { useState, useRef } from "react";
import { TextField, Box } from "@mui/material";

/**
 * Reusable quick task input component
 * Handles inline task creation with consistent behavior across the app
 */
export const QuickTaskInput = ({
  placeholder = "New task...",
  onCreate,
  size = "small",
  variant = "standard",
  fullWidth = true,
  showUnderlineWhenActive = true,
  sx = {},
  ...inputProps
}) => {
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const lastSubmittedValueRef = useRef(null);

  const handleClick = () => {
    setIsActive(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const submitIfNeeded = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isSubmittingRef.current || lastSubmittedValueRef.current === trimmedValue) {
      return false;
    }

    isSubmittingRef.current = true;
    lastSubmittedValueRef.current = trimmedValue;
    try {
      await onCreate(trimmedValue);
      setValue("");
      return true;
    } catch (error) {
      // Allow retry if the request fails.
      lastSubmittedValueRef.current = null;
      throw error;
    } finally {
      isSubmittingRef.current = false;
      // Clear on next tick so Enter+blur in the same interaction only submits once.
      queueMicrotask(() => {
        if (!isSubmittingRef.current) {
          lastSubmittedValueRef.current = null;
        }
      });
    }
  };

  const handleBlur = async () => {
    try {
      await submitIfNeeded();
    } catch {
      // Error handling is done by the caller's onCreate.
    }
    setIsActive(false);
  };

  const handleKeyDown = async e => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      try {
        await submitIfNeeded();
      } catch {
        // Error handling is done by the caller's onCreate.
      }
      setIsActive(false);
    } else if (e.key === "Escape") {
      setValue("");
      setIsActive(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto", maxWidth: "100%", ...sx }}>
      <TextField
        inputRef={inputRef}
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        InputProps={{
          disableUnderline: showUnderlineWhenActive ? !isActive : true,
          sx: {
            fontSize: "0.875rem",
            color: isActive ? "text.primary" : "text.secondary",
          },
        }}
        {...inputProps}
      />
    </Box>
  );
};

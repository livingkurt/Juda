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

  const handleClick = () => {
    setIsActive(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleBlur = async () => {
    if (value.trim()) {
      await onCreate(value.trim());
      setValue("");
    }
    setIsActive(false);
  };

  const handleKeyDown = async e => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      await onCreate(value.trim());
      setValue("");
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

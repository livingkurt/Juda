"use client";

import { memo, useState, useEffect } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import { Search, Close } from "@mui/icons-material";

export const TaskSearchInput = memo(function TaskSearchInput({ onSearchChange, placeholder = "Search tasks..." }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Notify parent component when debounced search changes
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  return (
    <TextField
      fullWidth
      size="small"
      placeholder={placeholder}
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: searchTerm && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setSearchTerm("")}>
              <Close fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
});

export default TaskSearchInput;

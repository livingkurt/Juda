"use client";

import { memo, useState, useEffect } from "react";
import { TextField, InputAdornment, IconButton, Box, Stack } from "@mui/material";
import { Search, Close } from "@mui/icons-material";
import { FilterMenu } from "./FilterMenu";

export const TaskSearchInput = memo(function TaskSearchInput({
  onSearchChange,
  placeholder = "Search tasks...",
  // Filter menu props (optional - if not provided, no filter menu is shown)
  tags,
  tasks = [],
  selectedTagIds,
  onTagSelect,
  onTagDeselect,
  onCreateTag,
  selectedPriorities,
  onPrioritySelect,
  onPriorityDeselect,
  sortByPriority,
  onSortToggle,
  showPriorityFilter = true,
  showSort = true,
  showUntaggedOption = true,
}) {
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

  // Check if filter menu should be shown
  const showFilterMenu =
    tags !== undefined &&
    selectedTagIds !== undefined &&
    onTagSelect !== undefined &&
    onTagDeselect !== undefined &&
    onCreateTag !== undefined;

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
      </Box>
      {showFilterMenu && (
        <FilterMenu
          tags={tags}
          tasks={tasks}
          selectedTagIds={selectedTagIds}
          onTagSelect={onTagSelect}
          onTagDeselect={onTagDeselect}
          onCreateTag={onCreateTag}
          selectedPriorities={selectedPriorities}
          onPrioritySelect={onPrioritySelect}
          onPriorityDeselect={onPriorityDeselect}
          sortByPriority={sortByPriority}
          onSortToggle={onSortToggle}
          showPriorityFilter={showPriorityFilter}
          showSort={showSort}
          showUntaggedOption={showUntaggedOption}
        />
      )}
    </Stack>
  );
});

export default TaskSearchInput;

"use client";

import { memo, useState, useEffect } from "react";
import { TextInput } from "@mantine/core";
import { Search } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const TaskSearchInput = memo(function TaskSearchInput({ onSearchChange, placeholder = "Search tasks..." }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { mode, interactive } = useSemanticColors();
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;

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
    <TextInput
      placeholder={placeholder}
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      leftSection={<Search size={14} stroke="currentColor" />}
      style={{
        background: "transparent",
        borderColor: borderColor,
        color: textColor,
      }}
      styles={{
        input: {
          color: textColor,
          "&::placeholder": {
            color: mutedText,
          },
          "&:focus": {
            borderColor: interactive.primary,
            boxShadow: `0 0 0 1px ${interactive.primary}`,
          },
        },
      }}
    />
  );
});

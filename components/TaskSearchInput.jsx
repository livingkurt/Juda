"use client";

import { useState, useEffect } from "react";
import { Input, InputGroup, Box } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const TaskSearchInput = ({ onSearchChange, placeholder = "Search tasks..." }) => {
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
    <InputGroup
      startElement={
        <Box as="span" color={mutedText} pointerEvents="none">
          <Search size={14} stroke="currentColor" />
        </Box>
      }
    >
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        bg="transparent"
        borderColor={borderColor}
        color={textColor}
        _placeholder={{ color: mutedText }}
        _focus={{
          borderColor: interactive.primary,
          boxShadow: `0 0 0 1px ${interactive.primary}`,
        }}
      />
    </InputGroup>
  );
};

"use client";

import { useState, useEffect } from "react";
import { Input, InputGroup, Box } from "@chakra-ui/react";
import { Search } from "lucide-react";

export const TaskSearchInput = ({ onSearchChange, placeholder = "Search tasks..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const bgColor = { _light: "white", _dark: "gray.800" };
  const textColor = { _light: "gray.900", _dark: "gray.100" };
  const mutedText = { _light: "gray.500", _dark: "gray.400" };

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
          <Search size={16} stroke="currentColor" />
        </Box>
      }
    >
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        bg={bgColor}
        borderColor={borderColor}
        color={textColor}
        _placeholder={{ color: mutedText }}
        _focus={{
          borderColor: "blue.400",
          boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
        }}
      />
    </InputGroup>
  );
};

"use client";

import { useState, useEffect } from "react";
import { Input, InputGroup, InputLeftElement, Box } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useColorModeValue } from "@chakra-ui/react";

export const TaskSearchInput = ({ onSearchChange, placeholder = "Search tasks..." }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const borderColor = useColorModeValue("gray.200", "gray.600");
  const bgColor = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");

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
    <InputGroup>
      <InputLeftElement pointerEvents="none">
        <Box as="span" color={mutedText}>
          <Search size={16} stroke="currentColor" />
        </Box>
      </InputLeftElement>
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


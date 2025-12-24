"use client";

import { Box, Button, IconButton, Text, Flex, Input, Badge } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DateNavigation = ({ selectedDate, onDateChange, onPrevious, onNext, onToday }) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const textColor = { _light: "gray.900", _dark: "gray.100" };
  const warningBg = { _light: "orange.50", _dark: "orange.900" };
  const warningBorder = { _light: "orange.200", _dark: "orange.700" };
  const warningText = { _light: "orange.800", _dark: "orange.200" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = selectedDate && selectedDate.toDateString() === today.toDateString();
  const isPast = selectedDate && selectedDate < today;
  const isFuture = selectedDate && selectedDate > today;

  const formatDateDisplay = date => {
    if (!date) return "";
    const isTodayDate = date.toDateString() === today.toDateString();
    if (isTodayDate) {
      return "Today";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatDateInput = date => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateInputChange = e => {
    const value = e.target.value;
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(0, 0, 0, 0);
      onDateChange(newDate);
    }
  };

  return (
    <Box
      mb={4}
      p={{ base: 2, md: 4 }}
      borderRadius="lg"
      bg={isToday ? bgColor : warningBg}
      borderWidth="1px"
      borderColor={isToday ? borderColor : warningBorder}
      transition="all 0.2s"
      w="100%"
      maxW="100%"
      overflow="hidden"
    >
      <Flex align="center" gap={2} flexWrap="wrap" w="100%" maxW="100%">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <IconButton onClick={onPrevious} variant="ghost" aria-label="Previous day" size="sm">
          <Box as="span" color="currentColor">
            <ChevronLeft size={14} stroke="currentColor" />
          </Box>
        </IconButton>
        <IconButton onClick={onNext} variant="ghost" aria-label="Next day" size="sm">
          <Box as="span" color="currentColor">
            <ChevronRight size={14} stroke="currentColor" />
          </Box>
        </IconButton>
        <Box position="relative" flex={1} minW={{ base: 0, md: "200px" }}>
          <Input
            type="date"
            value={formatDateInput(selectedDate)}
            onChange={handleDateInputChange}
            size="sm"
            variant="outline"
            cursor="pointer"
            sx={{
              "&::-webkit-calendar-picker-indicator": {
                cursor: "pointer",
              },
            }}
          />
        </Box>
        <Flex align="center" gap={2} minW={{ base: 0, md: "120px" }} flexShrink={{ base: 1, md: 0 }}>
          <Text fontSize="sm" fontWeight="medium" color={isToday ? textColor : warningText}>
            {formatDateDisplay(selectedDate)}
          </Text>
          {isPast && (
            <Badge colorPalette="orange" fontSize="xs">
              Past Date
            </Badge>
          )}
          {isFuture && (
            <Badge colorPalette="blue" fontSize="xs">
              Future Date
            </Badge>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

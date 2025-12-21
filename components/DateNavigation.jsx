"use client";

import { Box, Button, IconButton, Text, Flex, Input, useColorModeValue, Badge } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DateNavigation = ({ selectedDate, onDateChange, onPrevious, onNext, onToday }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("gray.900", "gray.100");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const warningBg = useColorModeValue("orange.50", "orange.900");
  const warningBorder = useColorModeValue("orange.200", "orange.700");
  const warningText = useColorModeValue("orange.800", "orange.200");

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
      p={4}
      borderRadius="lg"
      bg={isToday ? bgColor : warningBg}
      borderWidth="1px"
      borderColor={isToday ? borderColor : warningBorder}
      transition="all 0.2s"
    >
      <Flex align="center" gap={2} flexWrap="wrap">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <IconButton
          icon={
            <Box as="span" color="currentColor">
              <ChevronLeft size={18} stroke="currentColor" />
            </Box>
          }
          onClick={onPrevious}
          variant="ghost"
          aria-label="Previous day"
          size="sm"
        />
        <IconButton
          icon={
            <Box as="span" color="currentColor">
              <ChevronRight size={18} stroke="currentColor" />
            </Box>
          }
          onClick={onNext}
          variant="ghost"
          aria-label="Next day"
          size="sm"
        />
        <Box position="relative" flex={1} minW="200px">
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
        <Flex align="center" gap={2} minW="120px">
          <Text fontSize="sm" fontWeight="medium" color={isToday ? textColor : warningText}>
            {formatDateDisplay(selectedDate)}
          </Text>
          {isPast && (
            <Badge colorScheme="orange" fontSize="xs">
              Past Date
            </Badge>
          )}
          {isFuture && (
            <Badge colorScheme="blue" fontSize="xs">
              Future Date
            </Badge>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

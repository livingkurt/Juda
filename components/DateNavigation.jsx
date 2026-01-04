"use client";

import { memo } from "react";
import { Box, Button, IconButton, Text, Flex, Input, Badge, VStack } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const DateNavigation = memo(function DateNavigation({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  title,
  showDatePicker = true,
  showDateDisplay = true,
  rightContent,
  twoRowLayout = false,
}) {
  const { mode, badges } = useSemanticColors();

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const warningBg = mode.status.warningBg;
  const warningBorder = mode.status.warning;
  const warningText = mode.status.warningText;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = selectedDate && selectedDate.toDateString() === today.toDateString();
  const isPast = selectedDate && selectedDate < today;
  const isFuture = selectedDate && selectedDate > today;

  const formatDateDisplay = date => {
    if (!date) return "";
    const isTodayDate = date.toDateString() === today.toDateString();
    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
    if (isTodayDate) {
      return `Today, ${formattedDate}`;
    }
    return formattedDate;
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

  if (twoRowLayout) {
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
        <VStack align="stretch" spacing={2}>
          {/* First Row: Navigation Controls + View Selector */}
          <Flex align="center" gap={{ base: 1.5, md: 2 }} w="100%">
            <Button variant="outline" size="sm" onClick={onToday} flexShrink={0}>
              Today
            </Button>
            <IconButton onClick={onPrevious} variant="ghost" aria-label="Previous" size="sm" flexShrink={0}>
              <Box as="span" color="currentColor">
                <ChevronLeft size={14} stroke="currentColor" />
              </Box>
            </IconButton>
            <IconButton onClick={onNext} variant="ghost" aria-label="Next" size="sm" flexShrink={0}>
              <Box as="span" color="currentColor">
                <ChevronRight size={14} stroke="currentColor" />
              </Box>
            </IconButton>
            {/* Spacer */}
            <Box flex={1} />
            {/* View Selector on the right */}
            {rightContent}
          </Flex>

          {/* Second Row: Full-Width Date Picker */}
          {showDatePicker && (
            <Box w="100%">
              <Input
                type="date"
                value={formatDateInput(selectedDate)}
                onChange={handleDateInputChange}
                size="sm"
                variant="outline"
                cursor="pointer"
                w="100%"
                textAlign="center"
                sx={{
                  "&::-webkit-calendar-picker-indicator": {
                    cursor: "pointer",
                  },
                }}
              />
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

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
      <Flex align="center" gap={{ base: 1.5, md: 2 }} w="100%" maxW="100%" flexWrap={{ base: "wrap", md: "nowrap" }}>
        <Button variant="outline" size="sm" onClick={onToday} flexShrink={0}>
          Today
        </Button>
        <IconButton onClick={onPrevious} variant="ghost" aria-label="Previous" size="sm" flexShrink={0}>
          <Box as="span" color="currentColor">
            <ChevronLeft size={14} stroke="currentColor" />
          </Box>
        </IconButton>
        <IconButton onClick={onNext} variant="ghost" aria-label="Next" size="sm" flexShrink={0}>
          <Box as="span" color="currentColor">
            <ChevronRight size={14} stroke="currentColor" />
          </Box>
        </IconButton>
        {showDatePicker && (
          <Box position="relative" flex={1} minW={{ base: "120px", md: "200px" }}>
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
        )}
        {title && (
          <Text fontSize="sm" fontWeight="medium" minW="120px" display={{ base: "none", md: "block" }}>
            {title}
          </Text>
        )}
        {showDateDisplay && (
          <Flex align="center" gap={2} minW={{ base: 0, md: "120px" }} flexShrink={{ base: 1, md: 0 }}>
            <Text fontSize="sm" fontWeight="medium" color={isToday ? textColor : warningText}>
              {formatDateDisplay(selectedDate)}
            </Text>
            {isPast && (
              <Badge
                colorPalette={badges.past.colorPalette}
                fontSize="xs"
                display={{ base: "none", md: "inline-flex" }}
              >
                Past Date
              </Badge>
            )}
            {isFuture && (
              <Badge
                colorPalette={badges.future.colorPalette}
                fontSize="xs"
                display={{ base: "none", md: "inline-flex" }}
              >
                Future Date
              </Badge>
            )}
          </Flex>
        )}
        {/* Spacer to push rightContent to the end */}
        {rightContent && <Box flex={{ base: "0 0 auto", md: 1 }} />}
        {rightContent}
      </Flex>
    </Box>
  );
});

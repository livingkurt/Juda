"use client";

import { memo } from "react";
import { Box, Button, ActionIcon, Text, Flex, TextInput, Badge, Stack } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { SelectDropdown } from "./SelectDropdown";

export const DateNavigation = memo(function DateNavigation({
  selectedDate,
  onDateChange,
  onPrevious,
  onNext,
  onToday,
  title,
  showDatePicker = true,
  showDateDisplay = true,
  twoRowLayout = false,
  // View selector props
  showViewSelector = false,
  viewData = null,
  selectedView = null,
  onViewChange = null,
  viewSelectorWidth = 24,
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
        p={[8, 16]}
        style={{
          borderRadius: "0.5rem",
          background: isToday ? bgColor : warningBg,
          border: `1px solid ${isToday ? borderColor : warningBorder}`,
          transition: "all 0.2s",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Stack gap={8}>
          {/* First Row: Navigation Controls + View Selector */}
          <Flex align="center" gap={[6, 8]} style={{ width: "100%" }}>
            <Button variant="outline" size="sm" onClick={onToday} style={{ flexShrink: 0 }}>
              Today
            </Button>
            <ActionIcon onClick={onPrevious} variant="subtle" aria-label="Previous" size="sm" style={{ flexShrink: 0 }}>
              <ChevronLeft size={14} stroke="currentColor" />
            </ActionIcon>
            <ActionIcon onClick={onNext} variant="subtle" aria-label="Next" size="sm" style={{ flexShrink: 0 }}>
              <ChevronRight size={14} stroke="currentColor" />
            </ActionIcon>
            {/* Spacer */}
            <Box style={{ flex: 1 }} />
            {/* View Selector on the right */}
            {showViewSelector && viewData && selectedView && onViewChange && (
              <SelectDropdown
                data={viewData}
                value={selectedView}
                onChange={onViewChange}
                placeholder="View"
                size="sm"
                style={{ width: viewSelectorWidth }}
              />
            )}
          </Flex>

          {/* Second Row: Centered Date Picker */}
          {showDatePicker && (
            <Box style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <TextInput
                type="date"
                value={formatDateInput(selectedDate)}
                onChange={handleDateInputChange}
                size="sm"
                variant="outline"
                style={{
                  cursor: "pointer",
                  width: "auto",
                  minWidth: "150px",
                  textAlign: "center",
                }}
              />
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      p={[8, 16]}
      style={{
        borderRadius: "0.5rem",
        background: isToday ? bgColor : warningBg,
        border: `1px solid ${isToday ? borderColor : warningBorder}`,
        transition: "all 0.2s",
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <Flex align="center" gap={[6, 8]} style={{ width: "100%", maxWidth: "100%", flexWrap: "wrap" }}>
        <Button variant="outline" size="sm" onClick={onToday} style={{ flexShrink: 0 }}>
          Today
        </Button>
        <ActionIcon onClick={onPrevious} variant="subtle" aria-label="Previous" size="sm" style={{ flexShrink: 0 }}>
          <ChevronLeft size={14} stroke="currentColor" />
        </ActionIcon>
        <ActionIcon onClick={onNext} variant="subtle" aria-label="Next" size="sm" style={{ flexShrink: 0 }}>
          <ChevronRight size={14} stroke="currentColor" />
        </ActionIcon>
        {/* Spacer to center date picker when view selector is shown */}
        {showViewSelector && showDatePicker && <Box style={{ flex: 1 }} />}
        {showDatePicker && (
          <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
            <TextInput
              type="date"
              value={formatDateInput(selectedDate)}
              onChange={handleDateInputChange}
              size="sm"
              variant="outline"
              style={{
                cursor: "pointer",
                width: "auto",
                minWidth: "150px",
                textAlign: "center",
              }}
            />
          </Box>
        )}
        {title && (
          <Text size="sm" fw={500} style={{ minWidth: "120px", display: "none" }} visibleFrom="md">
            {title}
          </Text>
        )}
        {showDateDisplay && (
          <Flex align="center" gap={8} style={{ minWidth: "120px", flexShrink: 0 }}>
            <Text size="sm" fw={500} c={isToday ? textColor : warningText}>
              {formatDateDisplay(selectedDate)}
            </Text>
            {isPast && (
              <Badge color={badges.past.colorPalette} size="xs" style={{ display: "none" }} visibleFrom="md">
                Past Date
              </Badge>
            )}
            {isFuture && (
              <Badge color={badges.future.colorPalette} size="xs" style={{ display: "none" }} visibleFrom="md">
                Future Date
              </Badge>
            )}
          </Flex>
        )}
        {/* Spacer to push view selector to the end */}
        {showViewSelector && <Box style={{ flex: 1 }} />}
        {/* View Selector on the right */}
        {showViewSelector && viewData && selectedView && onViewChange && (
          <SelectDropdown
            data={viewData}
            value={selectedView}
            onChange={onViewChange}
            placeholder="View"
            size="sm"
            w={viewSelectorWidth}
          />
        )}
      </Flex>
    </Box>
  );
});

"use client";

import { Button, HStack } from "@chakra-ui/react";
import { DAYS_OF_WEEK } from "@/lib/constants";

/**
 * WeekdaySelector - Reusable component for selecting days of the week
 *
 * @param {Array<number>} selectedDays - Array of selected day values (0-6, where 0=Sunday)
 * @param {Function} onChange - Callback when selection changes: (newSelectedDays) => void
 * @param {boolean} allowEmpty - Whether to allow deselecting all days (default: false)
 * @param {string} size - Button size: "xs" | "sm" | "md" (default: "md")
 * @param {boolean} circular - Use circular buttons (default: true)
 * @param {string} spacing - Spacing between buttons (default: 1)
 */
export default function WeekdaySelector({
  selectedDays = [],
  onChange,
  allowEmpty = false,
  size = "md",
  circular = true,
  spacing = 1,
}) {
  const handleToggle = dayValue => {
    const isSelected = selectedDays.includes(dayValue);

    if (isSelected) {
      // Prevent deselecting if it's the last selected day and allowEmpty is false
      if (!allowEmpty && selectedDays.length === 1) {
        return;
      }
      onChange(selectedDays.filter(d => d !== dayValue));
    } else {
      onChange([...selectedDays, dayValue].sort());
    }
  };

  // Size mappings
  const sizeMap = {
    xs: { w: 8, h: 8, fontSize: "xs" },
    sm: { w: 9, h: 9, fontSize: { base: "xs", md: "sm" } },
    md: { w: 10, h: 10, fontSize: "sm" },
  };

  const buttonSize = sizeMap[size] || sizeMap.md;

  return (
    <HStack spacing={spacing} w="full">
      {DAYS_OF_WEEK.map(day => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <Button
            key={day.value}
            w={buttonSize.w}
            h={buttonSize.h}
            borderRadius={circular ? "full" : "md"}
            fontSize={buttonSize.fontSize}
            fontWeight="medium"
            onClick={() => handleToggle(day.value)}
            colorPalette={isSelected ? "blue" : "gray"}
            variant={isSelected ? "solid" : "outline"}
          >
            {day.short}
          </Button>
        );
      })}
    </HStack>
  );
}

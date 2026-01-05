"use client";

import { Button, Group } from "@mantine/core";
import { DAYS_OF_WEEK } from "@/lib/constants";

/**
 * WeekdaySelector - Reusable component for selecting days of the week
 *
 * @param {Array<number>} selectedDays - Array of selected day values (0-6, where 0=Sunday)
 * @param {Function} onChange - Callback when selection changes: (newSelectedDays) => void
 * @param {boolean} allowEmpty - Whether to allow deselecting all days (default: false)
 * @param {string} size - Button size: "xs" | "sm" | "md" (default: "md")
 * @param {boolean} circular - Use circular buttons (default: true)
 * @param {string|number} gap - Spacing between buttons (default: 4)
 */
export default function WeekdaySelector({
  selectedDays = [],
  onChange,
  allowEmpty = false,
  size = "md",
  circular = true,
  gap = 4,
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
    xs: { w: 32, h: 32, fz: "0.75rem" },
    sm: { w: 36, h: 36, fz: "0.875rem" },
    md: { w: 40, h: 40, fz: "0.875rem" },
  };

  const buttonSize = sizeMap[size] || sizeMap.md;

  return (
    <Group gap={gap} w="100%">
      {DAYS_OF_WEEK.map(day => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <Button
            key={day.value}
            w={buttonSize.w}
            h={buttonSize.h}
            radius={circular ? "xl" : "md"}
            fz={buttonSize.fz}
            fw={500}
            onClick={() => handleToggle(day.value)}
            variant={isSelected ? "filled" : "outline"}
            color={isSelected ? "blue" : "gray"}
            p={0}
          >
            {day.short}
          </Button>
        );
      })}
    </Group>
  );
}

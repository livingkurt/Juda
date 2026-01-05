"use client";

import { Button, Stack } from "@mui/material";
import { DAYS_OF_WEEK } from "@/lib/constants";

/**
 * WeekdaySelector - Reusable component for selecting days of the week
 *
 * @param {Array<number>} selectedDays - Array of selected day values (0-6, where 0=Sunday)
 * @param {Function} onChange - Callback when selection changes: (newSelectedDays) => void
 * @param {boolean} allowEmpty - Whether to allow deselecting all days (default: false)
 * @param {string} size - Button size: "xs" | "sm" | "md" (default: "md")
 * @param {boolean} circular - Use circular buttons (default: true)
 * @param {number} spacing - Spacing between buttons (default: 1)
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
    xs: { width: 32, height: 32, fontSize: "0.75rem" },
    sm: { width: 36, height: 36, fontSize: { xs: "0.75rem", md: "0.875rem" } },
    md: { width: 40, height: 40, fontSize: "0.875rem" },
  };

  const buttonSize = sizeMap[size] || sizeMap.md;

  return (
    <Stack direction="row" spacing={spacing} sx={{ width: "100%" }}>
      {DAYS_OF_WEEK.map(day => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <Button
            key={day.value}
            sx={{
              width: buttonSize.width,
              height: buttonSize.height,
              minWidth: buttonSize.width,
              borderRadius: circular ? "50%" : 1,
              fontSize: buttonSize.fontSize,
              fontWeight: 500,
            }}
            variant={isSelected ? "contained" : "outlined"}
            color={isSelected ? "primary" : "inherit"}
            onClick={() => handleToggle(day.value)}
          >
            {day.short}
          </Button>
        );
      })}
    </Stack>
  );
}

"use client";

import { TASK_COLORS } from "@/lib/constants";

/**
 * Hook to get colors for tag color picker
 * Returns TASK_COLORS directly — no theme mapping needed
 */
export function useThemeColors() {
  return {
    tagColors: TASK_COLORS,
    canonicalColors: TASK_COLORS,
    getThemeColor: index => TASK_COLORS[index],
    getCanonicalColor: index => TASK_COLORS[index],
  };
}

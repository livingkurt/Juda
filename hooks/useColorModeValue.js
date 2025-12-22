"use client";

import { useMemo } from "react";
import { useColorModeSync } from "@/hooks/useColorModeSync";

/**
 * Replacement for Chakra UI v2's useColorModeValue hook
 * In v3, we use CSS variables or this wrapper hook
 */
export function useColorModeValue(lightValue, darkValue) {
  const { colorMode } = useColorModeSync();
  return useMemo(() => {
    return colorMode === "dark" ? darkValue : lightValue;
  }, [colorMode, lightValue, darkValue]);
}

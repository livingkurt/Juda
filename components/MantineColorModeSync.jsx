"use client";

import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import { useColorModeSync } from "@/hooks/useColorModeSync";

/**
 * Component to sync Mantine's color scheme with Juda's preferences system
 * This ensures Mantine components use the correct color scheme
 */
export function MantineColorModeSync() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { colorMode } = useColorModeSync();

  // Sync Mantine's color scheme with Juda's color mode
  useEffect(() => {
    if (colorMode && colorScheme !== colorMode) {
      setColorScheme(colorMode);
    }
  }, [colorMode, colorScheme, setColorScheme]);

  return null;
}

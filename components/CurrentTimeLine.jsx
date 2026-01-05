"use client";

import { useState, useEffect } from "react";
import { Box } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";

export const CurrentTimeLine = ({ hourHeight, isVisible = true }) => {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (!isVisible) return;

    // Update every minute
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const topPosition = (currentMinutes / 60) * hourHeight;
  const lineColor = isDark ? "var(--mantine-color-red-4)" : "var(--mantine-color-red-5)";

  return (
    <Box
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: `${topPosition}px`,
        height: "2px",
        background: lineColor,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {/* Small circle indicator */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          top: "-4px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: lineColor,
        }}
      />
    </Box>
  );
};

"use client";

import { useState, useEffect } from "react";
import { Box } from "@chakra-ui/react";

export const CurrentTimeLine = ({ hourHeight, isVisible = true }) => {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

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

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      top={`${topPosition}px`}
      height="2px"
      bg="red.500"
      zIndex={100}
      pointerEvents="none"
      _dark={{ bg: "red.400" }}
    >
      {/* Small circle indicator */}
      <Box
        position="absolute"
        left={0}
        top="-4px"
        width="10px"
        height="10px"
        borderRadius="full"
        bg="red.500"
        _dark={{ bg: "red.400" }}
      />
    </Box>
  );
};


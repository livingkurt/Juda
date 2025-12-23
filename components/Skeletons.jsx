"use client";

import { Box, Spinner, Flex } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { keyframes } from "@emotion/react";
import { useState, useEffect } from "react";

// Pulse animation for loading dots
const pulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
`;

// Simple loading spinner component
export const LoadingSpinner = ({ size = "xl", color, ...props }) => {
  // Use provided color or fall back to color mode hook
  // If color is provided, use it directly to avoid hydration mismatch
  const colorModeColor = useColorModeValue("blue.500", "blue.300");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or if color is provided, use fixed value
  // After mount, use color mode value if no color provided
  const spinnerColor = color || (mounted ? colorModeColor : "blue.300");
  return (
    <Flex align="center" justify="center" {...props}>
      <Spinner size={size} color={spinnerColor} thickness="4px" speed="0.65s" />
    </Flex>
  );
};

// Loading dots animation
export const LoadingDots = ({ ...props }) => {
  const color = useColorModeValue("blue.500", "blue.300");
  const pulseAnimation = `${pulse} 1.4s ease-in-out infinite`;

  return (
    <Flex align="center" justify="center" gap={2} {...props}>
      <Box w={2} h={2} borderRadius="full" bg={color} animation={pulseAnimation} style={{ animationDelay: "0s" }} />
      <Box w={2} h={2} borderRadius="full" bg={color} animation={pulseAnimation} style={{ animationDelay: "0.2s" }} />
      <Box w={2} h={2} borderRadius="full" bg={color} animation={pulseAnimation} style={{ animationDelay: "0.4s" }} />
    </Flex>
  );
};

// Section loading (replaces SectionSkeleton)
export const SectionSkeleton = () => {
  return (
    <Box py={8}>
      <LoadingDots />
    </Box>
  );
};

// Backlog loading (replaces BacklogSkeleton)
export const BacklogSkeleton = () => {
  return (
    <Flex h="100%" align="center" justify="center">
      <LoadingSpinner size="lg" />
    </Flex>
  );
};

// Calendar loading (replaces CalendarSkeleton)
export const CalendarSkeleton = () => {
  return (
    <Flex flex={1} align="center" justify="center" minH="600px">
      <LoadingSpinner size="xl" />
    </Flex>
  );
};

// Full page loading (replaces PageSkeleton)
export const PageSkeleton = ({
  showBacklog: _showBacklog,
  showDashboard: _showDashboard,
  showCalendar: _showCalendar,
}) => {
  // Use fixed dark mode values to prevent hydration mismatch
  // Default to dark mode since that's the app default
  // Pass fixed color to LoadingSpinner to avoid useColorModeValue hook during SSR
  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" bg="gray.900" suppressHydrationWarning>
      {/* Main content */}
      <Flex as="main" flex={1} align="center" justify="center" direction="column" gap={4} suppressHydrationWarning>
        <LoadingSpinner size="xl" color="blue.300" />
        <Box color="gray.400" fontSize="sm" fontWeight="medium" suppressHydrationWarning>
          Loading...
        </Box>
      </Flex>
    </Box>
  );
};

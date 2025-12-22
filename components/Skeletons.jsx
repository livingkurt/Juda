"use client";

import { Box, Spinner, Flex } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { keyframes } from "@emotion/react";

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
export const LoadingSpinner = ({ size = "xl", ...props }) => {
  const color = useColorModeValue("blue.500", "blue.300");
  return (
    <Flex align="center" justify="center" {...props}>
      <Spinner size={size} color={color} thickness="4px" speed="0.65s" />
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
export const PageSkeleton = ({ showBacklog = true, showDashboard = true, showCalendar = true }) => {
  // Use fixed dark mode values to prevent hydration mismatch
  // Default to dark mode since that's the app default
  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" bg="gray.900" suppressHydrationWarning>
      {/* Main content */}
      <Flex as="main" flex={1} align="center" justify="center" direction="column" gap={4}>
        <LoadingSpinner size="xl" />
        <Box color="gray.400" fontSize="sm" fontWeight="medium">
          Loading...
        </Box>
      </Flex>
    </Box>
  );
};

"use client";

import { Box, Spinner, Flex } from "@chakra-ui/react";
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
export const LoadingSpinner = ({ size = "xl", color, ...props }) => {
  // Use Chakra v3's native _light/_dark syntax for color mode
  const spinnerColor = color || { _light: "blue.500", _dark: "blue.300" };
  return (
    <Flex align="center" justify="center" {...props}>
      <Spinner size={size} color={spinnerColor} thickness="4px" speed="0.65s" />
    </Flex>
  );
};

// Loading dots animation
export const LoadingDots = ({ ...props }) => {
  const color = { _light: "blue.500", _dark: "blue.300" };
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
export const PageSkeleton = () => {
  const bgColor = { _light: "gray.50", _dark: "gray.900" };
  const textColor = { _light: "gray.600", _dark: "gray.400" };

  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden" bg={bgColor}>
      {/* Main content */}
      <Flex as="main" flex={1} align="center" justify="center" direction="column" gap={4}>
        <LoadingSpinner size="xl" />
        <Box color={textColor} fontSize="sm" fontWeight="medium">
          Loading...
        </Box>
      </Flex>
    </Box>
  );
};

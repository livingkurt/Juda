"use client";

import { Box, Spinner, Flex } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

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
  const { interactive } = useSemanticColors();
  const spinnerColor = color || interactive.primary;
  return (
    <Flex align="center" justify="center" {...props}>
      <Spinner size={size} color={spinnerColor} thickness="4px" speed="0.65s" />
    </Flex>
  );
};

// Loading dots animation
export const LoadingDots = ({ ...props }) => {
  const { interactive } = useSemanticColors();
  const color = interactive.primary;
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
  return (
    <Box h="100vh" display="flex" flexDirection="column" overflow="hidden">
      {/* Main content */}
      <Flex as="main" flex={1} align="center" justify="center" direction="column" gap={4}>
        <LoadingSpinner size="xl" />
        <Box fontSize="sm" fontWeight="medium">
          Loading...``
        </Box>
      </Flex>
    </Box>
  );
};

// Table skeleton for History tab
export const TableSkeleton = () => {
  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const skeletonColor = mode.bg.muted;
  const borderColor = mode.border.default;
  const headerBg = mode.bg.muted;

  return (
    <Box>
      <Box overflow="hidden" borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        {/* Table header */}
        <Flex bg={headerBg} p={3} gap={4} borderBottomWidth="1px" borderColor={borderColor}>
          <Box h="20px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.6} />
          <Box h="20px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.6} />
          <Box h="20px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.6} />
          <Box h="20px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.6} />
          <Box h="20px" w="120px" bg={skeletonColor} borderRadius="sm" opacity={0.6} />
        </Flex>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Flex key={i} p={3} gap={4} borderBottomWidth="1px" borderColor={borderColor} bg={bgColor}>
            <Box h="18px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.4} />
            <Box h="18px" flex={1} bg={skeletonColor} borderRadius="sm" opacity={0.4} />
            <Box h="18px" flex={0.7} bg={skeletonColor} borderRadius="sm" opacity={0.4} />
            <Box h="18px" flex={0.5} bg={skeletonColor} borderRadius="sm" opacity={0.4} />
            <Box h="18px" w="100px" bg={skeletonColor} borderRadius="sm" opacity={0.4} />
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

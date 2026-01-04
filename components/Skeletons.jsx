"use client";

import { Box, Spinner, Flex, Skeleton, SkeletonCircle } from "@chakra-ui/react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

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

// Loading dots animation using Chakra v3 Skeleton
export const LoadingDots = ({ ...props }) => {
  return (
    <Flex align="center" justify="center" gap={2} {...props}>
      <SkeletonCircle size="2" />
      <SkeletonCircle size="2" />
      <SkeletonCircle size="2" />
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
// Uses plain HTML to avoid hydration mismatches during SSR
export const PageSkeleton = () => {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "3rem",
            height: "3rem",
            border: "4px solid rgba(59, 130, 246, 0.2)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.65s linear infinite",
          }}
        />
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          Loading...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </div>
  );
};

// Table skeleton for History tab using Chakra v3 Skeleton
export const TableSkeleton = () => {
  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const headerBg = mode.bg.muted;

  return (
    <Box>
      <Box overflow="hidden" borderRadius="md" borderWidth="1px" borderColor={borderColor}>
        {/* Table header */}
        <Flex bg={headerBg} p={3} gap={4} borderBottomWidth="1px" borderColor={borderColor}>
          <Skeleton height="20px" flex={1} />
          <Skeleton height="20px" flex={1} />
          <Skeleton height="20px" flex={1} />
          <Skeleton height="20px" flex={1} />
          <Skeleton height="20px" w="120px" />
        </Flex>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Flex key={i} p={3} gap={4} borderBottomWidth="1px" borderColor={borderColor} bg={bgColor}>
            <Skeleton height="18px" flex={1} />
            <Skeleton height="18px" flex={1} />
            <Skeleton height="18px" flex={0.7} />
            <Skeleton height="18px" flex={0.5} />
            <Skeleton height="18px" w="100px" />
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

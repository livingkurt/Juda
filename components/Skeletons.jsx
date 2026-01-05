"use client";

import { Box, Loader, Flex, Skeleton, Group } from "@mantine/core";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// Simple loading spinner component
export const LoadingSpinner = ({ size = "xl", color, ...props }) => {
  const { interactive } = useSemanticColors();
  const spinnerColor = color || interactive.primary;
  return (
    <Flex align="center" justify="center" {...props}>
      <Loader size={size} color={spinnerColor} />
    </Flex>
  );
};

// Loading dots animation using Mantine Skeleton
export const LoadingDots = ({ ...props }) => {
  return (
    <Group gap={8} justify="center" {...props}>
      <Skeleton height={8} width={8} circle />
      <Skeleton height={8} width={8} circle />
      <Skeleton height={8} width={8} circle />
    </Group>
  );
};

// Section loading (replaces SectionSkeleton)
export const SectionSkeleton = () => {
  return (
    <Box py="xl">
      <LoadingDots />
    </Box>
  );
};

// Backlog loading (replaces BacklogSkeleton)
export const BacklogSkeleton = () => {
  return (
    <Flex h="100%" align="center" justify="center">
      <Loader size="lg" />
    </Flex>
  );
};

// Calendar loading (replaces CalendarSkeleton)
export const CalendarSkeleton = () => {
  return (
    <Flex flex={1} align="center" justify="center" mih="600px">
      <Loader size="xl" />
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

// Table skeleton for History tab using Mantine Skeleton
export const TableSkeleton = () => {
  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const headerBg = mode.bg.muted;

  return (
    <Box>
      <Box style={{ overflow: "hidden", borderRadius: "0.375rem", border: `1px solid ${borderColor}` }}>
        {/* Table header */}
        <Group bg={headerBg} p="md" gap="md" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <Skeleton height={20} style={{ flex: 1 }} />
          <Skeleton height={20} style={{ flex: 1 }} />
          <Skeleton height={20} style={{ flex: 1 }} />
          <Skeleton height={20} style={{ flex: 1 }} />
          <Skeleton height={20} w={120} />
        </Group>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Group key={i} p="md" gap="md" style={{ borderBottom: `1px solid ${borderColor}`, background: bgColor }}>
            <Skeleton height={18} style={{ flex: 1 }} />
            <Skeleton height={18} style={{ flex: 1 }} />
            <Skeleton height={18} style={{ flex: 0.7 }} />
            <Skeleton height={18} style={{ flex: 0.5 }} />
            <Skeleton height={18} w={100} />
          </Group>
        ))}
      </Box>
    </Box>
  );
};

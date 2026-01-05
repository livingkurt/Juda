"use client";

import { Box, Stack, CircularProgress, Skeleton } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Simple loading spinner component
export const LoadingSpinner = ({ size = "xl", color, ...props }) => {
  const theme = useTheme();
  const spinnerColor = color || theme.palette.primary.main;

  const sizeMap = {
    xs: 20,
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }} {...props}>
      <CircularProgress size={sizeMap[size] || sizeMap.lg} sx={{ color: spinnerColor }} />
    </Box>
  );
};

// Loading dots animation using MUI Skeleton
export const LoadingDots = ({ ...props }) => {
  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" {...props}>
      <Skeleton variant="circular" width={8} height={8} />
      <Skeleton variant="circular" width={8} height={8} />
      <Skeleton variant="circular" width={8} height={8} />
    </Stack>
  );
};

// Section loading (replaces SectionSkeleton)
export const SectionSkeleton = () => {
  return (
    <Box sx={{ py: 8 }}>
      <LoadingDots />
    </Box>
  );
};

// Backlog loading (replaces BacklogSkeleton)
export const BacklogSkeleton = () => {
  return (
    <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <LoadingSpinner size="lg" />
    </Box>
  );
};

// Calendar loading (replaces CalendarSkeleton)
export const CalendarSkeleton = () => {
  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "600px" }}>
      <LoadingSpinner size="xl" />
    </Box>
  );
};

// Full page loading (replaces PageSkeleton)
// Uses plain HTML to avoid hydration mismatches during SSR
export const PageSkeleton = () => {
  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
        </main>
      </div>
    </>
  );
};

// Table skeleton for History tab using MUI Skeleton
export const TableSkeleton = () => {
  return (
    <Box>
      <Box
        sx={{
          overflow: "hidden",
          borderRadius: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Table header */}
        <Stack
          direction="row"
          spacing={4}
          sx={{
            bgcolor: "action.hover",
            p: 3,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Skeleton height={20} sx={{ flex: 1 }} />
          <Skeleton height={20} sx={{ flex: 1 }} />
          <Skeleton height={20} sx={{ flex: 1 }} />
          <Skeleton height={20} sx={{ flex: 1 }} />
          <Skeleton height={20} width={120} />
        </Stack>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Stack
            key={i}
            direction="row"
            spacing={4}
            sx={{
              p: 3,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Skeleton height={18} sx={{ flex: 1 }} />
            <Skeleton height={18} sx={{ flex: 1 }} />
            <Skeleton height={18} sx={{ flex: 0.7 }} />
            <Skeleton height={18} sx={{ flex: 0.5 }} />
            <Skeleton height={18} width={100} />
          </Stack>
        ))}
      </Box>
    </Box>
  );
};

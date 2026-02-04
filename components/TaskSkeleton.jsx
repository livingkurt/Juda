"use client";

import { Box, Skeleton, Stack } from "@mui/material";

/**
 * Loading skeleton for task items
 * Shows while tasks are being loaded
 */
export function TaskSkeleton({ count = 3 }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            p: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Checkbox skeleton */}
            <Skeleton variant="circular" width={24} height={24} />

            {/* Title skeleton */}
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
            </Box>

            {/* Time skeleton */}
            <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 0.5 }} />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Loading skeleton for section with tasks
 */
export function SectionSkeleton() {
  return (
    <Box sx={{ mb: 3 }}>
      {/* Section header skeleton */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Skeleton variant="text" width={150} height={32} />
        <Skeleton variant="circular" width={24} height={24} />
      </Stack>

      {/* Tasks skeleton */}
      <TaskSkeleton count={3} />
    </Box>
  );
}

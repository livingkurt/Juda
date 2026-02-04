"use client";

import { Box, Stack, Typography } from "@mui/material";
import { useColorMode } from "@/hooks/useColorMode";

/**
 * Reusable progress bar component showing completed, not completed, and unchecked tasks
 *
 * @param {Object} props
 * @param {number} props.completedTasks - Number of completed tasks
 * @param {number} props.totalTasks - Total number of tasks
 * @param {number} props.completedPercent - Percentage of completed tasks (0-100)
 * @param {number} props.notCompletedPercent - Percentage of not completed tasks (0-100)
 * @param {number} props.uncheckedPercent - Percentage of unchecked tasks (0-100)
 * @param {string} props.label - Label to display above progress bar
 * @param {boolean} props.showStats - Whether to show stats (default: true)
 * @param {number} props.height - Height of progress bar in pixels (default: 8)
 */
export function ProgressBar({
  completedTasks = 0,
  totalTasks = 0,
  completedPercent = 0,
  notCompletedPercent = 0,
  uncheckedPercent = 0,
  label = "Progress",
  showStats = true,
  height = 8,
}) {
  const { mode: colorMode } = useColorMode();

  return (
    <Box>
      {showStats && (
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {completedTasks}/{totalTasks} ({completedPercent}%)
          </Typography>
        </Stack>
      )}
      <Box
        sx={{
          height,
          bgcolor: "action.disabledBackground",
          borderRadius: "9999px",
          overflow: "hidden",
          position: "relative",
          display: "flex",
        }}
      >
        {completedPercent > 0 && (
          <Box
            sx={{
              height: "100%",
              background:
                colorMode === "dark"
                  ? "linear-gradient(to right, #48BB78, #4299E1)"
                  : "linear-gradient(to right, #38A169, #3182CE)",
              transition: "width 0.3s ease-in-out",
              width: `${completedPercent}%`,
            }}
          />
        )}
        {notCompletedPercent > 0 && (
          <Box
            sx={{
              height: "100%",
              background:
                colorMode === "dark"
                  ? "linear-gradient(to right, #E53E3E, #FC8181)"
                  : "linear-gradient(to right, #C53030, #E53E3E)",
              transition: "width 0.3s ease-in-out",
              width: `${notCompletedPercent}%`,
            }}
          />
        )}
        {uncheckedPercent > 0 && (
          <Box
            sx={{
              height: "100%",
              bgcolor: "action.disabledBackground",
              opacity: 0.5,
              transition: "width 0.3s ease-in-out",
              width: `${uncheckedPercent}%`,
            }}
          />
        )}
      </Box>
    </Box>
  );
}

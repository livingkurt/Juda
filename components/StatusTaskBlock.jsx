"use client";

import { memo } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { AccessTime, PlayCircle } from "@mui/icons-material";

export const StatusTaskBlock = memo(function StatusTaskBlock({
  task,
  top,
  height,
  isInProgress,
  startedAt,
  completedAt,
}) {
  // Calculate duration
  const startTime = startedAt ? new Date(startedAt) : new Date();
  const endTime = completedAt ? new Date(completedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <Box
      sx={{
        position: "absolute",
        top: `${top}px`,
        left: "4px",
        right: "4px",
        height: `${height}px`,
        bgcolor: isInProgress ? "info.light" : "success.light",
        borderLeft: "3px solid",
        borderColor: isInProgress ? "info.main" : "success.main",
        borderRadius: 1,
        px: 2,
        py: 1,
        cursor: "pointer",
        overflow: "hidden",
        opacity: isInProgress ? 1 : 0.8,
        "&:hover": {
          opacity: 1,
        },
      }}
      onClick={() => {
        // Handle edit task - this would need to be passed as prop or use hook
        // eslint-disable-next-line no-console
        console.log("Edit task:", task.id);
      }}
    >
      <Stack direction="row" spacing={1} sx={{ fontSize: "0.75rem" }}>
        {isInProgress ? <PlayCircle fontSize="inherit" /> : <AccessTime fontSize="inherit" />}
        <Typography
          variant="caption"
          sx={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {task.title}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary" }}>
        {durationText}
      </Typography>
    </Box>
  );
});

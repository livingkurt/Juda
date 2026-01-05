"use client";

import { memo } from "react";
import { Box, Text, Group } from "@mantine/core";
import { Clock, PlayCircle } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export const StatusTaskBlock = memo(function StatusTaskBlock({
  task,
  top,
  height,
  isInProgress,
  startedAt,
  completedAt,
}) {
  const { mode, status } = useSemanticColors();
  const taskOps = useTaskOperations();

  const bgColor = isInProgress ? status.infoBg : status.successBg;
  const borderColor = isInProgress ? status.info : status.success;

  // Calculate duration
  const startTime = startedAt ? new Date(startedAt) : new Date();
  const endTime = completedAt ? new Date(completedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <Box
      style={{
        position: "absolute",
        top: `${top}px`,
        left: "4px",
        right: "4px",
        height: `${height}px`,
        background: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "0.375rem",
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 4,
        paddingBottom: 4,
        cursor: "pointer",
        overflow: "hidden",
        opacity: isInProgress ? 1 : 0.8,
      }}
      onClick={() => taskOps.handleEditTask(task)}
      onMouseEnter={e => {
        const target = e.currentTarget;
        target.style.opacity = "1";
      }}
      onMouseLeave={e => {
        const target = e.currentTarget;
        target.style.opacity = isInProgress ? 1 : 0.8;
      }}
    >
      <Group gap={4} style={{ fontSize: "0.75rem" }}>
        {isInProgress ? <PlayCircle size={12} /> : <Clock size={12} />}
        <Text fw={500} lineClamp={1}>
          {task.title}
        </Text>
      </Group>
      <Text size="0.625rem" c={mode.text.muted}>
        {durationText}
      </Text>
    </Box>
  );
});

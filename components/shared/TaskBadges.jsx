"use client";

import { Stack, Chip } from "@mui/material";
import { isOverdue, getRecurrenceLabel } from "@/lib/utils";

/**
 * Renders task status badges (overdue, recurring, no-time, workout, end date)
 *
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Date} props.viewDate - Current view date for overdue calculation
 * @param {string} props.size - Badge size: "xs", "sm", "md"
 * @param {boolean} props.showEndDate - Whether to show end date badge
 * @param {boolean} props.compact - Use compact layout (fewer badges)
 * @param {Function} props.hasRecordOnDate - Function to check if task has record on date
 */
export const TaskBadges = ({ task, viewDate, size = "sm", showEndDate = true, compact = false, hasRecordOnDate }) => {
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const isRolloverTask = task.isRollover === true;
  const isOffScheduleTask = task.isOffSchedule === true;
  const taskIsOverdue =
    viewDate && hasRecordOnDate ? isOverdue(task, viewDate, hasRecordOnDate(task.id, viewDate)) : false;
  const hasEndDate = task.recurrence?.endDate;

  // Map sizes to MUI chip sizes
  const chipSizeMap = {
    xs: "small",
    sm: "small",
    md: "medium",
  };

  const chipSize = chipSizeMap[size] || "small";

  // Font sizes for different badge sizes
  const fontSizeMap = {
    xs: "0.625rem",
    sm: "0.75rem",
    md: "0.875rem",
  };

  const fontSize = fontSizeMap[size] || "0.75rem";

  // In compact mode, only show most important badge
  if (compact) {
    if (taskIsOverdue) {
      return (
        <Chip
          label="!"
          color="error"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      );
    }
    if (isRecurring) {
      return (
        <Chip
          label="↻"
          color="secondary"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      );
    }
    return null;
  }

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, rowGap: 0.5 }}>
      {taskIsOverdue && task.status !== "in_progress" && (
        <Chip
          label="Overdue"
          color="error"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}

      {isRecurring && (
        <Chip
          label={getRecurrenceLabel(task.recurrence) || "Recurring"}
          color="secondary"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}

      {isWorkoutTask && (
        <Chip
          label="Workout"
          color="primary"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}

      {showEndDate && hasEndDate && (
        <Chip
          label={`Until ${new Date(task.recurrence.endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`}
          color="warning"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}

      {/* {showNoTime && hasNoTime && (
        <Chip
          label="No time"
          color="warning"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )} */}

      {isOffScheduleTask && (
        <Chip
          label="Off-Schedule"
          color="info"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            bgcolor: "#3b82f6",
            color: "white",
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}

      {isRolloverTask && !isOffScheduleTask && (
        <Chip
          label="Rolled Over"
          color="warning"
          size={chipSize}
          sx={{
            fontSize,
            height: size === "xs" ? 18 : size === "sm" ? 20 : 24,
            bgcolor: "#f59e0b",
            color: "white",
            "& .MuiChip-label": {
              px: size === "xs" ? 0.5 : 0.75,
              fontSize,
            },
          }}
        />
      )}
    </Stack>
  );
};

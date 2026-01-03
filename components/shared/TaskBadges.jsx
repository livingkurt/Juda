"use client";

import { HStack, Badge } from "@chakra-ui/react";
import { isOverdue, getRecurrenceLabel } from "@/lib/utils";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * Renders task status badges (overdue, recurring, no-time, workout, end date)
 *
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Date} props.viewDate - Current view date for overdue calculation
 * @param {string} props.size - Badge size: "xs", "sm", "md"
 * @param {boolean} props.showNoTime - Whether to show "No time" badge
 * @param {boolean} props.showEndDate - Whether to show end date badge
 * @param {boolean} props.compact - Use compact layout (fewer badges)
 * @param {Function} props.hasRecordOnDate - Function to check if task has record on date
 */
export const TaskBadges = ({
  task,
  viewDate,
  size = "sm",
  showNoTime = true,
  showEndDate = true,
  compact = false,
  hasRecordOnDate,
}) => {
  const { badges } = useSemanticColors();

  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const taskIsOverdue =
    viewDate && hasRecordOnDate ? isOverdue(task, viewDate, hasRecordOnDate(task.id, viewDate)) : false;
  const hasEndDate = task.recurrence?.endDate;
  const hasNoTime = !task.time;

  // Responsive sizes
  const badgeSizes = {
    xs: { base: "2xs", md: "xs" },
    sm: { base: "xs", md: "sm" },
    md: { base: "sm", md: "md" },
  };

  const fontSize = {
    xs: { base: "3xs", md: "2xs" },
    sm: { base: "2xs", md: "xs" },
    md: { base: "xs", md: "sm" },
  };

  const padding = {
    xs: { py: 0, px: 1 },
    sm: { py: { base: 0, md: 0.5 }, px: { base: 1, md: 1.5 } },
    md: { py: 0.5, px: 2 },
  };

  // In compact mode, only show most important badge
  if (compact) {
    if (taskIsOverdue) {
      return (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.overdue.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          !
        </Badge>
      );
    }
    if (isRecurring) {
      return (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.recurring.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          ↻
        </Badge>
      );
    }
    return null;
  }

  return (
    <HStack spacing={1} flexWrap="wrap">
      {taskIsOverdue && task.status !== "in_progress" && (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.overdue.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          Overdue
        </Badge>
      )}

      {isRecurring && (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.recurring.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          {getRecurrenceLabel(task.recurrence) || "Recurring"}
        </Badge>
      )}

      {isWorkoutTask && (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.workout.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          Workout
        </Badge>
      )}

      {showEndDate && hasEndDate && (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.noTime.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          Until {new Date(task.recurrence.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Badge>
      )}

      {showNoTime && hasNoTime && (
        <Badge
          size={badgeSizes[size]}
          colorPalette={badges.noTime.colorPalette}
          fontSize={fontSize[size]}
          {...padding[size]}
        >
          No time
        </Badge>
      )}
    </HStack>
  );
};

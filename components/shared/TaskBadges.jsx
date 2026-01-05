"use client";

import { Group, Badge } from "@mantine/core";
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

  // Responsive sizes (Mantine array syntax: [xs, sm, md, lg, xl])
  const badgeSizes = {
    xs: ["xs", "xs"],
    sm: ["xs", "sm"],
    md: ["sm", "md"],
  };

  const fontSize = {
    xs: ["0.625rem", "0.625rem"],
    sm: ["0.625rem", "0.75rem"],
    md: ["0.75rem", "0.875rem"],
  };

  const padding = {
    xs: { py: 0, px: 4 },
    sm: { py: [0, 2], px: [4, 6] },
    md: { py: 2, px: 8 },
  };

  // In compact mode, only show most important badge
  if (compact) {
    if (taskIsOverdue) {
      return (
        <Badge
          size={badgeSizes[size]}
          color={badges.overdue.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          !
        </Badge>
      );
    }
    if (isRecurring) {
      return (
        <Badge
          size={badgeSizes[size]}
          color={badges.recurring.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          ↻
        </Badge>
      );
    }
    return null;
  }

  return (
    <Group gap={4} wrap="wrap">
      {taskIsOverdue && task.status !== "in_progress" && (
        <Badge
          size={badgeSizes[size]}
          color={badges.overdue.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          Overdue
        </Badge>
      )}

      {isRecurring && (
        <Badge
          size={badgeSizes[size]}
          color={badges.recurring.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          {getRecurrenceLabel(task.recurrence) || "Recurring"}
        </Badge>
      )}

      {isWorkoutTask && (
        <Badge
          size={badgeSizes[size]}
          color={badges.workout.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          Workout
        </Badge>
      )}

      {showEndDate && hasEndDate && (
        <Badge
          size={badgeSizes[size]}
          color={badges.noTime.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          Until {new Date(task.recurrence.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Badge>
      )}

      {showNoTime && hasNoTime && (
        <Badge
          size={badgeSizes[size]}
          color={badges.noTime.colorPalette}
          style={{
            fontSize: fontSize[size][0],
            paddingTop: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingBottom: Array.isArray(padding[size].py) ? padding[size].py[0] : padding[size].py,
            paddingLeft: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
            paddingRight: Array.isArray(padding[size].px) ? padding[size].px[0] : padding[size].px,
          }}
        >
          No time
        </Badge>
      )}
    </Group>
  );
};

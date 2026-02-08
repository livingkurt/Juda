"use client";

import { memo, useRef } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { CalendarTask } from "./CalendarTask";

export const DayHeaderColumn = memo(function DayHeaderColumn({
  day,
  dayIndex,
  untimedTasks,
  isToday,
  onDayClick,
  createDraggableId,
  getOutcomeOnDate,
  isCompletedOnDate,
  getCompletionForDate,
  completionHandlers,
  menuHandlers,
  onEdit,
}) {
  const untimedRef = useRef(null);

  return (
    <Box
      sx={{
        flex: 1,
        flexShrink: 0,
        flexGrow: 1,
        minWidth: 0,
        borderLeft: dayIndex === 0 ? 0 : isToday ? 1.5 : 1,
        borderRight: isToday ? 1.5 : 0,
        borderColor: isToday ? "primary.main" : "divider",
        bgcolor: isToday ? "action.selected" : "transparent",
      }}
    >
      {/* Day header */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          cursor: "pointer",
          bgcolor: isToday ? "action.selected" : "transparent",
          "&:hover": {
            bgcolor: isToday ? "action.selected" : "action.hover",
          },
        }}
        onClick={() => onDayClick(day)}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: { xs: "0.6rem", md: "0.75rem" },
            color: isToday ? "primary.main" : "text.secondary",
            fontWeight: isToday ? 500 : 400,
          }}
        >
          {DAYS_OF_WEEK[dayIndex].short}
        </Typography>
        <Box
          component="span"
          sx={{
            fontSize: { xs: "1rem", md: "1.125rem" },
            fontWeight: isToday ? 600 : 400,
            display: "inline-block",
            bgcolor: isToday ? "primary.main" : "transparent",
            color: isToday ? "primary.contrastText" : "inherit",
            borderRadius: "50%",
            width: 32,
            height: 32,
            lineHeight: "32px",
            boxShadow: isToday ? 1 : "none",
          }}
        >
          {day.getDate()}
        </Box>
      </Box>

      {/* Untimed tasks for this day */}
      <Box
        ref={untimedRef}
        sx={{
          px: 0.5,
          py: 0.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: isToday ? "action.selected" : "transparent",
          minHeight: untimedTasks.length > 0 ? "auto" : 0,
          maxHeight: "80px",
          overflowY: "auto",
          transition: "background-color 0.2s",
          flexShrink: 0,
        }}
      >
        <Stack spacing={0.5}>
          {untimedTasks.map(task => {
            const outcome = getOutcomeOnDate?.(task.id, day) ?? null;
            const isCompleted = isCompletedOnDate?.(task.id, day) || false;
            const isNotCompleted = outcome === "not_completed";
            const isRecurring = task.recurrence && task.recurrence.type !== "none";
            const isWorkoutTask = task.completionType === "workout";
            const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
            const completionForStartDate =
              task.recurrence?.startDate && getCompletionForDate?.(task.id, new Date(task.recurrence.startDate));
            const canEditCompletion = isNonRecurring && Boolean(completionForStartDate) && !task.parentId;

            return (
              <CalendarTask
                key={task.id}
                task={task}
                createDraggableId={createDraggableId}
                date={day}
                variant="untimed-week"
                outcome={outcome}
                isCompleted={isCompleted}
                isNotCompleted={isNotCompleted}
                isRecurring={isRecurring}
                isWorkoutTask={isWorkoutTask}
                onOutcomeChange={completionHandlers?.handleOutcomeChange}
                onRollover={completionHandlers?.handleRolloverTask}
                onEdit={onEdit}
                menuHandlers={menuHandlers}
                canEditCompletion={canEditCompletion}
              />
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
});

export default DayHeaderColumn;

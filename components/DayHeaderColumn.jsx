"use client";

import { memo } from "react";
import { Box, Typography, Stack } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { CalendarTask } from "./CalendarTask";

export const DayHeaderColumn = memo(function DayHeaderColumn({
  day,
  dayIndex,
  untimedTasks,
  isToday,
  onDayClick,
  createDroppableId,
  createDraggableId,
  dropHighlight,
}) {
  const untimedDroppableId = createDroppableId.calendarWeekUntimed(day);

  const { setNodeRef, isOver } = useDroppable({
    id: untimedDroppableId,
    data: { type: "TASK", date: day, isUntimed: true },
  });

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
        ref={setNodeRef}
        sx={{
          px: 0.5,
          py: 0.5,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: isOver ? dropHighlight : isToday ? "action.selected" : "transparent",
          minHeight: untimedTasks.length > 0 || isOver ? "auto" : 0,
          maxHeight: "80px",
          overflowY: "auto",
          transition: "background-color 0.2s",
          flexShrink: 0,
        }}
      >
        <Stack spacing={0.5}>
          {untimedTasks.map(task => (
            <CalendarTask
              key={task.id}
              task={task}
              createDraggableId={createDraggableId}
              date={day}
              variant="untimed-week"
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
});

export default DayHeaderColumn;

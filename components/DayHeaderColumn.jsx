"use client";

import { Box, Text, Stack } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { CalendarTask } from "./CalendarTask";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const DayHeaderColumn = ({
  day,
  dayIndex,
  untimedTasks,
  isToday,
  onDayClick,
  createDroppableId,
  createDraggableId,
  borderColor,
  dropHighlight,
  hourTextColor,
  hoverBg,
}) => {
  const { mode, calendar, interactive } = useSemanticColors();
  const untimedDroppableId = createDroppableId.calendarWeekUntimed(day);

  const { setNodeRef, isOver } = useDroppable({
    id: untimedDroppableId,
    data: { type: "TASK", date: day, isUntimed: true },
  });

  return (
    <Box
      style={{
        flex: 1,
        flexShrink: 0,
        flexGrow: 1,
        minWidth: 0,
        borderLeftWidth: dayIndex === 0 ? 0 : isToday ? 1.5 : 1,
        borderRightWidth: isToday ? 1.5 : 0,
        borderColor: isToday ? calendar.today : borderColor,
        borderStyle: "solid",
        background: isToday ? calendar.todayBg : "transparent",
      }}
    >
      {/* Day header */}
      <Box
        style={{
          textAlign: "center",
          paddingTop: 8,
          paddingBottom: 8,
          cursor: "pointer",
          background: isToday ? calendar.todayBg : "transparent",
        }}
        onMouseEnter={e => {
          const target = e.currentTarget;
          target.style.background = isToday ? calendar.selected : hoverBg;
        }}
        onMouseLeave={e => {
          const target = e.currentTarget;
          target.style.background = isToday ? calendar.todayBg : "transparent";
        }}
        onClick={() => onDayClick(day)}
      >
        <Text size={["0.625rem", "0.75rem"]} c={isToday ? interactive.primary : hourTextColor} fw={isToday ? 500 : 400}>
          {DAYS_OF_WEEK[dayIndex].short}
        </Text>
        <Box
          component="span"
          size={["md", "lg"]}
          fw={isToday ? 600 : 400}
          style={{
            display: "inline-block",
            background: isToday ? calendar.today : "transparent",
            color: isToday ? mode.text.inverse : "inherit",
            borderRadius: "50%",
            width: 32,
            height: 32,
            lineHeight: "32px",
            boxShadow: isToday ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)" : "none",
          }}
        >
          {day.getDate()}
        </Box>
      </Box>

      {/* Untimed tasks for this day */}
      <Box
        ref={setNodeRef}
        px={2}
        py={2}
        style={{
          borderTop: `1px solid ${borderColor}`,
          background: isOver ? dropHighlight : isToday ? calendar.todayBg : "transparent",
          minHeight: untimedTasks.length > 0 || isOver ? "auto" : 0,
          maxHeight: "80px",
          overflowY: "auto",
          transition: "background-color 0.2s",
          flexShrink: 0,
        }}
      >
        <Stack gap={2}>
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
};

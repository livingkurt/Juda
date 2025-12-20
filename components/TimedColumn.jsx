"use client";

import { Box } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { calculateTaskPositions } from "@/lib/utils";
import { TimedWeekTask } from "./TimedWeekTask";

export const TimedColumn = ({
  day,
  dayIndex,
  timedTasks,
  onTaskClick,
  handleColumnClick,
  handleDropTimeCalculation,
  createDroppableId,
  createDraggableId,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
  borderColor,
  dropHighlight,
}) => {
  const timedDroppableId = createDroppableId.calendarWeek(day);
  const { setNodeRef, isOver } = useDroppable({
    id: timedDroppableId,
    data: { type: "TASK", date: day, isUntimed: false },
  });

  return (
    <Box
      ref={setNodeRef}
      flex={1}
      flexShrink={0}
      flexGrow={1}
      minW={0}
      borderLeftWidth={dayIndex === 0 ? "0" : "1px"}
      borderColor={borderColor}
      position="relative"
      h="full"
      w="full"
      zIndex={2}
      onClick={e => {
        if (!isOver) {
          handleColumnClick(e, day);
        }
      }}
      bg={isOver ? dropHighlight : "transparent"}
      transition="background-color 0.2s"
      data-calendar-timed="true"
      data-calendar-view="week"
      data-hour-height={48}
      onMouseMove={e => {
        if (isOver) {
          handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
        }
      }}
    >
      {/* Render tasks */}
      {calculateTaskPositions(timedTasks).map(task => (
        <TimedWeekTask
          key={task.id}
          task={task}
          onTaskClick={onTaskClick}
          createDraggableId={createDraggableId}
          day={day}
          getTaskStyle={getTaskStyle}
          internalDrag={internalDrag}
          handleInternalDragStart={handleInternalDragStart}
        />
      ))}
    </Box>
  );
};

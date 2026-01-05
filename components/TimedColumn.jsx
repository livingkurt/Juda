"use client";

import { Box } from "@mantine/core";
import { useDroppable } from "@dnd-kit/core";
import { calculateTaskPositions } from "@/lib/utils";
import { CalendarTask } from "./CalendarTask";
import { StatusTaskBlock } from "./StatusTaskBlock";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

export const TimedColumn = ({
  day,
  dayIndex,
  timedTasks,
  allTasks = [],
  handleColumnClick,
  handleDropTimeCalculation,
  createDroppableId,
  createDraggableId,
  getTaskStyle,
  internalDrag,
  handleInternalDragStart,
  borderColor,
  dropHighlight,
  showStatusTasks = true,
  hourHeight = 48,
  isToday = false,
}) => {
  const { calendar } = useSemanticColors();
  const timedDroppableId = createDroppableId.calendarWeek(day);
  const { setNodeRef, isOver } = useDroppable({
    id: timedDroppableId,
    data: { type: "TASK", date: day, isUntimed: false },
  });

  // Use hooks directly (they use Redux internally)
  const { getCompletionForDate } = useCompletionHelpers();

  // Get preferences
  const { preferences } = usePreferencesContext();
  const showStatusTasksPref = preferences.showStatusTasks !== false;
  const actualShowStatusTasks = showStatusTasks && showStatusTasksPref;

  return (
    <Box
      ref={setNodeRef}
      style={{
        flex: 1,
        flexShrink: 0,
        flexGrow: 1,
        minWidth: 0,
        borderLeftWidth: dayIndex === 0 ? 0 : isToday ? 1 : 1,
        borderRightWidth: isToday ? 1 : 0,
        borderColor: isToday ? calendar.today : borderColor,
        borderStyle: "solid",
        position: "relative",
        height: "100%",
        width: "100%",
        zIndex: 2,
        background: isOver ? dropHighlight : isToday ? calendar.todayBg : "transparent",
        transition: "background-color 0.2s, border-color 0.2s",
      }}
      data-calendar-timed="true"
      data-calendar-view="week"
      data-hour-height={hourHeight}
      onClick={e => {
        if (!isOver) {
          handleColumnClick(e, day);
        }
      }}
      onMouseMove={e => {
        if (isOver) {
          handleDropTimeCalculation(e, e.currentTarget.getBoundingClientRect());
        }
      }}
    >
      {/* Current time line - only show on today's column */}
      {isToday && <CurrentTimeLine hourHeight={hourHeight} isVisible={true} />}

      {/* Render tasks */}
      {calculateTaskPositions(timedTasks).map(task => (
        <CalendarTask
          key={task.id}
          task={task}
          createDraggableId={createDraggableId}
          date={day}
          variant="timed-week"
          getTaskStyle={getTaskStyle}
          internalDrag={internalDrag}
          handleInternalDragStart={handleInternalDragStart}
        />
      ))}

      {/* Render status task blocks (in-progress and completed with time tracking) */}
      {actualShowStatusTasks &&
        getCompletionForDate &&
        allTasks
          .filter(task => {
            // Only show non-recurring tasks with status tracking
            if (task.recurrence && task.recurrence.type !== "none") return false;
            if (task.completionType === "note") return false;
            if (task.parentId) return false;

            // Show in-progress tasks
            if (task.status === "in_progress" && task.startedAt) return true;

            // Show completed tasks with timing data
            const completion = getCompletionForDate(task.id, day);
            return completion && completion.startedAt && completion.completedAt;
          })
          .map(task => {
            const isInProgress = task.status === "in_progress";
            let startedAt, completedAt, top, height;

            if (isInProgress) {
              // In-progress task: use task.startedAt to now
              startedAt = task.startedAt;
              completedAt = new Date().toISOString();

              const startTime = new Date(startedAt);
              const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
              const now = new Date();
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              const durationMinutes = nowMinutes - startMinutes;

              top = (startMinutes / 60) * hourHeight;
              height = (durationMinutes / 60) * hourHeight;
            } else {
              // Completed task: use completion timing data
              const completion = getCompletionForDate(task.id, day);
              startedAt = completion.startedAt;
              completedAt = completion.completedAt;

              const startTime = new Date(startedAt);
              const endTime = new Date(completedAt);
              const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
              const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
              const durationMinutes = endMinutes - startMinutes;

              top = (startMinutes / 60) * hourHeight;
              height = (durationMinutes / 60) * hourHeight;
            }

            return (
              <StatusTaskBlock
                key={`status-${task.id}`}
                task={task}
                top={top}
                height={height}
                isInProgress={isInProgress}
                startedAt={startedAt}
                completedAt={completedAt}
              />
            );
          })}
    </Box>
  );
};

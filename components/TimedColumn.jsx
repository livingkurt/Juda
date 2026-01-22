"use client";

import { memo, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import { CalendarTask } from "./CalendarTask";
import { StatusTaskBlock } from "./StatusTaskBlock";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

export const TimedColumn = memo(
  function TimedColumn({
    day,
    dayIndex,
    timedTasks,
    allTasks = [],
    handleColumnClick,
    handleDropTimeCalculation,
    createDraggableId,
    getTaskStyle,
    dropHighlight: _dropHighlight,
    showStatusTasks = true,
    hourHeight = 48,
    isToday = false,
  }) {
    const columnRef = useRef(null);

    // Use hooks directly (they use Redux internally)
    const { getCompletionForDate } = useCompletionHelpers();

    // Get preferences
    const { preferences } = usePreferencesContext();
    const showStatusTasksPref = preferences.showStatusTasks !== false;
    const actualShowStatusTasks = showStatusTasks && showStatusTasksPref;

    // Tasks are already positioned from parent (CalendarWeekView)
    // Just use them directly
    const positionedTasks = timedTasks;

    // Stable column click handler
    const handleColumnClickWrapper = useCallback(
      e => {
        handleColumnClick(e, day);
      },
      [handleColumnClick, day]
    );

    // Stable mouse move handler
    const handleMouseMove = useCallback(
      e => {
        if (columnRef.current) {
          handleDropTimeCalculation(e, columnRef.current.getBoundingClientRect());
        }
      },
      [handleDropTimeCalculation]
    );

    return (
      <Box
        ref={columnRef}
        sx={{
          flex: 1,
          flexShrink: 0,
          flexGrow: 1,
          minWidth: 0,
          borderLeft: dayIndex === 0 ? 0 : 1,
          borderRight: isToday ? 1 : 0,
          borderColor: isToday ? "primary.main" : "divider",
          position: "relative",
          height: "100%",
          width: "100%",
          zIndex: 2,
          bgcolor: isToday ? "action.selected" : "transparent",
          transition: "background-color 0.2s, border-color 0.2s",
        }}
        onClick={handleColumnClickWrapper}
        data-calendar-timed="true"
        data-calendar-view="week"
        data-hour-height={hourHeight}
        onMouseMove={handleMouseMove}
      >
        {/* Current time line - only show on today's column */}
        {isToday && <CurrentTimeLine hourHeight={hourHeight} startHour={0} />}

        {/* Render tasks */}
        {positionedTasks.map(positionedTask => (
          <CalendarTask
            key={positionedTask.id}
            task={positionedTask}
            createDraggableId={createDraggableId}
            date={day}
            variant="timed-week"
            getTaskStyle={task => getTaskStyle(task, positionedTask)}
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
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.day?.getTime() === nextProps.day?.getTime() &&
      prevProps.dayIndex === nextProps.dayIndex &&
      prevProps.timedTasks.length === nextProps.timedTasks.length &&
      prevProps.isToday === nextProps.isToday &&
      prevProps.hourHeight === nextProps.hourHeight &&
      prevProps.showStatusTasks === nextProps.showStatusTasks &&
      // Only check if tasks array reference changed (shallow comparison)
      prevProps.timedTasks === nextProps.timedTasks
    );
  }
);

export default TimedColumn;

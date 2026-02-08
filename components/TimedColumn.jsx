"use client";

import { memo, useCallback, useRef } from "react";
import { Box } from "@mui/material";
import { CalendarTask } from "./CalendarTask";
import { StatusTaskBlock } from "./StatusTaskBlock";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { usePreferencesContext } from "@/hooks/usePreferencesContext";

export const TimedColumn = memo(
  function TimedColumn({
    day,
    dayIndex,
    timedTasks,
    allTasks: _allTasks = [],
    statusTasks = [],
    handleColumnClick,
    handleDropTimeCalculation,
    createDraggableId,
    getTaskStyle,
    dropHighlight: _dropHighlight,
    showStatusTasks = true,
    hourHeight = 48,
    isToday = false,
    getOutcomeOnDate,
    isCompletedOnDate,
    getCompletionForDate,
    completionHandlers,
    menuHandlers,
    onEdit,
  }) {
    const columnRef = useRef(null);

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
        {positionedTasks.map(positionedTask => {
          const outcome = getOutcomeOnDate?.(positionedTask.id, day) ?? null;
          const isCompleted = isCompletedOnDate?.(positionedTask.id, day) || false;
          const isNotCompleted = outcome === "not_completed";
          const isRecurring = positionedTask.recurrence && positionedTask.recurrence.type !== "none";
          const isWorkoutTask = positionedTask.completionType === "workout";
          const isNonRecurring = !positionedTask.recurrence || positionedTask.recurrence.type === "none";
          const completionForStartDate =
            positionedTask.recurrence?.startDate &&
            getCompletionForDate?.(positionedTask.id, new Date(positionedTask.recurrence.startDate));
          const canEditCompletion = isNonRecurring && Boolean(completionForStartDate) && !positionedTask.parentId;

          return (
            <CalendarTask
              key={positionedTask.id}
              task={positionedTask}
              createDraggableId={createDraggableId}
              date={day}
              variant="timed-week"
              getTaskStyle={task => getTaskStyle(task, positionedTask)}
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

        {/* Render status task blocks (in-progress and completed with time tracking) */}
        {actualShowStatusTasks &&
          statusTasks.map(({ task, isInProgress, startedAt, completedAt, top, height }) => (
            <StatusTaskBlock
              key={`status-${task.id}`}
              task={task}
              top={top}
              height={height}
              isInProgress={isInProgress}
              startedAt={startedAt}
              completedAt={completedAt}
            />
          ))}
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
      prevProps.statusTasks === nextProps.statusTasks &&
      // Only check if tasks array reference changed (shallow comparison)
      prevProps.timedTasks === nextProps.timedTasks
    );
  }
);

export default TimedColumn;

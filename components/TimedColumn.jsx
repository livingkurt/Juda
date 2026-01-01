"use client";

import { Box } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { calculateTaskPositions } from "@/lib/utils";
import { TimedWeekTask } from "./TimedWeekTask";
import { StatusTaskBlock } from "./StatusTaskBlock";
import { CurrentTimeLine } from "./CurrentTimeLine";

export const TimedColumn = ({
  day,
  dayIndex,
  timedTasks,
  allTasks = [],
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
  isCompletedOnDate,
  getOutcomeOnDate,
  getCompletionForDate,
  showStatusTasks = true,
  hourHeight = 48,
  onEditTask,
  onEditWorkout,
  onOutcomeChange,
  onDuplicateTask,
  onDeleteTask,
  isToday = false,
  tags,
  onTagsChange,
  onCreateTag,
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
      borderLeftWidth={dayIndex === 0 ? "0" : isToday ? "1px" : "1px"}
      borderRightWidth={isToday ? "1px" : "0"}
      borderColor={isToday ? "blue.300" : borderColor}
      position="relative"
      h="full"
      w="full"
      zIndex={2}
      onClick={e => {
        if (!isOver) {
          handleColumnClick(e, day);
        }
      }}
      bg={
        isOver
          ? dropHighlight
          : isToday
            ? { _light: "rgba(59, 130, 246, 0.1)", _dark: "rgba(37, 99, 235, 0.15)" }
            : "transparent"
      }
      transition="background-color 0.2s, border-color 0.2s"
      data-calendar-timed="true"
      data-calendar-view="week"
      data-hour-height={hourHeight}
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
        <TimedWeekTask
          key={task.id}
          task={task}
          onTaskClick={onTaskClick}
          createDraggableId={createDraggableId}
          day={day}
          getTaskStyle={getTaskStyle}
          internalDrag={internalDrag}
          handleInternalDragStart={handleInternalDragStart}
          isCompletedOnDate={isCompletedOnDate}
          getOutcomeOnDate={getOutcomeOnDate}
          onEditTask={onEditTask}
          onEditWorkout={onEditWorkout}
          onOutcomeChange={onOutcomeChange}
          onDuplicateTask={onDuplicateTask}
          onDeleteTask={onDeleteTask}
          tags={tags}
          onTagsChange={onTagsChange}
          onCreateTag={onCreateTag}
        />
      ))}

      {/* Render status task blocks (in-progress and completed with time tracking) */}
      {showStatusTasks &&
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
                onTaskClick={onTaskClick}
                startedAt={startedAt}
                completedAt={completedAt}
              />
            );
          })}
    </Box>
  );
};

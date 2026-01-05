"use client";

import { memo } from "react";
import { Box, Stack, Typography, Chip } from "@mui/material";
import WorkoutExerciseCard from "./WorkoutExerciseCard";

/**
 * WorkoutDaySection - Groups exercises by day
 *
 * @param {Object} day - Day data with exercises
 * @param {Object} completionData - Completion data for this day
 * @param {Function} onSetToggle - Callback when set is toggled
 * @param {number} currentWeek - Current week number
 * @param {boolean} isCurrentDay - Whether this is the current day of week
 */
const WorkoutDaySection = memo(function WorkoutDaySection({
  day,
  completionData = {},
  onSetToggle,
  currentWeek = 1,
  isCurrentDay = false,
  onActualValueChange,
}) {
  // Check if set is complete based on exercise type
  const isSetComplete = (setData, exerciseType) => {
    if (setData?.outcome !== undefined) {
      return setData.outcome === "completed";
    }
    if (exerciseType === "distance") {
      return Boolean(setData?.time && setData?.distance && setData?.pace);
    }
    return Boolean(setData?.completed);
  };

  // Calculate progress
  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = day.exercises.reduce((sum, exercise) => {
    const exerciseData = completionData.exercises?.[exercise.id];
    if (!exerciseData?.sets) return sum;
    return sum + exerciseData.sets.filter(s => isSetComplete(s, exercise.type)).length;
  }, 0);

  return (
    <Box>
      {/* Day Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" fontWeight={600}>
            {day.name}
          </Typography>
          {isCurrentDay && <Chip label="TODAY" size="small" color="primary" />}
        </Stack>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {completedSets} / {totalSets} sets
        </Typography>
      </Stack>

      {/* Exercises */}
      <Stack spacing={2}>
        {day.exercises.map(exercise => (
          <WorkoutExerciseCard
            key={exercise.id}
            exercise={exercise}
            completionData={completionData.exercises?.[exercise.id] || {}}
            onSetToggle={(exerciseId, setNumber, outcome) => {
              onSetToggle?.(day.id, exerciseId, setNumber, outcome);
            }}
            currentWeek={currentWeek}
            onActualValueChange={(exerciseId, setNumber, field, value) => {
              onActualValueChange?.(day.id, exerciseId, setNumber, field, value);
            }}
          />
        ))}
      </Stack>
    </Box>
  );
});

export default WorkoutDaySection;

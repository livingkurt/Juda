"use client";

import { Box, Text, Stack, Title, Badge, Flex, Group } from "@mantine/core";
import WorkoutExerciseCard from "./WorkoutExerciseCard";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * WorkoutDaySection - Groups exercises by day within a workout section
 *
 * @param {Object} day - Day data with exercises
 * @param {Object} completionData - Completion data for this day
 * @param {Function} onSetToggle - Callback when a set is toggled
 * @param {number} currentWeek - Current week number
 * @param {boolean} isCurrentDay - Whether this is the current day
 */
export default function WorkoutDaySection({
  day,
  completionData = {},
  onSetToggle,
  currentWeek = 1,
  isCurrentDay = false,
  onActualValueChange = null,
}) {
  // Helper to check if a set is complete based on exercise type
  const isSetComplete = (setData, exerciseType) => {
    if (exerciseType === "distance") {
      // For distance exercises, all three fields must be filled
      return Boolean(setData.time && setData.distance && setData.pace);
    }
    // For reps/time exercises, check the completed flag
    return Boolean(setData.completed);
  };

  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = day.exercises.reduce((sum, exercise) => {
    const exerciseData = completionData.exercises?.[exercise.id];
    if (!exerciseData?.sets) return sum;
    return sum + exerciseData.sets.filter(s => isSetComplete(s, exercise.type)).length;
  }, 0);

  const { mode, calendar } = useSemanticColors();

  return (
    <Box
      style={{
        padding: 16,
        background: isCurrentDay ? calendar.todayBg : mode.bg.surface,
        borderRadius: "var(--mantine-radius-lg)",
        borderWidth: "2px",
        borderColor: isCurrentDay ? calendar.today : mode.border.default,
        borderStyle: "solid",
      }}
    >
      <Stack align="stretch" gap={16}>
        {/* Day header */}
        <Flex justify="space-between" align="center">
          <Group gap={8}>
            <Title size="md" c={isCurrentDay ? mode.text.link : mode.text.primary}>
              {day.name}
            </Title>
            {isCurrentDay && (
              <Badge color="blue" size="sm">
                Today
              </Badge>
            )}
          </Group>
          <Text size="sm" c={mode.text.secondary}>
            {completedSets} / {totalSets} sets
          </Text>
        </Flex>

        {/* Exercises */}
        <Stack align="stretch" gap={12}>
          {day.exercises.map(exercise => {
            const exerciseCompletion = completionData.exercises?.[exercise.id] || { sets: [] };

            return (
              <WorkoutExerciseCard
                key={exercise.id}
                exercise={exercise}
                completedSets={exerciseCompletion.sets || []}
                onSetToggle={onSetToggle}
                currentWeek={currentWeek}
                actualValue={exerciseCompletion.actualValue ?? null}
                onActualValueChange={onActualValueChange}
              />
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

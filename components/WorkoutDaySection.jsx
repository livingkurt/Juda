"use client";

import { Box, Text, VStack, Heading, Badge, Flex } from "@chakra-ui/react";
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
  // Helper to check if a set is complete based on outcome
  const isSetComplete = (setData, exerciseType) => {
    // Use outcome field if available (new system)
    if (setData.outcome !== undefined) {
      return setData.outcome === "completed";
    }

    // Fallback to old system for backward compatibility
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
      p={4}
      bg={isCurrentDay ? calendar.todayBg : mode.bg.surface}
      borderRadius="lg"
      borderWidth="2px"
      borderColor={isCurrentDay ? calendar.today : mode.border.default}
    >
      <VStack align="stretch" gap={4}>
        {/* Day header */}
        <Flex justify="space-between" align="center">
          <Heading size="md" color={isCurrentDay ? mode.text.link : mode.text.primary}>
            {day.name}
            {isCurrentDay && (
              <Badge ml={2} colorPalette="blue" size="sm">
                Today
              </Badge>
            )}
          </Heading>
          <Text fontSize="sm" color={mode.text.secondary}>
            {completedSets} / {totalSets} sets
          </Text>
        </Flex>

        {/* Exercises */}
        <VStack align="stretch" gap={3}>
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
        </VStack>
      </VStack>
    </Box>
  );
}

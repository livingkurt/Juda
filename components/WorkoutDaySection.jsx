"use client";

import { Box, Text, VStack, Heading, Badge, Flex } from "@chakra-ui/react";
import WorkoutExerciseCard from "./WorkoutExerciseCard";

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

  return (
    <Box
      p={4}
      bg={{ _light: isCurrentDay ? "blue.50" : "white", _dark: isCurrentDay ? "blue.900" : "gray.800" }}
      borderRadius="lg"
      borderWidth="2px"
      borderColor={{ _light: isCurrentDay ? "blue.400" : "gray.200", _dark: isCurrentDay ? "blue.600" : "gray.700" }}
    >
      <VStack align="stretch" gap={4}>
        {/* Day header */}
        <Flex justify="space-between" align="center">
          <Heading
            size="md"
            color={{ _light: isCurrentDay ? "blue.700" : "gray.800", _dark: isCurrentDay ? "blue.300" : "gray.100" }}
          >
            {day.name}
            {isCurrentDay && (
              <Badge ml={2} colorPalette="blue" size="sm">
                Today
              </Badge>
            )}
          </Heading>
          <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
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
              />
            );
          })}
        </VStack>
      </VStack>
    </Box>
  );
}

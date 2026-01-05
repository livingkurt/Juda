"use client";

import { Box, Text, Flex, Input, HStack, VStack, Badge } from "@chakra-ui/react";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import { OutcomeCheckbox } from "./OutcomeCheckbox";

/**
 * WorkoutExerciseCard - Displays a single exercise with set tracking
 *
 * @param {Object} exercise - Exercise data
 * @param {Array} completedSets - Array of SetCompletion objects
 * @param {Function} onSetToggle - Callback when a set is toggled
 * @param {number} currentWeek - Current week number for progression
 */
export default function WorkoutExerciseCard({
  exercise,
  completedSets = [],
  onSetToggle,
  currentWeek = 1,
  actualValue = null,
  onActualValueChange = null,
}) {
  const { mode } = useSemanticColors();

  // Get target value for current week
  const weeklyTarget = exercise.weeklyProgression?.find(w => w.week === currentWeek);
  const targetValue = weeklyTarget?.targetValue ?? exercise.targetValue;
  const isDeload = weeklyTarget?.isDeload ?? false;
  const isTest = weeklyTarget?.isTest ?? false;

  // Helper to get exercise label
  const getExerciseLabel = () => {
    if (exercise.type === "time") {
      return exercise.unit === "mins" ? "Time (minutes)" : "Time (seconds)";
    }
    if (exercise.type === "distance") {
      return "Distance (miles)";
    }
    return "Reps";
  };

  // Format display based on exercise type
  const getDisplayText = () => {
    if (isTest) {
      return `${exercise.sets} sets - Test Week`;
    }
    if (targetValue === null) {
      return `${exercise.sets} sets - Max Effort`;
    }
    return `${exercise.sets} x ${targetValue} ${exercise.unit}`;
  };

  // Get outcome for a set
  const getSetOutcome = setNumber => {
    const setData = completedSets.find(s => s.setNumber === setNumber);
    return setData?.outcome || null;
  };

  // Get actual value for a set
  const getSetActualValue = setNumber => {
    const setData = completedSets.find(s => s.setNumber === setNumber);
    return setData?.actualValue ?? "";
  };

  // Handle outcome change (completed/not_completed/null)
  const handleOutcomeChange = (setNumber, outcome) => {
    const existingSet = completedSets.find(s => s.setNumber === setNumber) || {};

    // When marking as completed, automatically set actualValue to targetValue if not already set
    const updatedData = {
      ...existingSet,
      setNumber,
      outcome: outcome,
    };

    // Auto-fill actualValue with targetValue when completing (only for reps/time exercises)
    if (outcome === "completed" && (exercise.type === "reps" || exercise.type === "time")) {
      // Only set if there's no existing actualValue
      if (!existingSet.actualValue && targetValue) {
        updatedData.actualValue = parseInt(targetValue, 10);
      }
    }

    onSetToggle(exercise.id, setNumber, updatedData);
  };

  // Handle actual value change
  const handleActualValueChange = (setNumber, value) => {
    const existingSet = completedSets.find(s => s.setNumber === setNumber) || {};
    const parsedValue = value === "" ? null : parseInt(value, 10);

    onSetToggle(exercise.id, setNumber, {
      ...existingSet,
      setNumber,
      actualValue: parsedValue,
    });
  };

  const handleValueChange = (setNumber, field, value) => {
    const existingSet = completedSets.find(s => s.setNumber === setNumber) || {};

    onSetToggle(exercise.id, setNumber, {
      ...existingSet,
      setNumber,
      [field]: value,
    });
  };

  const renderSetInput = setNumber => {
    const outcome = getSetOutcome(setNumber);
    const actualValue = getSetActualValue(setNumber);
    const isNotCompleted = outcome === "not_completed";

    if (exercise.type === "distance") {
      // Running exercise - show time, distance, pace inputs
      const setData = completedSets.find(s => s.setNumber === setNumber) || {};
      return (
        <VStack gap={2} w="full" align="stretch">
          <HStack>
            <Text fontSize="xs" color={mode.text.secondary} minW="50px">
              Time:
            </Text>
            <Input
              size="sm"
              placeholder="08:05"
              value={setData.time || ""}
              onChange={e => handleValueChange(setNumber, "time", e.target.value)}
              bg={mode.bg.surface}
            />
          </HStack>
          <HStack>
            <Text fontSize="xs" color={mode.text.secondary} minW="50px">
              Miles:
            </Text>
            <Input
              size="sm"
              type="number"
              step="0.01"
              placeholder="1.02"
              value={setData.distance || ""}
              onChange={e => handleValueChange(setNumber, "distance", parseFloat(e.target.value) || "")}
              bg={mode.bg.surface}
            />
          </HStack>
          <HStack>
            <Text fontSize="xs" color={mode.text.secondary} minW="50px">
              Pace:
            </Text>
            <Input
              size="sm"
              placeholder="7:55"
              value={setData.pace || ""}
              onChange={e => handleValueChange(setNumber, "pace", e.target.value)}
              bg={mode.bg.surface}
            />
          </HStack>
        </VStack>
      );
    }

    // Reps or time - outcome checkbox + actual value input
    return (
      <HStack gap={2} align="flex-start">
        {/* Set label on the left */}
        <Text fontSize="md" color={mode.text.secondary} minW="40px">
          Set {setNumber}
        </Text>

        {/* Checkbox and input stacked vertically */}
        <VStack gap={1} align="stretch">
          {/* Outcome checkbox */}
          <OutcomeCheckbox
            outcome={outcome}
            onOutcomeChange={newOutcome => handleOutcomeChange(setNumber, newOutcome)}
            size="md"
          />

          {/* Actual value input below checkbox */}
          <Input
            size="sm"
            type="number"
            placeholder={exercise.type === "reps" ? "Reps" : "Secs"}
            value={actualValue}
            onChange={e => handleActualValueChange(setNumber, e.target.value)}
            disabled={isNotCompleted}
            bg={mode.bg.surface}
            w="100px"
            opacity={isNotCompleted ? 0.5 : 1}
            borderRadius="md"
            borderColor={mode.border.default}
            borderWidth="1px"
            _hover={{
              borderColor: mode.border.hover,
            }}
            _focus={{
              borderColor: mode.border.focus,
            }}
          />
        </VStack>
      </HStack>
    );
  };

  // For distance exercises, show expanded layout
  if (exercise.type === "distance") {
    return (
      <Box p={3} bg={mode.bg.muted} borderRadius="md" borderWidth="1px" borderColor={mode.border.default}>
        <VStack align="stretch" gap={2}>
          {/* Exercise header */}
          <Flex justify="space-between" align="center">
            <HStack gap={2}>
              <Text fontWeight="semibold" fontSize="md">
                {exercise.name}
              </Text>
              <Text fontSize="md" color={mode.text.secondary}>
                {getDisplayText()}
              </Text>
              {isDeload && (
                <Badge colorPalette="orange" size="sm">
                  Deload
                </Badge>
              )}
              {isTest && (
                <Badge colorPalette="purple" size="sm">
                  TEST
                </Badge>
              )}
            </HStack>
            {exercise.goal && (
              <Badge colorPalette="blue" size="sm">
                {exercise.goal}
              </Badge>
            )}
          </Flex>

          {/* Distance inputs */}
          {renderSetInput(1)}
        </VStack>
      </Box>
    );
  }

  // For reps/time exercises, show compact horizontal layout
  return (
    <Box p={3} bg={mode.bg.muted} borderRadius="md" borderWidth="1px" borderColor={mode.border.default}>
      <VStack align="stretch" gap={2}>
        {/* Top row: Exercise name and set inputs */}
        <Flex
          direction={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={3}
        >
          <Text fontWeight="semibold" fontSize="md" flexShrink={1} minW={0}>
            {exercise.name}
          </Text>
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={2}
            flexShrink={0}
            align={{ base: "flex-start", md: "center" }}
          >
            {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNumber => (
              <Box key={setNumber} flexShrink={0}>
                {renderSetInput(setNumber)}
              </Box>
            ))}
          </Flex>
        </Flex>

        {/* Bottom row: Reps info and badges */}
        <HStack gap={2}>
          <Text fontSize="sm" color={mode.text.secondary}>
            {getDisplayText()}
          </Text>
          {isDeload && (
            <Badge colorPalette="orange" size="sm">
              Deload
            </Badge>
          )}
          {isTest && (
            <Badge colorPalette="purple" size="sm">
              TEST
            </Badge>
          )}
          {exercise.goal && (
            <Badge colorPalette="blue" size="sm">
              {exercise.goal}
            </Badge>
          )}
        </HStack>

        {/* Actual value input for test weeks */}
        {isTest && onActualValueChange && (
          <Box>
            <HStack gap={2} align="flex-end">
              <Text fontSize="xs" color={mode.text.secondary} minW="80px">
                Actual {getExerciseLabel()}:
              </Text>
              <Input
                type="number"
                step={exercise.type === "distance" ? "0.01" : "1"}
                size="sm"
                placeholder={`Enter actual ${getExerciseLabel().toLowerCase()}`}
                value={actualValue ?? ""}
                onChange={e => {
                  const value = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                  onActualValueChange(exercise.id, value);
                }}
                bg={mode.bg.surface}
                flex={1}
              />
            </HStack>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

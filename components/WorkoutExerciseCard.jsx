"use client";

import { Box, Text, Flex, Checkbox, TextInput, Group, Stack, Badge } from "@mantine/core";
import { useSemanticColors } from "@/hooks/useSemanticColors";

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

  const handleSetClick = setNumber => {
    const existingSet = completedSets.find(s => s.setNumber === setNumber);

    if (exercise.type === "reps" || exercise.type === "time") {
      // Toggle checkbox for reps/time exercises
      onSetToggle(exercise.id, setNumber, {
        setNumber,
        completed: !existingSet?.completed,
      });
    }
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
    const setData = completedSets.find(s => s.setNumber === setNumber) || {};

    if (exercise.type === "distance") {
      // Running exercise - show time, distance, pace inputs
      return (
        <Stack gap={8} style={{ width: "100%" }} align="stretch">
          <Group gap={8}>
            <Text size="xs" c={mode.text.secondary} style={{ minWidth: "50px" }}>
              Time:
            </Text>
            <TextInput
              size="sm"
              placeholder="08:05"
              value={setData.time || ""}
              onChange={e => handleValueChange(setNumber, "time", e.target.value)}
              styles={{
                input: {
                  backgroundColor: mode.bg.surface,
                },
              }}
            />
          </Group>
          <Group gap={8}>
            <Text size="xs" c={mode.text.secondary} style={{ minWidth: "50px" }}>
              Miles:
            </Text>
            <TextInput
              size="sm"
              type="number"
              step="0.01"
              placeholder="1.02"
              value={setData.distance || ""}
              onChange={e => handleValueChange(setNumber, "distance", parseFloat(e.target.value) || "")}
              styles={{
                input: {
                  backgroundColor: mode.bg.surface,
                },
              }}
            />
          </Group>
          <Group gap={8}>
            <Text size="xs" c={mode.text.secondary} style={{ minWidth: "50px" }}>
              Pace:
            </Text>
            <TextInput
              size="sm"
              placeholder="7:55"
              value={setData.pace || ""}
              onChange={e => handleValueChange(setNumber, "pace", e.target.value)}
              styles={{
                input: {
                  backgroundColor: mode.bg.surface,
                },
              }}
            />
          </Group>
        </Stack>
      );
    }

    // Reps or time - simple checkbox
    return (
      <Checkbox
        size="lg"
        checked={setData.completed || false}
        onChange={() => handleSetClick(setNumber)}
        color="blue"
        label={<Text size="sm">Set {setNumber}</Text>}
      />
    );
  };

  // For distance exercises, show expanded layout
  if (exercise.type === "distance") {
    return (
      <Box
        style={{
          padding: 12,
          background: mode.bg.muted,
          borderRadius: "var(--mantine-radius-md)",
          borderWidth: "1px",
          borderColor: mode.border.default,
          borderStyle: "solid",
        }}
      >
        <Stack align="stretch" gap={8}>
          {/* Exercise header */}
          <Flex justify="space-between" align="center">
            <Group gap={8}>
              <Text fw={600} size="md">
                {exercise.name}
              </Text>
              <Text size="md" c={mode.text.secondary}>
                {getDisplayText()}
              </Text>
              {isDeload && (
                <Badge color="orange" size="sm">
                  Deload
                </Badge>
              )}
              {isTest && (
                <Badge color="purple" size="sm">
                  TEST
                </Badge>
              )}
            </Group>
            {exercise.goal && (
              <Badge color="blue" size="sm">
                {exercise.goal}
              </Badge>
            )}
          </Flex>

          {/* Distance inputs */}
          {renderSetInput(1)}
        </Stack>
      </Box>
    );
  }

  // For reps/time exercises, show compact horizontal layout
  return (
    <Box
      style={{
        padding: 12,
        background: mode.bg.muted,
        borderRadius: "var(--mantine-radius-md)",
        borderWidth: "1px",
        borderColor: mode.border.default,
        borderStyle: "solid",
      }}
    >
      <Stack align="stretch" gap={8}>
        {/* Top row: Exercise name and checkboxes */}
        <Flex align="center" justify="space-between" gap={12}>
          <Text fw={600} size="md">
            {exercise.name}
          </Text>
          <Group gap={8}>
            {Array.from({ length: exercise.sets }, (_, i) => i + 1).map(setNumber => (
              <Box key={setNumber}>{renderSetInput(setNumber)}</Box>
            ))}
          </Group>
        </Flex>

        {/* Bottom row: Reps info and badges */}
        <Group gap={8}>
          <Text size="sm" c={mode.text.secondary}>
            {getDisplayText()}
          </Text>
          {isDeload && (
            <Badge color="orange" size="sm">
              Deload
            </Badge>
          )}
          {isTest && (
            <Badge color="purple" size="sm">
              TEST
            </Badge>
          )}
          {exercise.goal && (
            <Badge color="blue" size="sm">
              {exercise.goal}
            </Badge>
          )}
        </Group>

        {/* Actual value input for test weeks */}
        {isTest && onActualValueChange && (
          <Box>
            <Group gap={8} align="flex-end">
              <Text size="xs" c={mode.text.secondary} style={{ minWidth: "80px" }}>
                Actual {getExerciseLabel()}:
              </Text>
              <TextInput
                type="number"
                step={exercise.type === "distance" ? "0.01" : "1"}
                size="sm"
                placeholder={`Enter actual ${getExerciseLabel().toLowerCase()}`}
                value={actualValue ?? ""}
                onChange={e => {
                  const value = e.target.value === "" ? null : parseFloat(e.target.value) || 0;
                  onActualValueChange(exercise.id, value);
                }}
                styles={{
                  input: {
                    backgroundColor: mode.bg.surface,
                  },
                }}
                style={{ flex: 1 }}
              />
            </Group>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

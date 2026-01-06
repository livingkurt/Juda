"use client";

import { memo } from "react";
import { Box, Stack, Typography, Paper, TextField, Chip } from "@mui/material";
import { OutcomeCheckbox } from "./OutcomeCheckbox";

/**
 * WorkoutExerciseCard - Displays a single exercise with its sets
 *
 * @param {Object} exercise - Exercise data with sets, type, targetValue
 * @param {Object} completionData - Set completion data { sets: [...] }
 * @param {Function} onSetToggle - (exerciseId, setNumber, outcome) => void
 * @param {number} currentWeek - Current week number for progression
 * @param {Function} onActualValueChange - (exerciseId, setNumber, field, value) => void
 */
const WorkoutExerciseCard = memo(function WorkoutExerciseCard({
  exercise,
  completionData = {},
  onSetToggle,
  currentWeek = 1,
  onActualValueChange,
}) {
  // Get target value for current week
  const weekProgression = exercise.weeklyProgression?.find(p => p.week === currentWeek);
  const targetValue = weekProgression?.targetValue || exercise.targetValue || 0;
  const isDeload = weekProgression?.isDeload;
  const isTest = weekProgression?.isTest;

  // Check if a set is complete
  const isSetComplete = setData => {
    if (setData?.outcome !== undefined) {
      return setData.outcome === "completed";
    }
    if (exercise.type === "distance") {
      return Boolean(setData?.time && setData?.distance && setData?.pace);
    }
    return Boolean(setData?.completed);
  };

  // Count completed sets
  const completedSets = completionData.sets?.filter(s => isSetComplete(s)).length || 0;

  // Format target display
  const getTargetDisplay = () => {
    if (exercise.type === "time") {
      return `${exercise.sets} x ${targetValue} ${exercise.unit || "secs"}`;
    }
    if (exercise.type === "distance") {
      return `${exercise.sets} x ${targetValue} ${exercise.unit || "miles"}`;
    }
    return `${exercise.sets} x ${targetValue} reps`;
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        transition: "background-color 0.3s",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={exercise.type !== "distance" ? 1 : 2}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
            {exercise.name}
          </Typography>
          {exercise.type !== "distance" && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                {getTargetDisplay()}
              </Typography>
              {exercise.goal && (
                <Chip
                  label={exercise.goal}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 24, mt: 0.5 }}
                />
              )}
            </>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="flex-start">
          {exercise.type !== "distance" && (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              {Array.from({ length: exercise.sets }, (_, i) => {
                const setNumber = i + 1;
                const setData = completionData.sets?.find(s => s.setNumber === setNumber) || {};
                const outcome = setData.outcome || null;
                const isComplete = isSetComplete(setData);

                return (
                  <Stack key={setNumber} spacing={1} alignItems="center" sx={{ width: 80, minHeight: 60 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ height: 24 }}>
                      <Typography variant="body1" fontWeight={600}>
                        Set {setNumber}
                      </Typography>
                      <Box
                        sx={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <OutcomeCheckbox
                          outcome={outcome}
                          onOutcomeChange={newOutcome => {
                            onSetToggle?.(exercise.id, setNumber, newOutcome);
                            // Auto-fill target value when checked
                            if (newOutcome === "completed" && !setData.actualValue) {
                              onActualValueChange?.(exercise.id, setNumber, "actualValue", targetValue);
                            }
                            // Clear value when unchecked
                            if (newOutcome !== "completed" && setData.actualValue) {
                              onActualValueChange?.(exercise.id, setNumber, "actualValue", "");
                            }
                          }}
                          isChecked={isComplete}
                          size="lg"
                        />
                      </Box>
                    </Stack>
                    <TextField
                      size="small"
                      placeholder="Reps"
                      value={setData.actualValue || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "actualValue", e.target.value)}
                    />
                  </Stack>
                );
              })}
            </Stack>
          )}
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {isDeload && <Chip label="Deload" size="small" color="info" sx={{ height: 20 }} />}
            {isTest && <Chip label="Test" size="small" color="warning" sx={{ height: 20 }} />}
          </Stack>
        </Stack>
      </Stack>

      {/* Sets - Column Layout */}
      {exercise.type === "distance" ? (
        // Distance exercise - full width with time, distance, pace inputs
        <Box>
          {Array.from({ length: exercise.sets }, (_, i) => {
            const setNumber = i + 1;
            const setData = completionData.sets?.find(s => s.setNumber === setNumber) || {};
            const outcome = setData.outcome || null;
            const isComplete = isSetComplete(setData);

            return (
              <Paper
                key={setNumber}
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 1,
                  bgcolor: isComplete ? "success.dark" : "background.default",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" mb={1} sx={{ height: 24 }}>
                  <Typography variant="caption" fontWeight={600} sx={{ minWidth: 60 }}>
                    Set {setNumber}
                  </Typography>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <OutcomeCheckbox
                      outcome={outcome}
                      onOutcomeChange={newOutcome => {
                        onSetToggle?.(exercise.id, setNumber, newOutcome);
                        // Auto-fill target value when checked (for distance exercises)
                        if (newOutcome === "completed") {
                          if (!setData.distance) {
                            onActualValueChange?.(exercise.id, setNumber, "distance", targetValue);
                          }
                        }
                        // Clear values when unchecked
                        if (newOutcome !== "completed") {
                          if (setData.distance) {
                            onActualValueChange?.(exercise.id, setNumber, "distance", "");
                          }
                          if (setData.time) {
                            onActualValueChange?.(exercise.id, setNumber, "time", "");
                          }
                          if (setData.pace) {
                            onActualValueChange?.(exercise.id, setNumber, "pace", "");
                          }
                        }
                      }}
                      isChecked={isComplete}
                      size="sm"
                    />
                  </Box>
                </Stack>
                <Stack direction="column" spacing={1}>
                  <Box sx={{ width: "100%", maxWidth: "100%" }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Time"
                      placeholder="08:05"
                      value={setData.time || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "time", e.target.value)}
                      sx={{ "& input": { fontSize: "0.75rem" } }}
                    />
                  </Box>
                  <Box sx={{ width: "100%", maxWidth: "100%" }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Distance"
                      type="number"
                      placeholder={String(targetValue)}
                      value={setData.distance || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "distance", e.target.value)}
                      sx={{ "& input": { fontSize: "0.75rem" } }}
                    />
                  </Box>
                  <Box sx={{ width: "100%", maxWidth: "100%" }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Pace"
                      placeholder="7:55"
                      value={setData.pace || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "pace", e.target.value)}
                      sx={{ "& input": { fontSize: "0.75rem" } }}
                    />
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Box>
      ) : null}

      {/* Progress indicator */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
        {completedSets} / {exercise.sets} sets
      </Typography>
    </Paper>
  );
});

export default WorkoutExerciseCard;

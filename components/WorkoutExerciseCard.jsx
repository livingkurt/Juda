"use client";

import { memo } from "react";
import { Box, Stack, Typography, Paper, TextField, Chip, Grid } from "@mui/material";
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
        bgcolor: completedSets === exercise.sets ? "success.dark" : "background.paper",
        transition: "background-color 0.3s",
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {exercise.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {getTargetDisplay()}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          {isDeload && <Chip label="Deload" size="small" color="info" sx={{ height: 20 }} />}
          {isTest && <Chip label="Test" size="small" color="warning" sx={{ height: 20 }} />}
          {exercise.goal && (
            <Chip label={exercise.goal} size="small" color="primary" variant="outlined" sx={{ height: 24 }} />
          )}
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
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Typography variant="caption" fontWeight={600} sx={{ minWidth: 60 }}>
                    Set {setNumber}
                  </Typography>
                  <OutcomeCheckbox
                    outcome={outcome}
                    onOutcomeChange={newOutcome => onSetToggle?.(exercise.id, setNumber, newOutcome)}
                    isChecked={isComplete}
                    size="sm"
                  />
                </Stack>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Time"
                      placeholder="08:05"
                      value={setData.time || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "time", e.target.value)}
                      sx={{ "& input": { fontSize: "0.75rem" } }}
                    />
                  </Grid>
                  <Grid item xs={4}>
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
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Pace"
                      placeholder="7:55"
                      value={setData.pace || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "pace", e.target.value)}
                      sx={{ "& input": { fontSize: "0.75rem" } }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            );
          })}
        </Box>
      ) : (
        // Reps/Time exercise - column layout with Set 1, Set 2, Set 3 headers
        <Box>
          <Stack direction="row" spacing={1} mb={1}>
            {Array.from({ length: exercise.sets }, (_, i) => {
              const setNumber = i + 1;
              return (
                <Box key={setNumber} sx={{ flex: 1, textAlign: "center" }}>
                  <Typography variant="caption" fontWeight={600}>
                    Set {setNumber}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={1}>
            {Array.from({ length: exercise.sets }, (_, i) => {
              const setNumber = i + 1;
              const setData = completionData.sets?.find(s => s.setNumber === setNumber) || {};
              const outcome = setData.outcome || null;
              const isComplete = isSetComplete(setData);

              return (
                <Box key={setNumber} sx={{ flex: 1 }}>
                  <Stack spacing={1} alignItems="center">
                    <OutcomeCheckbox
                      outcome={outcome}
                      onOutcomeChange={newOutcome => onSetToggle?.(exercise.id, setNumber, newOutcome)}
                      isChecked={isComplete}
                      size="sm"
                    />
                    <TextField
                      size="small"
                      placeholder="Reps"
                      value={setData.actualValue || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "actualValue", e.target.value)}
                      sx={{
                        width: "100%",
                        "& input": {
                          fontSize: "0.75rem",
                          textAlign: "center",
                          py: 0.5,
                        },
                      }}
                      inputProps={{
                        style: { textAlign: "center" },
                      }}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Progress indicator */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: "block" }}>
        {completedSets} / {exercise.sets} sets
      </Typography>
    </Paper>
  );
});

export default WorkoutExerciseCard;

"use client";

import { memo } from "react";
import { Box, Stack, Typography, Paper, TextField, Chip, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { OutcomeCheckbox } from "./OutcomeCheckbox";
import CountdownTimer from "./CountdownTimer";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Get target value for current week
  const weekProgression = exercise.weeklyProgression?.find(p => p.week === currentWeek);

  // Parse targetValue as number since it's stored as text in DB
  // If no progression found for current week, fall back to exercise.targetValue
  const targetValue = weekProgression?.targetValue
    ? typeof weekProgression.targetValue === "string"
      ? parseFloat(weekProgression.targetValue)
      : weekProgression.targetValue
    : exercise.targetValue || 0;
  const isDeload = weekProgression?.isDeload || false;
  const isTest = weekProgression?.isTest || false;

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
      return `${exercise.sets > 1 ? `${exercise.sets} x` : ""} ${targetValue} ${exercise.unit || "secs"}`;
    }
    if (exercise.type === "distance") {
      return `${exercise.sets > 1 ? `${exercise.sets} x` : ""} ${targetValue} ${exercise.unit || "miles"}`;
    }
    return `${exercise.sets > 1 ? `${exercise.sets} x` : ""} ${targetValue} reps`;
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
        direction={isMobile && exercise.type !== "distance" ? "column" : "row"}
        justifyContent="space-between"
        alignItems="flex-start"
        mb={exercise.type !== "distance" ? 1 : 2}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
            {exercise.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            {getTargetDisplay()}
          </Typography>
          {exercise.goal && (
            <Chip label={exercise.goal} size="small" color="primary" variant="outlined" sx={{ height: 24, mt: 0.5 }} />
          )}
        </Box>

        {!isMobile && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            {exercise.type !== "distance" && exercise.type !== "time" && (
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
                        placeholder={exercise.unit}
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
        )}

        {isMobile && exercise.type !== "distance" && (
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {isDeload && <Chip label="Deload" size="small" color="info" sx={{ height: 20 }} />}
            {isTest && <Chip label="Test" size="small" color="warning" sx={{ height: 20 }} />}
          </Stack>
        )}
      </Stack>

      {/* Time-based exercises: Sets with checkbox, input, and timer grouped together */}
      {exercise.type === "time" && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {Array.from({ length: exercise.sets }, (_, i) => {
            const setNumber = i + 1;
            const setData = completionData.sets?.find(s => s.setNumber === setNumber) || {};
            const outcome = setData.outcome || null;
            const isComplete = isSetComplete(setData);

            // Convert target value to seconds based on unit
            const getTargetSeconds = () => {
              const unit = exercise.unit?.toLowerCase() || "secs";
              if (unit === "mins" || unit === "min" || unit === "minutes") {
                return targetValue * 60;
              }
              if (unit === "hours" || unit === "hour" || unit === "hrs") {
                return targetValue * 3600;
              }
              // Default to seconds
              return targetValue;
            };

            return (
              <Box key={setNumber}>
                {/* Vertical layout for both desktop and mobile - Set label, checkbox, input, then timer */}
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography
                        variant={isMobile ? "body2" : "body1"}
                        fontWeight={600}
                        sx={{ minWidth: isMobile ? 50 : 60 }}
                      >
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
                      placeholder={exercise.unit}
                      value={setData.actualValue || ""}
                      onChange={e => onActualValueChange?.(exercise.id, setNumber, "actualValue", e.target.value)}
                      sx={{ width: isMobile ? 80 : 100, ml: "auto" }}
                    />
                  </Box>
                  <CountdownTimer
                    targetSeconds={getTargetSeconds()}
                    isCompleted={isComplete}
                    onComplete={() => {
                      // Auto-check when timer completes
                      if (!isComplete) {
                        onSetToggle?.(exercise.id, setNumber, "completed");
                        onActualValueChange?.(exercise.id, setNumber, "actualValue", targetValue);
                      }
                    }}
                  />
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Mobile: Sets in column layout with label, checkbox, input on same line (non-time exercises) */}
      {isMobile && exercise.type !== "distance" && exercise.type !== "time" && (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {Array.from({ length: exercise.sets }, (_, i) => {
            const setNumber = i + 1;
            const setData = completionData.sets?.find(s => s.setNumber === setNumber) || {};
            const outcome = setData.outcome || null;
            const isComplete = isSetComplete(setData);

            return (
              <Box key={setNumber} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 50 }}>
                    Set {setNumber}
                  </Typography>
                  <Box sx={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  placeholder={exercise.unit}
                  value={setData.actualValue || ""}
                  onChange={e => onActualValueChange?.(exercise.id, setNumber, "actualValue", e.target.value)}
                  sx={{ width: 80, ml: "auto" }}
                />
              </Box>
            );
          })}
        </Stack>
      )}

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
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body1" fontWeight={600} sx={{ minWidth: 50 }}>
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
                        size="lg"
                      />
                    </Box>
                  </Stack>
                  <Stack direction="column" spacing={2}>
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

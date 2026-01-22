"use client";

import dayjs from "dayjs";
import { Box, Stack, Typography, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

const getWeekIndex = (startDate, date, totalWeeks) => {
  if (!startDate) return 1;
  const start = dayjs(startDate).startOf("day");
  const current = dayjs(date).startOf("day");
  const daysDiff = current.diff(start, "day");
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  if (!totalWeeks) return Math.max(1, weekNumber);
  return Math.min(Math.max(1, weekNumber), totalWeeks);
};

const buildExerciseList = program => {
  if (!program?.sections) return [];
  const exercises = [];
  program.sections.forEach(section => {
    section.days?.forEach(day => {
      day.exercises?.forEach(exercise => {
        exercises.push({
          ...exercise,
          sectionName: section.name,
          dayName: day.name,
        });
      });
    });
  });
  return exercises;
};

const summarizeExerciseWeek = sets => {
  if (!sets || sets.length === 0) return null;
  let completedSets = 0;
  let actualValues = [];
  let timeValues = [];
  let paceValues = [];
  let distanceValues = [];
  sets.forEach(set => {
    if (set.outcome === "completed") completedSets += 1;
    if (set.actualValue !== null && set.actualValue !== undefined) actualValues.push(set.actualValue);
    if (set.time) timeValues.push(set.time);
    if (set.pace) paceValues.push(set.pace);
    if (set.distance !== null && set.distance !== undefined) distanceValues.push(set.distance);
  });
  const totalSets = sets.length;
  const bestActualValue = actualValues.length ? Math.max(...actualValues) : null;
  const bestTime = timeValues.length ? timeValues[timeValues.length - 1] : null;
  const bestPace = paceValues.length ? paceValues[paceValues.length - 1] : null;
  const bestDistance = distanceValues.length ? Math.max(...distanceValues) : null;
  return { totalSets, completedSets, bestActualValue, bestTime, bestPace, bestDistance };
};

const formatGoal = exercise => {
  const value = exercise.goal ?? exercise.targetValue;
  if (value === null || value === undefined || value === "") return "--";
  return `${value}${exercise.unit ? ` ${exercise.unit}` : ""}`;
};

const formatWeekCell = (summary, exercise) => {
  if (!summary) return "--";
  const prefix = summary.completedSets === summary.totalSets ? "✓" : "•";
  if (exercise.type === "distance") {
    if (summary.bestPace) return `${prefix} ${summary.bestPace}`;
    if (summary.bestTime) return `${prefix} ${summary.bestTime}`;
    if (summary.bestDistance !== null) {
      return `${prefix} ${summary.bestDistance}${exercise.unit ? ` ${exercise.unit}` : ""}`;
    }
  }
  if (summary.bestActualValue !== null) {
    return `${prefix} ${summary.bestActualValue}${exercise.unit ? ` ${exercise.unit}` : ""}`;
  }
  return `${prefix} ${summary.completedSets}/${summary.totalSets}`;
};

export function WorkoutExerciseProgress({ program, completions, task, startDate }) {
  if (!program) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography color="text.secondary">No workout program found.</Typography>
      </Box>
    );
  }

  const exerciseList = buildExerciseList(program);
  const totalWeeks = program.numberOfWeeks || 1;
  const programStart = startDate || task?.recurrence?.startDate || null;

  const weekExerciseMap = new Map();
  completions.forEach(day => {
    const week = getWeekIndex(programStart, day.date, totalWeeks);
    day.exercises.forEach(exercise => {
      const key = `${exercise.exerciseId}|${week}`;
      if (!weekExerciseMap.has(key)) {
        weekExerciseMap.set(key, []);
      }
      exercise.sets.forEach(set => weekExerciseMap.get(key).push(set));
    });
  });

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Exercise progress across {totalWeeks} week{totalWeeks !== 1 ? "s" : ""}
      </Typography>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Exercise</TableCell>
            {Array.from({ length: totalWeeks }, (_, idx) => {
              const weekNumber = idx + 1;
              return (
                <TableCell key={weekNumber} align="center">
                  <Typography variant="caption" fontWeight={600}>
                    Week {weekNumber}
                  </Typography>
                </TableCell>
              );
            })}
            <TableCell align="center">Goal</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {exerciseList.map(exercise => (
            <TableRow key={exercise.id}>
              <TableCell>
                <Stack spacing={0.25}>
                  <Typography variant="body2" fontWeight={600}>
                    {exercise.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {exercise.sets}x{exercise.targetValue || "--"} {exercise.unit}
                  </Typography>
                </Stack>
              </TableCell>
              {Array.from({ length: totalWeeks }, (_, idx) => {
                const weekNumber = idx + 1;
                const key = `${exercise.id}|${weekNumber}`;
                const summary = summarizeExerciseWeek(weekExerciseMap.get(key));
                return (
                  <TableCell key={key} align="center">
                    <Typography variant="caption">{formatWeekCell(summary, exercise)}</Typography>
                  </TableCell>
                );
              })}
              <TableCell align="center">
                <Typography variant="caption">{formatGoal(exercise)}</Typography>
              </TableCell>
            </TableRow>
          ))}
          {exerciseList.length === 0 && (
            <TableRow>
              <TableCell colSpan={totalWeeks + 2} align="center" sx={{ py: 6 }}>
                <Typography color="text.secondary">No exercises in this program.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}

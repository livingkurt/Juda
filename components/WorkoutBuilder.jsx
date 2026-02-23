"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Collapse,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
} from "@mui/material";
import {
  Close,
  Add as Plus,
  Delete as Trash2,
  ExpandMore as ChevronDown,
  ChevronRight,
  ContentCopy as Copy,
  DragIndicator,
} from "@mui/icons-material";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES, DAYS_OF_WEEK } from "@/lib/constants";
import { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useTheme, useMediaQuery } from "@mui/material";
import { useDispatch } from "react-redux";
import { showError, showSuccess } from "@/lib/store/slices/snackbarSlice";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// Generate unique IDs
function generateCuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
}

// Helper to convert exercise type/unit to Select value
function getExerciseSelectValue(type, unit) {
  if (type === "time") {
    return unit === "mins" ? "time_mins" : "time_secs";
  }
  return type; // 'reps' or 'distance'
}

// Helper to parse Select value back to type/unit
function parseExerciseSelectValue(value) {
  if (value === "time_secs") {
    return { type: "time", unit: "secs" };
  }
  if (value === "time_mins") {
    return { type: "time", unit: "mins" };
  }
  const exerciseType = EXERCISE_TYPES.find(t => t.value === value);
  return {
    type: exerciseType?.value || value,
    unit: exerciseType?.unit || "reps",
  };
}

// Helper functions for updating workout data (moved outside component to reduce nesting)
function updateDayExercises(day, dayId, exerciseId, updates) {
  if (day.id !== dayId) return day;
  const updatedExercises = day.exercises.map(e => (e.id === exerciseId ? { ...e, ...updates } : e));
  return { ...day, exercises: updatedExercises };
}

function deleteDayExercise(day, dayId, exerciseId) {
  if (day.id !== dayId) return day;
  return { ...day, exercises: day.exercises.filter(e => e.id !== exerciseId) };
}

function updateExerciseProgression(exercise, exerciseId, weekIndex, updates) {
  if (exercise.id !== exerciseId) return exercise;
  const newProgressions = [...(exercise.weeklyProgression || [])];
  newProgressions[weekIndex] = {
    ...newProgressions[weekIndex],
    ...updates,
  };
  return { ...exercise, weeklyProgression: newProgressions };
}

function updateDayExercisesProgression(day, dayId, exerciseId, weekIndex, updates) {
  if (day.id !== dayId) return day;
  const updatedExercises = day.exercises.map(e => updateExerciseProgression(e, exerciseId, weekIndex, updates));
  return { ...day, exercises: updatedExercises };
}

function reorderItems(items, startIndex, endIndex) {
  const reordered = [...items];
  const [removed] = reordered.splice(startIndex, 1);
  reordered.splice(endIndex, 0, removed);
  return reordered;
}

function cloneWeeklyProgressionWithIds(progressions = []) {
  return progressions.map(wp => ({ ...wp, id: generateCuid() }));
}

function cloneExercisesWithIds(exercises = []) {
  return exercises.map(exercise => ({
    ...exercise,
    id: generateCuid(),
    weeklyProgression: cloneWeeklyProgressionWithIds(exercise.weeklyProgression || []),
  }));
}

function cloneDaysWithIds(days = []) {
  return days.map(day => ({
    ...day,
    id: generateCuid(),
    exercises: cloneExercisesWithIds(day.exercises || []),
  }));
}

function cloneSectionsWithIds(sections = []) {
  return sections.map(section => ({
    ...section,
    id: generateCuid(),
    days: cloneDaysWithIds(section.days || []),
  }));
}

function buildDuplicatedCycle(sourceCycle, newCycleId, order) {
  return {
    id: newCycleId,
    name: `${sourceCycle.name} (Copy)`,
    numberOfWeeks: sourceCycle.numberOfWeeks,
    order,
    sections: cloneSectionsWithIds(sourceCycle.sections || []),
  };
}

function updateDayInCycle(cycle, sectionId, dayId, updates) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day => (day.id === dayId ? { ...day, ...updates } : day)),
          }
        : section
    ),
  };
}

function deleteDayInCycle(cycle, sectionId, dayId) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId ? { ...section, days: section.days.filter(day => day.id !== dayId) } : section
    ),
  };
}

function addExerciseInCycle(cycle, sectionId, dayId, newExercise) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day =>
              day.id === dayId ? { ...day, exercises: [...(day.exercises || []), newExercise] } : day
            ),
          }
        : section
    ),
  };
}

function updateExerciseInCycle(cycle, sectionId, dayId, exerciseId, updates) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day => updateDayExercises(day, dayId, exerciseId, updates)),
          }
        : section
    ),
  };
}

function deleteExerciseInCycle(cycle, sectionId, dayId, exerciseId) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day => deleteDayExercise(day, dayId, exerciseId)),
          }
        : section
    ),
  };
}

function reorderExercisesInCycle(cycle, sectionId, dayId, startIndex, endIndex) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day =>
              day.id === dayId ? { ...day, exercises: reorderItems(day.exercises || [], startIndex, endIndex) } : day
            ),
          }
        : section
    ),
  };
}

function updateWeeklyProgressionInCycle(cycle, sectionId, dayId, exerciseId, weekIndex, updates) {
  return {
    ...cycle,
    sections: cycle.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            days: section.days.map(day => updateDayExercisesProgression(day, dayId, exerciseId, weekIndex, updates)),
          }
        : section
    ),
  };
}

function updateCycleWeeksInCycle(cycle, weeks, buildProgression) {
  return {
    ...cycle,
    numberOfWeeks: weeks,
    sections: cycle.sections.map(section => ({
      ...section,
      days: section.days?.map(day => ({
        ...day,
        exercises: day.exercises?.map(exercise => ({
          ...exercise,
          weeklyProgression: buildProgression(exercise, weeks),
        })),
      })),
    })),
  };
}

function serializeWeeklyProgression(weeklyProgression = []) {
  const result = [];
  for (const wp of weeklyProgression) {
    result.push({
      week: wp.week,
      targetValue: wp.targetValue,
      isDeload: wp.isDeload || false,
      isTest: wp.isTest || false,
    });
  }
  return result;
}

function serializeProgramCycles(cycles = []) {
  const serializedCycles = [];
  for (let cIdx = 0; cIdx < cycles.length; cIdx++) {
    const cycle = cycles[cIdx];
    const serializedSections = [];
    for (let sIdx = 0; sIdx < cycle.sections.length; sIdx++) {
      const section = cycle.sections[sIdx];
      const serializedDays = [];
      for (let dIdx = 0; dIdx < section.days.length; dIdx++) {
        const day = section.days[dIdx];
        const serializedExercises = [];
        for (let eIdx = 0; eIdx < day.exercises.length; eIdx++) {
          const exercise = day.exercises[eIdx];
          serializedExercises.push({
            id: exercise.id,
            name: exercise.name,
            type: exercise.type,
            sets: exercise.sets,
            targetValue: exercise.targetValue,
            unit: exercise.unit,
            goal: exercise.goal || null,
            notes: exercise.notes || null,
            bothSides: exercise.bothSides || false,
            order: eIdx,
            weeklyProgression: serializeWeeklyProgression(exercise.weeklyProgression || []),
          });
        }
        serializedDays.push({
          id: day.id,
          name: day.name,
          daysOfWeek: day.daysOfWeek || (day.dayOfWeek !== undefined ? [day.dayOfWeek] : [1]),
          order: dIdx,
          exercises: serializedExercises,
        });
      }
      serializedSections.push({
        id: section.id,
        name: section.name,
        type: section.type,
        order: sIdx,
        days: serializedDays,
      });
    }
    serializedCycles.push({
      id: cycle.id,
      name: cycle.name,
      numberOfWeeks: cycle.numberOfWeeks,
      order: cIdx,
      sections: serializedSections,
    });
  }
  return serializedCycles;
}

// Simple WeekdaySelector component using MUI - memoized for performance
const WeekdaySelector = memo(function WeekdaySelector({ selectedDays = [], onChange, size = "small" }) {
  const handleChange = useCallback(
    (event, newDays) => {
      if (newDays !== null && newDays.length > 0) {
        onChange(newDays);
      }
    },
    [onChange]
  );

  return (
    <ToggleButtonGroup value={selectedDays} onChange={handleChange} size={size} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {DAYS_OF_WEEK.map(day => (
        <ToggleButton key={day.value} value={day.value}>
          {day.short}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
});

// Memoized Weekly Progression Card Component
const WeekProgressionCard = memo(function WeekProgressionCard({
  progression,
  weekIndex,
  exerciseId,
  cycleId,
  sectionId,
  dayId,
  onUpdateProgression,
}) {
  const handleTargetChange = useCallback(
    e => {
      const newValue = parseFloat(e.target.value) || 0;
      onUpdateProgression(cycleId, sectionId, dayId, exerciseId, weekIndex, { targetValue: newValue });
    },
    [onUpdateProgression, cycleId, sectionId, dayId, exerciseId, weekIndex]
  );

  const handleDeloadToggle = useCallback(() => {
    onUpdateProgression(cycleId, sectionId, dayId, exerciseId, weekIndex, {
      isDeload: !progression.isDeload,
      isTest: false,
    });
  }, [onUpdateProgression, cycleId, sectionId, dayId, exerciseId, weekIndex, progression.isDeload]);

  const handleTestToggle = useCallback(() => {
    onUpdateProgression(cycleId, sectionId, dayId, exerciseId, weekIndex, {
      isTest: !progression.isTest,
      isDeload: false,
    });
  }, [onUpdateProgression, cycleId, sectionId, dayId, exerciseId, weekIndex, progression.isTest]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        bgcolor: progression.isDeload ? "info.dark" : progression.isTest ? "warning.dark" : "background.paper",
        borderColor: progression.isDeload ? "info.main" : progression.isTest ? "warning.main" : "divider",
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="caption" fontWeight={600}>
          Week {progression.week}
        </Typography>
        <TextField
          size="small"
          type="number"
          value={progression.targetValue ?? ""}
          onChange={handleTargetChange}
          placeholder="Target"
          fullWidth
          sx={{ "& input": { fontSize: "0.75rem" } }}
        />
        <Stack direction="row" spacing={0.5}>
          <ToggleButton
            value="deload"
            selected={progression.isDeload}
            onChange={handleDeloadToggle}
            size="small"
            sx={{
              flex: 1,
              py: 0.25,
              fontSize: "0.625rem",
              textTransform: "none",
            }}
          >
            Deload
          </ToggleButton>
          <ToggleButton
            value="test"
            selected={progression.isTest}
            onChange={handleTestToggle}
            size="small"
            sx={{
              flex: 1,
              py: 0.25,
              fontSize: "0.625rem",
              textTransform: "none",
            }}
          >
            Test
          </ToggleButton>
        </Stack>
      </Stack>
    </Paper>
  );
});

// Memoized Exercise Component
const WorkoutExercise = memo(function WorkoutExercise({
  exercise,
  cycleId,
  sectionId,
  dayId,
  onUpdate,
  onDelete,
  numberOfWeeks,
  progressionExpanded,
  onToggleProgression,
  onUpdateProgression,
  dragHandleProps,
  isDragging,
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(cycleId, sectionId, dayId, exercise.id, { name: e.target.value });
    },
    [onUpdate, cycleId, sectionId, dayId, exercise.id]
  );

  const handleTypeChange = useCallback(
    e => {
      const { type, unit } = parseExerciseSelectValue(e.target.value);
      onUpdate(cycleId, sectionId, dayId, exercise.id, { type, unit });
    },
    [onUpdate, cycleId, sectionId, dayId, exercise.id]
  );

  const handleSetsChange = useCallback(
    e => {
      onUpdate(cycleId, sectionId, dayId, exercise.id, { sets: parseInt(e.target.value) || 1 });
    },
    [onUpdate, cycleId, sectionId, dayId, exercise.id]
  );

  const handleTargetChange = useCallback(
    e => {
      onUpdate(cycleId, sectionId, dayId, exercise.id, { targetValue: parseFloat(e.target.value) || 0 });
    },
    [onUpdate, cycleId, sectionId, dayId, exercise.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(cycleId, sectionId, dayId, exercise.id);
  }, [onDelete, cycleId, sectionId, dayId, exercise.id]);

  const handleToggleProgression = useCallback(() => {
    onToggleProgression(exercise.id);
  }, [onToggleProgression, exercise.id]);

  const handleBothSidesChange = useCallback(
    e => {
      onUpdate(cycleId, sectionId, dayId, exercise.id, { bothSides: e.target.checked });
    },
    [onUpdate, cycleId, sectionId, dayId, exercise.id]
  );

  const showProgression = numberOfWeeks > 0 && exercise.weeklyProgression && exercise.weeklyProgression.length > 0;

  const isTimeExercise = exercise.type === "time";

  return (
    <Paper
      key={exercise.id}
      variant="outlined"
      sx={{
        p: 1.5,
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isDragging ? "action.hover" : "background.paper",
      }}
    >
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12} sm="auto">
          <Box {...dragHandleProps} sx={{ display: "flex", alignItems: "center", cursor: "grab", height: "100%" }}>
            <DragIndicator fontSize="small" sx={{ color: "text.secondary" }} />
          </Box>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Exercise Name" value={exercise.name} onChange={handleNameChange} size="small" fullWidth />
        </Grid>
        <Grid item xs={6} sm={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={getExerciseSelectValue(exercise.type, exercise.unit)}
              onChange={handleTypeChange}
              label="Type"
            >
              {EXERCISE_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            label="Sets"
            type="number"
            value={exercise.sets}
            onChange={handleSetsChange}
            size="small"
            fullWidth
            inputProps={{ min: 1 }}
          />
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            label="Target"
            type="number"
            value={exercise.targetValue}
            onChange={handleTargetChange}
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={6} sm={2}>
          <IconButton size="small" color="error" onClick={handleDelete}>
            <Trash2 fontSize="small" />
          </IconButton>
        </Grid>
      </Grid>

      {/* Both Sides Checkbox - Only show for time exercises */}
      {isTimeExercise && (
        <Box sx={{ mt: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={exercise.bothSides || false} onChange={handleBothSidesChange} size="small" />}
            label="Both Sides (runs timer twice with 5s transition)"
          />
        </Box>
      )}

      {/* Weekly Progression Toggle */}
      {showProgression && (
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            onClick={handleToggleProgression}
            startIcon={progressionExpanded ? <ChevronDown fontSize="small" /> : <ChevronRight fontSize="small" />}
            sx={{ textTransform: "none", fontSize: "0.75rem" }}
          >
            Weekly Progression ({numberOfWeeks} weeks)
          </Button>
          <Collapse in={progressionExpanded} unmountOnExit>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              {exercise.weeklyProgression.map((progression, weekIndex) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={progression.week}>
                  <WeekProgressionCard
                    progression={progression}
                    weekIndex={weekIndex}
                    exerciseId={exercise.id}
                    cycleId={cycleId}
                    sectionId={sectionId}
                    dayId={dayId}
                    onUpdateProgression={onUpdateProgression}
                  />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Box>
      )}
    </Paper>
  );
});

// Memoized Day Component
const WorkoutDay = memo(function WorkoutDay({
  day,
  cycleId,
  sectionId,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddExercise,
  numberOfWeeks,
  expandedExercises,
  onToggleExercise,
  onUpdateExercise,
  onDeleteExercise,
  onUpdateProgression,
  dragHandleProps,
  isDragging,
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(cycleId, sectionId, day.id, { name: e.target.value });
    },
    [onUpdate, cycleId, sectionId, day.id]
  );

  const handleDaysOfWeekChange = useCallback(
    newDays => {
      onUpdate(cycleId, sectionId, day.id, { daysOfWeek: newDays });
    },
    [onUpdate, cycleId, sectionId, day.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(cycleId, sectionId, day.id);
  }, [onDelete, cycleId, sectionId, day.id]);

  const handleAddExercise = useCallback(() => {
    onAddExercise(cycleId, sectionId, day.id);
  }, [onAddExercise, cycleId, sectionId, day.id]);

  const handleToggle = useCallback(() => {
    onToggle(day.id);
  }, [onToggle, day.id]);

  return (
    <Paper
      key={day.id}
      variant="outlined"
      sx={{
        p: 1.5,
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isDragging ? "action.hover" : "background.paper",
      }}
    >
      {/* Day Header */}
      <Stack direction="row" spacing={2} alignItems="center" mb={expanded ? 1.5 : 0}>
        <Box {...dragHandleProps} sx={{ display: "flex", alignItems: "center", cursor: "grab" }}>
          <DragIndicator fontSize="small" sx={{ color: "text.secondary" }} />
        </Box>

        <IconButton size="small" onClick={handleToggle}>
          {expanded ? <ChevronDown fontSize="small" /> : <ChevronRight fontSize="small" />}
        </IconButton>

        <TextField value={day.name} onChange={handleNameChange} size="small" sx={{ flex: 1 }} />

        <Box onClick={e => e.stopPropagation()} flexShrink={0}>
          <Typography variant="caption" display="block" mb={0.5}>
            Days of Week
          </Typography>
          <WeekdaySelector
            selectedDays={day.daysOfWeek || (day.dayOfWeek !== undefined ? [day.dayOfWeek] : [])}
            onChange={handleDaysOfWeekChange}
            size="small"
          />
        </Box>

        <IconButton size="small" color="error" onClick={handleDelete}>
          <Trash2 fontSize="small" />
        </IconButton>
      </Stack>

      {/* Day Content */}
      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={1.5} sx={{ pl: 4 }}>
          <Button
            startIcon={<Plus fontSize="small" />}
            onClick={handleAddExercise}
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            Add Exercise
          </Button>

          <Droppable droppableId={`day-exercises|${cycleId}|${sectionId}|${day.id}`} type="EXERCISE">
            {provided => (
              <Stack spacing={1.5} ref={provided.innerRef} {...provided.droppableProps}>
                {day.exercises?.map((exercise, index) => (
                  <Draggable key={exercise.id} draggableId={`exercise-${exercise.id}`} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <WorkoutExercise
                          exercise={exercise}
                          cycleId={cycleId}
                          sectionId={sectionId}
                          dayId={day.id}
                          onUpdate={onUpdateExercise}
                          onDelete={onDeleteExercise}
                          numberOfWeeks={numberOfWeeks}
                          progressionExpanded={expandedExercises[exercise.id]}
                          onToggleProgression={onToggleExercise}
                          onUpdateProgression={onUpdateProgression}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </Stack>
      </Collapse>
    </Paper>
  );
});

// Memoized Cycle Panel Component
const WorkoutCyclePanel = memo(function WorkoutCyclePanel({
  cycle,
  expanded,
  onToggle,
  onUpdate,
  onUpdateNumberOfWeeks,
  onDelete,
  onDuplicate,
  onAddSection,
  expandedSections,
  onToggleSection,
  expandedDays,
  onToggleDay,
  expandedExercises,
  onToggleExercise,
  onUpdateSection,
  onDeleteSection,
  onAddDay,
  onUpdateDay,
  onDeleteDay,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onUpdateProgression,
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(cycle.id, { name: e.target.value });
    },
    [onUpdate, cycle.id]
  );

  const handleNumberOfWeeksChange = useCallback(
    e => {
      const val = parseInt(e.target.value, 10);
      onUpdateNumberOfWeeks(cycle.id, Number.isNaN(val) || val < 0 ? 0 : val);
    },
    [onUpdateNumberOfWeeks, cycle.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(cycle.id);
  }, [onDelete, cycle.id]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(cycle.id);
  }, [onDuplicate, cycle.id]);

  const handleAddSection = useCallback(() => {
    onAddSection(cycle.id);
  }, [onAddSection, cycle.id]);

  const handleToggle = useCallback(() => {
    onToggle(cycle.id);
  }, [onToggle, cycle.id]);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {/* Cycle Header */}
      <Stack direction="row" spacing={2} alignItems="center" mb={expanded ? 2 : 0}>
        <IconButton size="small" onClick={handleToggle}>
          {expanded ? <ChevronDown fontSize="small" /> : <ChevronRight fontSize="small" />}
        </IconButton>

        <TextField value={cycle.name} onChange={handleNameChange} size="small" sx={{ flex: 1 }} />

        <TextField
          label="Weeks"
          type="number"
          value={cycle.numberOfWeeks}
          onChange={handleNumberOfWeeksChange}
          size="small"
          inputProps={{ min: 0 }}
          helperText={cycle.numberOfWeeks === 0 ? "0 = same every day, repeats forever" : ""}
          sx={{ width: 100 }}
        />

        <Tooltip title="Duplicate Cycle">
          <IconButton size="small" onClick={handleDuplicate}>
            <Copy fontSize="small" />
          </IconButton>
        </Tooltip>

        <IconButton size="small" color="error" onClick={handleDelete}>
          <Trash2 fontSize="small" />
        </IconButton>
      </Stack>

      {/* Cycle Content */}
      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={2} sx={{ pl: 2 }}>
          {/* Add Section button */}
          <Button
            startIcon={<Plus fontSize="small" />}
            onClick={handleAddSection}
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            Add Section
          </Button>

          {/* Render sections with drag-and-drop */}
          <Droppable droppableId={`cycle-sections-${cycle.id}`} type="SECTION">
            {provided => (
              <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps}>
                {cycle.sections?.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <WorkoutSection
                          section={section}
                          cycleId={cycle.id}
                          expanded={expandedSections[section.id]}
                          onToggle={onToggleSection}
                          onUpdate={onUpdateSection}
                          onDelete={onDeleteSection}
                          onAddDay={onAddDay}
                          numberOfWeeks={cycle.numberOfWeeks}
                          expandedDays={expandedDays}
                          onToggleDay={onToggleDay}
                          expandedExercises={expandedExercises}
                          onToggleExercise={onToggleExercise}
                          onUpdateDay={onUpdateDay}
                          onDeleteDay={onDeleteDay}
                          onAddExercise={onAddExercise}
                          onUpdateExercise={onUpdateExercise}
                          onDeleteExercise={onDeleteExercise}
                          onUpdateProgression={onUpdateProgression}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </Stack>
      </Collapse>
    </Paper>
  );
});

// Memoized Section Component
const WorkoutSection = memo(function WorkoutSection({
  section,
  cycleId,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
  onAddDay,
  numberOfWeeks,
  expandedDays,
  onToggleDay,
  expandedExercises,
  onToggleExercise,
  onUpdateDay,
  onDeleteDay,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onUpdateProgression,
  dragHandleProps,
  isDragging,
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(cycleId, section.id, { name: e.target.value });
    },
    [onUpdate, cycleId, section.id]
  );

  const handleTypeChange = useCallback(
    e => {
      onUpdate(cycleId, section.id, { type: e.target.value });
    },
    [onUpdate, cycleId, section.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(cycleId, section.id);
  }, [onDelete, cycleId, section.id]);

  const handleAddDay = useCallback(() => {
    onAddDay(cycleId, section.id);
  }, [onAddDay, cycleId, section.id]);

  const handleToggle = useCallback(() => {
    onToggle(section.id);
  }, [onToggle, section.id]);

  return (
    <Paper
      key={section.id}
      variant="outlined"
      sx={{
        p: 2,
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isDragging ? "action.hover" : "background.paper",
      }}
    >
      {/* Section Header */}
      <Stack direction="row" spacing={2} alignItems="center" mb={expanded ? 2 : 0}>
        <Box {...dragHandleProps} sx={{ display: "flex", alignItems: "center", cursor: "grab" }}>
          <DragIndicator fontSize="small" sx={{ color: "text.secondary" }} />
        </Box>

        <IconButton size="small" onClick={handleToggle}>
          {expanded ? <ChevronDown fontSize="small" /> : <ChevronRight fontSize="small" />}
        </IconButton>

        <TextField value={section.name} onChange={handleNameChange} size="small" sx={{ flex: 1 }} />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Type</InputLabel>
          <Select value={section.type} onChange={handleTypeChange} label="Type">
            {WORKOUT_SECTION_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton size="small" color="error" onClick={handleDelete}>
          <Trash2 fontSize="small" />
        </IconButton>
      </Stack>

      {/* Section Content */}
      <Collapse in={expanded} unmountOnExit>
        <Stack spacing={2} sx={{ pl: 4 }}>
          <Button
            startIcon={<Plus fontSize="small" />}
            onClick={handleAddDay}
            size="small"
            sx={{ alignSelf: "flex-start" }}
          >
            Add Day
          </Button>

          <Droppable droppableId={`section-days|${cycleId}|${section.id}`} type="DAY">
            {provided => (
              <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps}>
                {section.days?.map((day, index) => (
                  <Draggable key={day.id} draggableId={`day-${day.id}`} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <WorkoutDay
                          day={day}
                          cycleId={cycleId}
                          sectionId={section.id}
                          expanded={expandedDays[day.id]}
                          onToggle={onToggleDay}
                          onUpdate={onUpdateDay}
                          onDelete={onDeleteDay}
                          onAddExercise={onAddExercise}
                          numberOfWeeks={numberOfWeeks}
                          expandedExercises={expandedExercises}
                          onToggleExercise={onToggleExercise}
                          onUpdateExercise={onUpdateExercise}
                          onDeleteExercise={onDeleteExercise}
                          onUpdateProgression={onUpdateProgression}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </Stack>
      </Collapse>
    </Paper>
  );
});

export default function WorkoutBuilder({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  taskId: propsTaskId,
  onSaveComplete: propsOnSaveComplete,
} = {}) {
  const dispatch = useDispatch();
  const dialogState = useDialogState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // Support both prop-controlled and dialogState-controlled modes
  const taskId = propsTaskId || dialogState.editingWorkoutTask?.id;
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : Boolean(dialogState.editingWorkoutTask);

  const { data: existingProgram, isLoading: programLoading } = useGetWorkoutProgramQuery(taskId, {
    skip: !taskId || !isOpen,
  });
  const [saveWorkoutProgramMutation, { isLoading: isSaving }] = useSaveWorkoutProgramMutation();

  // State declarations - MUST come before functions that use them
  const [cycles, setCycles] = useState([]);
  const [expandedCycles, setExpandedCycles] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [expandedExercises, setExpandedExercises] = useState({});
  const [name, setName] = useState("");
  const loadedProgramIdRef = useRef(null);

  // Reset all state helper
  const resetState = useCallback(() => {
    loadedProgramIdRef.current = null;
    setName("");
    setCycles([]);
    setExpandedCycles({});
    setExpandedSections({});
    setExpandedDays({});
    setExpandedExercises({});
  }, []);

  const handleClose = useCallback(() => {
    if (propsOnClose) {
      propsOnClose();
    } else {
      dialogState.setEditingWorkoutTask(null);
    }
    resetState();
  }, [propsOnClose, dialogState, resetState]);

  const handleSaveComplete = useCallback(() => {
    if (propsOnSaveComplete) {
      propsOnSaveComplete();
    } else {
      dialogState.setEditingWorkoutTask(null);
    }
    resetState();
    // RTK Query automatically invalidates and refetches workout tasks after save
  }, [propsOnSaveComplete, dialogState, resetState]);

  // Toggle exercise progression expansion
  const toggleExerciseProgression = useCallback(exerciseId => {
    setExpandedExercises(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  }, []);

  // Load existing program - only run once per program
  useEffect(() => {
    if (!existingProgram || !isOpen) return;

    // Only load if this is a different program than what we've already loaded
    if (existingProgram.taskId === loadedProgramIdRef.current) return;

    loadedProgramIdRef.current = existingProgram.taskId;

    setName(existingProgram.name || "");

    // Load cycles from existing program, or create default cycle if none exist (defensive)
    const cyclesData =
      Array.isArray(existingProgram.cycles) && existingProgram.cycles.length > 0
        ? existingProgram.cycles
        : [
            {
              id: generateCuid(),
              name: "Cycle 1",
              numberOfWeeks: existingProgram.numberOfWeeks || 1,
              order: 0,
              sections: Array.isArray(existingProgram.sections) ? existingProgram.sections : [],
            },
          ];
    setCycles(cyclesData);
    // Auto-expand first cycle
    if (cyclesData.length > 0) {
      setExpandedCycles({ [cyclesData[0].id]: true });
    }
  }, [existingProgram, isOpen]);

  // Cycle CRUD functions
  const addCycle = useCallback(() => {
    const newCycle = {
      id: generateCuid(),
      name: `Cycle ${cycles.length + 1}`,
      numberOfWeeks: 1,
      order: cycles.length,
      sections: [],
    };
    setCycles(prev => [...prev, newCycle]);
    setExpandedCycles(prev => ({ ...prev, [newCycle.id]: true }));
  }, [cycles.length]);

  const updateCycle = useCallback((cycleId, updates) => {
    setCycles(prev => prev.map(c => (c.id === cycleId ? { ...c, ...updates } : c)));
  }, []);

  const deleteCycle = useCallback(cycleId => {
    setCycles(prev => prev.filter(c => c.id !== cycleId));
  }, []);

  const duplicateCycle = useCallback(cycleId => {
    const newCycleId = generateCuid();

    setCycles(prev => {
      const sourceCycle = prev.find(c => c.id === cycleId);
      if (!sourceCycle) return prev;
      const sourceIndex = prev.indexOf(sourceCycle);

      const newCycle = buildDuplicatedCycle(sourceCycle, newCycleId, prev.length);

      const result = [...prev];
      result.splice(sourceIndex + 1, 0, newCycle);
      return result;
    });

    setExpandedCycles(prev => ({ ...prev, [newCycleId]: true }));
  }, []);

  // Section CRUD functions (cycle-scoped)
  const addSection = useCallback(cycleId => {
    const newSection = {
      id: generateCuid(),
      name: "New Section",
      type: "workout",
      days: [],
    };
    setCycles(prev => prev.map(c => (c.id === cycleId ? { ...c, sections: [...(c.sections || []), newSection] } : c)));
    setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
  }, []);

  const updateSection = useCallback((cycleId, sectionId, updates) => {
    setCycles(prev =>
      prev.map(c =>
        c.id === cycleId ? { ...c, sections: c.sections.map(s => (s.id === sectionId ? { ...s, ...updates } : s)) } : c
      )
    );
  }, []);

  const deleteSection = useCallback((cycleId, sectionId) => {
    setCycles(prev =>
      prev.map(c => (c.id === cycleId ? { ...c, sections: c.sections.filter(s => s.id !== sectionId) } : c))
    );
  }, []);

  // Reorder sections within a cycle
  const reorderSections = useCallback(
    async (cycleId, startIndex, endIndex) => {
      setCycles(prev => {
        const newCycles = [...prev];
        const cycleIndex = newCycles.findIndex(c => c.id === cycleId);
        if (cycleIndex === -1) return prev;

        const cycle = newCycles[cycleIndex];
        const newSections = [...cycle.sections];
        const [removed] = newSections.splice(startIndex, 1);
        newSections.splice(endIndex, 0, removed);

        newCycles[cycleIndex] = { ...cycle, sections: newSections };
        return newCycles;
      });

      // Persist to backend
      try {
        const cycle = cycles.find(c => c.id === cycleId);
        if (!cycle) return;

        const newSections = [...cycle.sections];
        const [removed] = newSections.splice(startIndex, 1);
        newSections.splice(endIndex, 0, removed);

        await fetch("/api/workout-sections/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cycleId,
            sections: newSections.map(s => ({ id: s.id })),
          }),
        });
      } catch (err) {
        console.error("Failed to reorder sections:", err);
        dispatch(showError({ message: "Failed to reorder sections" }));
      }
    },
    [cycles, dispatch]
  );

  // Day CRUD functions (cycle-scoped)
  const addDay = useCallback(
    (cycleId, sectionId) => {
      const newDay = {
        id: generateCuid(),
        name: "New Day",
        dayOfWeek: 1,
        exercises: [],
      };
      setCycles(prev =>
        prev.map(c =>
          c.id === cycleId
            ? {
                ...c,
                sections: c.sections.map(s => (s.id === sectionId ? { ...s, days: [...(s.days || []), newDay] } : s)),
              }
            : c
        )
      );
      setExpandedDays(prev => ({ ...prev, [newDay.id]: true }));
    },
    [] // Empty deps - uses functional update
  );

  const updateDay = useCallback((cycleId, sectionId, dayId, updates) => {
    setCycles(prev => prev.map(c => (c.id === cycleId ? updateDayInCycle(c, sectionId, dayId, updates) : c)));
  }, []); // Empty deps - uses functional update

  const deleteDay = useCallback((cycleId, sectionId, dayId) => {
    setCycles(prev => prev.map(c => (c.id === cycleId ? deleteDayInCycle(c, sectionId, dayId) : c)));
  }, []); // Empty deps - uses functional update

  // Exercise CRUD functions (cycle-scoped)
  const addExercise = useCallback(
    (cycleId, sectionId, dayId) => {
      const newExercise = {
        id: generateCuid(),
        name: "New Exercise",
        type: "reps",
        sets: 3,
        targetValue: 10,
        unit: "reps",
        bothSides: false,
        weeklyProgression: [],
      };
      setCycles(prev => prev.map(c => (c.id === cycleId ? addExerciseInCycle(c, sectionId, dayId, newExercise) : c)));
    },
    [] // Empty deps - uses functional update
  );

  const updateExercise = useCallback((cycleId, sectionId, dayId, exerciseId, updates) => {
    setCycles(prev =>
      prev.map(c => (c.id === cycleId ? updateExerciseInCycle(c, sectionId, dayId, exerciseId, updates) : c))
    );
  }, []); // Empty deps - uses functional update

  const deleteExercise = useCallback((cycleId, sectionId, dayId, exerciseId) => {
    setCycles(prev => prev.map(c => (c.id === cycleId ? deleteExerciseInCycle(c, sectionId, dayId, exerciseId) : c)));
  }, []); // Empty deps - uses functional update

  const reorderDays = useCallback((cycleId, sectionId, startIndex, endIndex) => {
    setCycles(prev =>
      prev.map(c =>
        c.id === cycleId
          ? {
              ...c,
              sections: c.sections.map(s =>
                s.id === sectionId ? { ...s, days: reorderItems(s.days || [], startIndex, endIndex) } : s
              ),
            }
          : c
      )
    );
  }, []);

  const reorderExercises = useCallback((cycleId, sectionId, dayId, startIndex, endIndex) => {
    setCycles(prev =>
      prev.map(c => (c.id === cycleId ? reorderExercisesInCycle(c, sectionId, dayId, startIndex, endIndex) : c))
    );
  }, []);

  // Update weekly progression (cycle-scoped)
  const updateWeeklyProgression = useCallback((cycleId, sectionId, dayId, exerciseId, weekIndex, updates) => {
    setCycles(prev =>
      prev.map(c =>
        c.id === cycleId ? updateWeeklyProgressionInCycle(c, sectionId, dayId, exerciseId, weekIndex, updates) : c
      )
    );
  }, []); // Empty deps - uses functional update

  // Helper to build progression array for an exercise when cycle weeks change
  const buildProgression = useCallback((exercise, weeks) => {
    if (weeks <= 0) return [];
    const existingProgressions = exercise.weeklyProgression || [];
    const newProgressions = [];
    for (let w = 1; w <= weeks; w++) {
      const existing = existingProgressions.find(p => p.week === w);
      newProgressions.push(
        existing || {
          week: w,
          targetValue: exercise.targetValue || 0,
          actualValue: null,
          isDeload: false,
          isTest: false,
        }
      );
    }
    return newProgressions;
  }, []);

  // Update cycle numberOfWeeks and propagate to exercises
  const updateCycleNumberOfWeeks = useCallback(
    (cycleId, weeks) => {
      setCycles(prev => prev.map(c => (c.id === cycleId ? updateCycleWeeksInCycle(c, weeks, buildProgression) : c)));
    },
    [buildProgression]
  );

  // Save workout
  const handleSave = useCallback(async () => {
    if (!taskId) {
      dispatch(showError({ message: "Cannot save: No task selected" }));
      return;
    }

    try {
      const programData = {
        taskId,
        name,
        cycles: serializeProgramCycles(cycles),
      };

      await saveWorkoutProgramMutation(programData).unwrap();
      dispatch(showSuccess({ message: "Workout saved successfully" }));
      handleSaveComplete();
      handleClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
      const errorMessage = err?.data?.message || err?.message || "Failed to save workout. Please try again.";
      dispatch(showError({ message: errorMessage }));
    }
  }, [dispatch, saveWorkoutProgramMutation, taskId, name, cycles, handleSaveComplete, handleClose]);

  // Toggle section expansion
  const toggleSection = useCallback(sectionId => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  // Toggle cycle expansion
  const toggleCycle = useCallback(cycleId => {
    setExpandedCycles(prev => ({ ...prev, [cycleId]: !prev[cycleId] }));
  }, []);

  // Toggle day expansion
  const toggleDay = useCallback(dayId => {
    setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  }, []);

  // Handle name change
  const handleNameChange = useCallback(e => {
    setName(e.target.value);
  }, []);

  // Handle drag end for sections
  const handleDragEnd = useCallback(
    result => {
      const { destination, source, type } = result;

      // Dropped outside the list
      if (!destination) return;

      // No movement
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      // Handle section reordering
      if (type === "SECTION") {
        const cycleId = source.droppableId.replace("cycle-sections-", "");
        reorderSections(cycleId, source.index, destination.index);
        return;
      }

      // Handle day reordering within a section
      if (type === "DAY") {
        if (source.droppableId !== destination.droppableId) return;
        const [, cycleId, sectionId] = source.droppableId.split("|");
        reorderDays(cycleId, sectionId, source.index, destination.index);
        return;
      }

      // Handle exercise reordering within a day
      if (type === "EXERCISE") {
        if (source.droppableId !== destination.droppableId) return;
        const [, cycleId, sectionId, dayId] = source.droppableId.split("|");
        reorderExercises(cycleId, sectionId, dayId, source.index, destination.index);
      }
    },
    [reorderSections, reorderDays, reorderExercises]
  );

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={isMobile ? undefined : "lg"}
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: "100vh", md: "90vh" },
          maxHeight: { xs: "100vh", md: "90vh" },
          m: { xs: 0, md: "auto" },
          width: { xs: "100%" },
          borderRadius: { xs: 0, md: 1 },
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Workout Builder</Typography>
          <IconButton onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        {programLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Loading workout program...
              </Typography>
            </Stack>
          </Box>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Stack spacing={3}>
              {/* Workout Name */}
              <TextField
                label="Workout Name (optional)"
                value={name}
                onChange={handleNameChange}
                placeholder="My Workout Program"
                size="small"
                sx={{ maxWidth: 400 }}
              />

              {/* Cycles */}
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" fontWeight={600}>
                    Cycles
                  </Typography>
                  <Button startIcon={<Plus fontSize="small" />} onClick={addCycle} size="small">
                    Add Cycle
                  </Button>
                </Stack>

                {[...cycles].reverse().map(cycle => (
                  <WorkoutCyclePanel
                    key={cycle.id}
                    cycle={cycle}
                    expanded={expandedCycles[cycle.id]}
                    onToggle={toggleCycle}
                    onUpdate={updateCycle}
                    onUpdateNumberOfWeeks={updateCycleNumberOfWeeks}
                    onDelete={deleteCycle}
                    onDuplicate={duplicateCycle}
                    onAddSection={addSection}
                    expandedSections={expandedSections}
                    onToggleSection={toggleSection}
                    expandedDays={expandedDays}
                    onToggleDay={toggleDay}
                    expandedExercises={expandedExercises}
                    onToggleExercise={toggleExerciseProgression}
                    onUpdateSection={updateSection}
                    onDeleteSection={deleteSection}
                    onAddDay={addDay}
                    onUpdateDay={updateDay}
                    onDeleteDay={deleteDay}
                    onAddExercise={addExercise}
                    onUpdateExercise={updateExercise}
                    onDeleteExercise={deleteExercise}
                    onUpdateProgression={updateWeeklyProgression}
                  />
                ))}
              </Stack>
            </Stack>
          </DragDropContext>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={programLoading || isSaving || !taskId}>
          {isSaving ? "Saving..." : "Save Workout"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

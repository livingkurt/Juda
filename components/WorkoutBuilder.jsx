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
} from "@mui/material";
import { Close, Add as Plus, Delete as Trash2, ExpandMore as ChevronDown, ChevronRight } from "@mui/icons-material";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES, DAYS_OF_WEEK } from "@/lib/constants";
import { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";
import { useDialogState } from "@/hooks/useDialogState";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useTheme, useMediaQuery } from "@mui/material";
import { useDispatch } from "react-redux";
import { showError, showSuccess } from "@/lib/store/slices/snackbarSlice";

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
  sectionId,
  dayId,
  onUpdateProgression,
}) {
  const handleTargetChange = useCallback(
    e => {
      const newValue = parseFloat(e.target.value) || 0;
      onUpdateProgression(sectionId, dayId, exerciseId, weekIndex, { targetValue: newValue });
    },
    [onUpdateProgression, sectionId, dayId, exerciseId, weekIndex]
  );

  const handleDeloadToggle = useCallback(() => {
    onUpdateProgression(sectionId, dayId, exerciseId, weekIndex, {
      isDeload: !progression.isDeload,
      isTest: false,
    });
  }, [onUpdateProgression, sectionId, dayId, exerciseId, weekIndex, progression.isDeload]);

  const handleTestToggle = useCallback(() => {
    onUpdateProgression(sectionId, dayId, exerciseId, weekIndex, {
      isTest: !progression.isTest,
      isDeload: false,
    });
  }, [onUpdateProgression, sectionId, dayId, exerciseId, weekIndex, progression.isTest]);

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
  sectionId,
  dayId,
  onUpdate,
  onDelete,
  numberOfWeeks,
  progressionExpanded,
  onToggleProgression,
  onUpdateProgression,
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(sectionId, dayId, exercise.id, { name: e.target.value });
    },
    [onUpdate, sectionId, dayId, exercise.id]
  );

  const handleTypeChange = useCallback(
    e => {
      const { type, unit } = parseExerciseSelectValue(e.target.value);
      onUpdate(sectionId, dayId, exercise.id, { type, unit });
    },
    [onUpdate, sectionId, dayId, exercise.id]
  );

  const handleSetsChange = useCallback(
    e => {
      onUpdate(sectionId, dayId, exercise.id, { sets: parseInt(e.target.value) || 1 });
    },
    [onUpdate, sectionId, dayId, exercise.id]
  );

  const handleTargetChange = useCallback(
    e => {
      onUpdate(sectionId, dayId, exercise.id, { targetValue: parseFloat(e.target.value) || 0 });
    },
    [onUpdate, sectionId, dayId, exercise.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(sectionId, dayId, exercise.id);
  }, [onDelete, sectionId, dayId, exercise.id]);

  const handleToggleProgression = useCallback(() => {
    onToggleProgression(exercise.id);
  }, [onToggleProgression, exercise.id]);

  const handleBothSidesChange = useCallback(
    e => {
      onUpdate(sectionId, dayId, exercise.id, { bothSides: e.target.checked });
    },
    [onUpdate, sectionId, dayId, exercise.id]
  );

  const showProgression = numberOfWeeks > 0 && exercise.weeklyProgression && exercise.weeklyProgression.length > 0;

  const isTimeExercise = exercise.type === "time";

  return (
    <Paper key={exercise.id} variant="outlined" sx={{ p: 1.5 }}>
      <Grid container spacing={1} alignItems="center">
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
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(sectionId, day.id, { name: e.target.value });
    },
    [onUpdate, sectionId, day.id]
  );

  const handleDaysOfWeekChange = useCallback(
    newDays => {
      onUpdate(sectionId, day.id, { daysOfWeek: newDays });
    },
    [onUpdate, sectionId, day.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(sectionId, day.id);
  }, [onDelete, sectionId, day.id]);

  const handleAddExercise = useCallback(() => {
    onAddExercise(sectionId, day.id);
  }, [onAddExercise, sectionId, day.id]);

  const handleToggle = useCallback(() => {
    onToggle(day.id);
  }, [onToggle, day.id]);

  return (
    <Paper key={day.id} variant="outlined" sx={{ p: 1.5 }}>
      {/* Day Header */}
      <Stack direction="row" spacing={2} alignItems="center" mb={expanded ? 1.5 : 0}>
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

          {day.exercises?.map(exercise => (
            <WorkoutExercise
              key={exercise.id}
              exercise={exercise}
              sectionId={sectionId}
              dayId={day.id}
              onUpdate={onUpdateExercise}
              onDelete={onDeleteExercise}
              numberOfWeeks={numberOfWeeks}
              progressionExpanded={expandedExercises[exercise.id]}
              onToggleProgression={onToggleExercise}
              onUpdateProgression={onUpdateProgression}
            />
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
});

// Memoized Section Component
const WorkoutSection = memo(function WorkoutSection({
  section,
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
}) {
  const handleNameChange = useCallback(
    e => {
      onUpdate(section.id, { name: e.target.value });
    },
    [onUpdate, section.id]
  );

  const handleTypeChange = useCallback(
    e => {
      onUpdate(section.id, { type: e.target.value });
    },
    [onUpdate, section.id]
  );

  const handleDelete = useCallback(() => {
    onDelete(section.id);
  }, [onDelete, section.id]);

  const handleAddDay = useCallback(() => {
    onAddDay(section.id);
  }, [onAddDay, section.id]);

  const handleToggle = useCallback(() => {
    onToggle(section.id);
  }, [onToggle, section.id]);

  return (
    <Paper key={section.id} variant="outlined" sx={{ p: 2 }}>
      {/* Section Header */}
      <Stack direction="row" spacing={2} alignItems="center" mb={expanded ? 2 : 0}>
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

          {section.days?.map(day => (
            <WorkoutDay
              key={day.id}
              day={day}
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
            />
          ))}
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
  const { refetch: refetchTasks } = useGetTasksQuery();
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
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [expandedExercises, setExpandedExercises] = useState({});
  const [numberOfWeeks, setNumberOfWeeks] = useState(0);
  const [name, setName] = useState("");
  const loadedProgramIdRef = useRef(null);

  // Reset all state helper
  const resetState = useCallback(() => {
    loadedProgramIdRef.current = null;
    setName("");
    setNumberOfWeeks(0);
    setSections([]);
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
    refetchTasks();
  }, [propsOnSaveComplete, dialogState, resetState, refetchTasks]);

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
    setNumberOfWeeks(existingProgram.numberOfWeeks || 0);

    // Ensure sections is always an array
    const sectionsData = Array.isArray(existingProgram.sections) ? existingProgram.sections : [];
    setSections(sectionsData);
  }, [existingProgram, isOpen]);

  // Add section
  const addSection = useCallback(() => {
    const newSection = {
      id: generateCuid(),
      name: "New Section",
      type: "workout",
      days: [],
    };
    setSections(prev => [...prev, newSection]);
    setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
  }, []);

  // Update section
  const updateSection = useCallback((sectionId, updates) => {
    setSections(prev => prev.map(s => (s.id === sectionId ? { ...s, ...updates } : s)));
  }, []);

  // Delete section
  const deleteSection = useCallback(sectionId => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  }, []);

  // Add day to section - MEMOIZED with functional update
  const addDay = useCallback(
    sectionId => {
      const newDay = {
        id: generateCuid(),
        name: "New Day",
        dayOfWeek: 1,
        exercises: [],
      };
      setSections(prev =>
        prev.map(s => {
          if (s.id === sectionId) {
            return { ...s, days: [...(s.days || []), newDay] };
          }
          return s;
        })
      );
      setExpandedDays(prev => ({ ...prev, [newDay.id]: true }));
    },
    [] // Empty deps - uses functional update
  );

  // Update day - MEMOIZED with functional update
  const updateDay = useCallback((sectionId, dayId, updates) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            days: s.days.map(d => (d.id === dayId ? { ...d, ...updates } : d)),
          };
        }
        return s;
      })
    );
  }, []); // Empty deps - uses functional update

  // Delete day - MEMOIZED with functional update
  const deleteDay = useCallback((sectionId, dayId) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id === sectionId) {
          return { ...s, days: s.days.filter(d => d.id !== dayId) };
        }
        return s;
      })
    );
  }, []); // Empty deps - uses functional update

  // Add exercise to day - MEMOIZED with functional update
  const addExercise = useCallback(
    (sectionId, dayId) => {
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
      setSections(prev =>
        prev.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              days: s.days.map(d => {
                if (d.id === dayId) {
                  return { ...d, exercises: [...(d.exercises || []), newExercise] };
                }
                return d;
              }),
            };
          }
          return s;
        })
      );
    },
    [] // Empty deps - uses functional update
  );

  // Update exercise - MEMOIZED with functional update
  const updateExercise = useCallback((sectionId, dayId, exerciseId, updates) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s;
        const updatedDays = s.days.map(d => updateDayExercises(d, dayId, exerciseId, updates));
        return { ...s, days: updatedDays };
      })
    );
  }, []); // Empty deps - uses functional update

  // Delete exercise - MEMOIZED with functional update
  const deleteExercise = useCallback((sectionId, dayId, exerciseId) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s;
        const updatedDays = s.days.map(d => deleteDayExercise(d, dayId, exerciseId));
        return { ...s, days: updatedDays };
      })
    );
  }, []); // Empty deps - uses functional update

  // Update number of weeks (propagate to all exercises) - MEMOIZED with functional update
  const updateNumberOfWeeks = useCallback(weeks => {
    setNumberOfWeeks(weeks);

    // Helper function to build progression array for an exercise
    const buildProgression = (exercise, weeks) => {
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
    };

    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        days: section.days?.map(day => ({
          ...day,
          exercises: day.exercises?.map(exercise => ({
            ...exercise,
            weeklyProgression: buildProgression(exercise, weeks),
          })),
        })),
      }))
    );
  }, []); // Empty deps - uses functional update

  // Update weekly progression - MEMOIZED with functional update
  const updateWeeklyProgression = useCallback((sectionId, dayId, exerciseId, weekIndex, updates) => {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s;
        const updatedDays = s.days.map(d => updateDayExercisesProgression(d, dayId, exerciseId, weekIndex, updates));
        return { ...s, days: updatedDays };
      })
    );
  }, []); // Empty deps - uses functional update

  // Save workout
  const handleSave = useCallback(async () => {
    if (!taskId) {
      dispatch(showError({ message: "Cannot save: No task selected" }));
      return;
    }

    try {
      await saveWorkoutProgramMutation({
        taskId,
        name,
        numberOfWeeks,
        sections,
      }).unwrap();
      dispatch(showSuccess({ message: "Workout saved successfully" }));
      handleSaveComplete();
      handleClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
      const errorMessage = err?.data?.message || err?.message || "Failed to save workout. Please try again.";
      dispatch(showError({ message: errorMessage }));
    }
  }, [dispatch, saveWorkoutProgramMutation, taskId, name, numberOfWeeks, sections, handleSaveComplete, handleClose]);

  // Toggle section expansion
  const toggleSection = useCallback(sectionId => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  // Toggle day expansion
  const toggleDay = useCallback(dayId => {
    setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  }, []);

  // Handle name change
  const handleNameChange = useCallback(e => {
    setName(e.target.value);
  }, []);

  // Handle number of weeks change
  const handleNumberOfWeeksChange = useCallback(
    e => {
      updateNumberOfWeeks(parseInt(e.target.value) || 0);
    },
    [updateNumberOfWeeks]
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

            {/* Number of Weeks */}
            <Box>
              <TextField
                label="Number of Weeks"
                type="number"
                value={numberOfWeeks}
                onChange={handleNumberOfWeeksChange}
                size="small"
                inputProps={{ min: 0 }}
                sx={{ maxWidth: 200 }}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Controls weekly progression for all exercises
              </Typography>
            </Box>

            {/* Sections */}
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={600}>
                  Sections
                </Typography>
                <Button startIcon={<Plus fontSize="small" />} onClick={addSection} size="small">
                  Add Section
                </Button>
              </Stack>

              {sections.map(section => (
                <WorkoutSection
                  key={section.id}
                  section={section}
                  expanded={expandedSections[section.id]}
                  onToggle={toggleSection}
                  onUpdate={updateSection}
                  onDelete={deleteSection}
                  onAddDay={addDay}
                  numberOfWeeks={numberOfWeeks}
                  expandedDays={expandedDays}
                  onToggleDay={toggleDay}
                  expandedExercises={expandedExercises}
                  onToggleExercise={toggleExerciseProgression}
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

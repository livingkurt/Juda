"use client";

import { useState, useEffect } from "react";
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
} from "@mui/material";
import { Close, Add as Plus, Delete as Trash2, ExpandMore as ChevronDown, ChevronRight } from "@mui/icons-material";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES, DAYS_OF_WEEK } from "@/lib/constants";
import { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";

// Generate unique IDs
function generateCuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`;
}

// Simple WeekdaySelector component using MUI
function WeekdaySelector({ selectedDays = [], onChange, size = "small" }) {
  const handleChange = (event, newDays) => {
    if (newDays !== null && newDays.length > 0) {
      onChange(newDays);
    }
  };

  return (
    <ToggleButtonGroup value={selectedDays} onChange={handleChange} size={size} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {DAYS_OF_WEEK.map(day => (
        <ToggleButton key={day.value} value={day.value}>
          {day.short}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export default function WorkoutBuilder({ isOpen, onClose, taskId, onSaveComplete }) {
  const { data: existingProgram, isLoading: programLoading } = useGetWorkoutProgramQuery(taskId, {
    skip: !taskId,
  });
  const [saveWorkoutProgramMutation] = useSaveWorkoutProgramMutation();

  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [numberOfWeeks, setNumberOfWeeks] = useState(0);
  const [name, setName] = useState("");

  // Load existing program
  useEffect(() => {
    if (existingProgram) {
      setName(existingProgram.name || "");
      setNumberOfWeeks(existingProgram.numberOfWeeks || 0);
      setSections(existingProgram.sections || []);
    }
  }, [existingProgram]);

  // Add section
  const addSection = () => {
    const newSection = {
      id: generateCuid(),
      name: "New Section",
      type: "workout",
      days: [],
    };
    setSections([...sections, newSection]);
    setExpandedSections({ ...expandedSections, [newSection.id]: true });
  };

  // Update section
  const updateSection = (sectionId, updates) => {
    setSections(sections.map(s => (s.id === sectionId ? { ...s, ...updates } : s)));
  };

  // Delete section
  const deleteSection = sectionId => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  // Add day to section
  const addDay = sectionId => {
    const newDay = {
      id: generateCuid(),
      name: "New Day",
      dayOfWeek: 1,
      exercises: [],
    };
    setSections(
      sections.map(s => {
        if (s.id === sectionId) {
          return { ...s, days: [...(s.days || []), newDay] };
        }
        return s;
      })
    );
    setExpandedDays({ ...expandedDays, [newDay.id]: true });
  };

  // Update day
  const updateDay = (sectionId, dayId, updates) => {
    setSections(
      sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            days: s.days.map(d => (d.id === dayId ? { ...d, ...updates } : d)),
          };
        }
        return s;
      })
    );
  };

  // Delete day
  const deleteDay = (sectionId, dayId) => {
    setSections(
      sections.map(s => {
        if (s.id === sectionId) {
          return { ...s, days: s.days.filter(d => d.id !== dayId) };
        }
        return s;
      })
    );
  };

  // Add exercise to day
  const addExercise = (sectionId, dayId) => {
    const newExercise = {
      id: generateCuid(),
      name: "New Exercise",
      type: "reps",
      sets: 3,
      targetValue: 10,
      unit: "reps",
      weeklyProgression: [],
    };
    setSections(
      sections.map(s => {
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
  };

  // Update exercise
  const updateExercise = (sectionId, dayId, exerciseId, updates) => {
    setSections(
      sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            days: s.days.map(d => {
              if (d.id === dayId) {
                return {
                  ...d,
                  exercises: d.exercises.map(e => (e.id === exerciseId ? { ...e, ...updates } : e)),
                };
              }
              return d;
            }),
          };
        }
        return s;
      })
    );
  };

  // Delete exercise
  const deleteExercise = (sectionId, dayId, exerciseId) => {
    setSections(
      sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            days: s.days.map(d => {
              if (d.id === dayId) {
                return { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) };
              }
              return d;
            }),
          };
        }
        return s;
      })
    );
  };

  // Update number of weeks (propagate to all exercises)
  const updateNumberOfWeeks = weeks => {
    setNumberOfWeeks(weeks);
    setSections(
      sections.map(section => ({
        ...section,
        days: section.days?.map(day => ({
          ...day,
          exercises: day.exercises?.map(exercise => {
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

            return { ...exercise, weeklyProgression: newProgressions };
          }),
        })),
      }))
    );
  };

  // Helper to convert exercise type/unit to Select value
  const getExerciseSelectValue = (type, unit) => {
    if (type === "time") {
      return unit === "mins" ? "time_mins" : "time_secs";
    }
    return type; // 'reps' or 'distance'
  };

  // Helper to parse Select value back to type/unit
  const parseExerciseSelectValue = value => {
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
  };

  // Helper to update days of week for a day
  const updateDaysOfWeek = (sectionId, dayId, newDaysOfWeek) => {
    setSections(
      sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              days: s.days.map(d => (d.id === dayId ? { ...d, daysOfWeek: newDaysOfWeek } : d)),
            }
          : s
      )
    );
  };

  // Save workout
  const handleSave = async () => {
    try {
      await saveWorkoutProgramMutation({
        taskId,
        name,
        numberOfWeeks,
        sections,
      }).unwrap();
      onSaveComplete?.();
      onClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
    }
  };

  // Toggle section expansion
  const toggleSection = sectionId => {
    setExpandedSections({ ...expandedSections, [sectionId]: !expandedSections[sectionId] });
  };

  // Toggle day expansion
  const toggleDay = dayId => {
    setExpandedDays({ ...expandedDays, [dayId]: !expandedDays[dayId] });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: "90vh", maxHeight: "90vh" } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Workout Builder</Typography>
          <IconButton onClick={onClose} edge="end">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        <Stack spacing={3}>
          {/* Workout Name */}
          <TextField
            label="Workout Name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
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
              onChange={e => updateNumberOfWeeks(parseInt(e.target.value) || 0)}
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
              <Paper key={section.id} variant="outlined" sx={{ p: 2 }}>
                {/* Section Header */}
                <Stack direction="row" spacing={2} alignItems="center" mb={expandedSections[section.id] ? 2 : 0}>
                  <IconButton size="small" onClick={() => toggleSection(section.id)}>
                    {expandedSections[section.id] ? (
                      <ChevronDown fontSize="small" />
                    ) : (
                      <ChevronRight fontSize="small" />
                    )}
                  </IconButton>

                  <TextField
                    value={section.name}
                    onChange={e => updateSection(section.id, { name: e.target.value })}
                    size="small"
                    sx={{ flex: 1 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={section.type}
                      onChange={e => updateSection(section.id, { type: e.target.value })}
                      label="Type"
                    >
                      {WORKOUT_SECTION_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton size="small" color="error" onClick={() => deleteSection(section.id)}>
                    <Trash2 fontSize="small" />
                  </IconButton>
                </Stack>

                {/* Section Content */}
                <Collapse in={expandedSections[section.id]}>
                  <Stack spacing={2} sx={{ pl: 4 }}>
                    <Button
                      startIcon={<Plus fontSize="small" />}
                      onClick={() => addDay(section.id)}
                      size="small"
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Add Day
                    </Button>

                    {section.days?.map(day => (
                      <Paper key={day.id} variant="outlined" sx={{ p: 1.5 }}>
                        {/* Day Header */}
                        <Stack direction="row" spacing={2} alignItems="center" mb={expandedDays[day.id] ? 1.5 : 0}>
                          <IconButton size="small" onClick={() => toggleDay(day.id)}>
                            {expandedDays[day.id] ? (
                              <ChevronDown fontSize="small" />
                            ) : (
                              <ChevronRight fontSize="small" />
                            )}
                          </IconButton>

                          <TextField
                            value={day.name}
                            onChange={e => updateDay(section.id, day.id, { name: e.target.value })}
                            size="small"
                            sx={{ flex: 1 }}
                          />

                          <Box onClick={e => e.stopPropagation()} flexShrink={0}>
                            <Typography variant="caption" display="block" mb={0.5}>
                              Days of Week
                            </Typography>
                            <WeekdaySelector
                              selectedDays={day.daysOfWeek || (day.dayOfWeek !== undefined ? [day.dayOfWeek] : [])}
                              onChange={newDays => updateDaysOfWeek(section.id, day.id, newDays)}
                              size="small"
                            />
                          </Box>

                          <IconButton size="small" color="error" onClick={() => deleteDay(section.id, day.id)}>
                            <Trash2 fontSize="small" />
                          </IconButton>
                        </Stack>

                        {/* Day Content */}
                        <Collapse in={expandedDays[day.id]}>
                          <Stack spacing={1.5} sx={{ pl: 4 }}>
                            <Button
                              startIcon={<Plus fontSize="small" />}
                              onClick={() => addExercise(section.id, day.id)}
                              size="small"
                              sx={{ alignSelf: "flex-start" }}
                            >
                              Add Exercise
                            </Button>

                            {day.exercises?.map(exercise => (
                              <Paper key={exercise.id} variant="outlined" sx={{ p: 1.5 }}>
                                <Grid container spacing={1} alignItems="center">
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      label="Exercise Name"
                                      value={exercise.name}
                                      onChange={e =>
                                        updateExercise(section.id, day.id, exercise.id, { name: e.target.value })
                                      }
                                      size="small"
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={2}>
                                    <FormControl size="small" fullWidth>
                                      <InputLabel>Type</InputLabel>
                                      <Select
                                        value={getExerciseSelectValue(exercise.type, exercise.unit)}
                                        onChange={e => {
                                          const { type, unit } = parseExerciseSelectValue(e.target.value);
                                          updateExercise(section.id, day.id, exercise.id, { type, unit });
                                        }}
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
                                      onChange={e =>
                                        updateExercise(section.id, day.id, exercise.id, {
                                          sets: parseInt(e.target.value) || 1,
                                        })
                                      }
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
                                      onChange={e =>
                                        updateExercise(section.id, day.id, exercise.id, {
                                          targetValue: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      size="small"
                                      fullWidth
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={2}>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => deleteExercise(section.id, day.id, exercise.id)}
                                    >
                                      <Trash2 fontSize="small" />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </Paper>
                            ))}
                          </Stack>
                        </Collapse>
                      </Paper>
                    ))}
                  </Stack>
                </Collapse>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={programLoading}>
          Save Workout
        </Button>
      </DialogActions>
    </Dialog>
  );
}

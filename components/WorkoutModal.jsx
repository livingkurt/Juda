"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  LinearProgress,
  Divider,
  CircularProgress,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close, FitnessCenter, Check } from "@mui/icons-material";
import WorkoutDaySection from "./WorkoutDaySection";
import { useGetWorkoutProgramQuery } from "@/lib/store/api/workoutProgramsApi";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useDialogState } from "@/hooks/useDialogState";
import { useCreateCompletionMutation } from "@/lib/store/api/completionsApi";
import { useViewState } from "@/hooks/useViewState";

/**
 * WorkoutModal - Main modal for executing workouts
 */
export default function WorkoutModal() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dialogState = useDialogState();
  const viewState = useViewState();
  const task = dialogState.workoutModalTask;
  const isOpen = dialogState.workoutModalOpen;
  const currentDate = useMemo(() => viewState.viewDate || new Date(), [viewState.viewDate]);

  const { data: workoutProgram, isLoading: programLoading } = useGetWorkoutProgramQuery(task?.id, {
    skip: !task?.id,
  });
  const authFetch = useAuthFetch();
  const [createCompletionMutation] = useCreateCompletionMutation();

  const handleClose = () => {
    dialogState.setWorkoutModalOpen(false);
    dialogState.setWorkoutModalTask(null);
  };

  const handleCompleteTask = async (taskId, date) => {
    await createCompletionMutation({
      taskId,
      date,
      outcome: "completed",
    }).unwrap();
  };

  const [completionData, setCompletionData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);

  const pendingSaveRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const exerciseRefs = useRef({});
  const completionDataRef = useRef(completionData);

  // Keep ref in sync with state
  completionDataRef.current = completionData;

  // Calculate total weeks from task recurrence
  const totalWeeks = useMemo(() => {
    if (!task?.recurrence?.startDate || !task?.recurrence?.endDate) return 1;
    const startDate = new Date(task.recurrence.startDate);
    const endDate = new Date(task.recurrence.endDate);
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(daysDiff / 7));
  }, [task?.recurrence]);

  // Calculate current week
  const currentWeek = useMemo(() => {
    if (!task?.recurrence?.startDate) return 1;
    const startDate = new Date(task.recurrence.startDate);
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;
    return Math.min(Math.max(1, weekNumber), totalWeeks);
  }, [task?.recurrence, currentDate, totalWeeks]);

  // Get current day of week (0-6)
  const currentDayOfWeek = currentDate.getDay();

  // Get sections from workout program
  const sections = useMemo(() => workoutProgram?.sections || [], [workoutProgram?.sections]);

  // Get current day for a section
  const getCurrentDayForSection = useCallback(
    section => {
      if (!section?.days) return null;

      // Find day matching current day of week
      const matchingDay = section.days.find(
        day => day.dayOfWeek === currentDayOfWeek || day.daysOfWeek?.includes(currentDayOfWeek)
      );

      // If no match, return first day (fallback)
      return matchingDay || section.days[0] || null;
    },
    [currentDayOfWeek]
  );

  // Helper to get section type label
  const getSectionTypeLabel = type => {
    const labels = {
      warmup: "Warmup",
      workout: "Workout",
      cooldown: "Cool Down",
    };
    return labels[type] || type;
  };

  // Helper function to check if a set is complete
  const isSetComplete = (setData, exerciseType) => {
    if (setData?.outcome === "completed") return true;
    if (exerciseType === "distance") {
      return Boolean(setData?.time && setData?.distance && setData?.pace);
    }
    return Boolean(setData?.completed);
  };

  // Helper function to process exercises for a day
  const processDayExercises = useCallback(
    (exercises, sectionId, dayId) => {
      let dayTotal = 0;
      let dayCompleted = 0;
      exercises.forEach(exercise => {
        dayTotal += exercise.sets;
        const exerciseData = completionData[sectionId]?.days?.[dayId]?.exercises?.[exercise.id];
        if (exerciseData?.sets) {
          const completedCount = exerciseData.sets.filter(setData => isSetComplete(setData, exercise.type)).length;
          dayCompleted += completedCount;
        }
      });
      return { total: dayTotal, completed: dayCompleted };
    },
    [completionData]
  );

  // Calculate overall progress across all sections
  const overallProgress = useMemo(() => {
    let total = 0;
    let completed = 0;

    sections.forEach(section => {
      section.days?.forEach(day => {
        const result = processDayExercises(day.exercises || [], section.id, day.id);
        total += result.total;
        completed += result.completed;
      });
    });

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [sections, processDayExercises]);

  // Load existing completion data
  useEffect(() => {
    if (!isOpen || !task?.id) return;

    const loadCompletions = async () => {
      setIsLoadingCompletions(true);
      try {
        const dateStr = currentDate.toISOString().split("T")[0];
        const res = await authFetch(`/api/workout-set-completions?taskId=${task.id}&date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          // Transform API response into completionData structure
          const transformed = {};

          data.completions?.forEach(completion => {
            // Find the exercise in the workout program
            for (const section of sections) {
              for (const day of section.days || []) {
                const exercise = day.exercises?.find(ex => ex.id === completion.exerciseId);
                if (exercise) {
                  if (!transformed[section.id]) transformed[section.id] = { days: {} };
                  if (!transformed[section.id].days[day.id]) {
                    transformed[section.id].days[day.id] = { exercises: {} };
                  }
                  if (!transformed[section.id].days[day.id].exercises[exercise.id]) {
                    transformed[section.id].days[day.id].exercises[exercise.id] = { sets: [] };
                  }

                  const sets = transformed[section.id].days[day.id].exercises[exercise.id].sets;
                  const existingIndex = sets.findIndex(s => s.setNumber === completion.setNumber);
                  const setData = {
                    setNumber: completion.setNumber,
                    outcome: completion.outcome,
                    completed: completion.completed,
                    actualValue: completion.actualValue,
                    unit: completion.unit, // Include unit from completion record
                    time: completion.time,
                    distance: completion.distance,
                    pace: completion.pace,
                  };

                  if (existingIndex >= 0) {
                    sets[existingIndex] = setData;
                  } else {
                    sets.push(setData);
                  }
                  return; // Found the exercise, no need to continue
                }
              }
            }
          });

          setCompletionData(transformed);
        }
      } catch (err) {
        console.error("Failed to load completions:", err);
      } finally {
        setIsLoadingCompletions(false);
      }
    };

    if (sections.length > 0) {
      loadCompletions();
    }
  }, [isOpen, task?.id, currentDate, authFetch, sections]);

  // Auto-save completion data
  const saveCompletions = useCallback(
    async data => {
      if (!task?.id || pendingSaveRef.current) return;

      pendingSaveRef.current = true;
      setIsSaving(true);

      try {
        const dateStr = currentDate.toISOString().split("T")[0];
        const savePromises = [];

        const processExerciseSets = (exerciseId, exerciseData) => {
          if (!exerciseData?.sets) return;
          // Find the exercise from sections to get its unit
          let exerciseUnit = null;
          for (const section of sections) {
            for (const day of section.days || []) {
              const exercise = day.exercises?.find(ex => ex.id === exerciseId);
              if (exercise) {
                exerciseUnit = exercise.unit;
                break;
              }
            }
            if (exerciseUnit) break;
          }
          exerciseData.sets.forEach(setData => {
            savePromises.push(
              authFetch("/api/workout-set-completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  taskId: task.id,
                  date: dateStr,
                  exerciseId,
                  setNumber: setData.setNumber,
                  outcome: setData.outcome,
                  completed: setData.completed,
                  actualValue: setData.actualValue,
                  unit: exerciseUnit, // Include unit when saving
                  time: setData.time,
                  distance: setData.distance,
                  pace: setData.pace,
                }),
              })
            );
          });
        };

        const processDayExercises = dayData => {
          if (!dayData?.exercises) return;
          Object.entries(dayData.exercises).forEach(([exerciseId, exerciseData]) => {
            processExerciseSets(exerciseId, exerciseData);
          });
        };

        const processSectionDays = sectionData => {
          if (!sectionData?.days) return;
          Object.values(sectionData.days).forEach(dayData => {
            processDayExercises(dayData);
          });
        };

        Object.values(data).forEach(sectionData => {
          processSectionDays(sectionData);
        });

        await Promise.all(savePromises);
      } catch (err) {
        console.error("Failed to save completions:", err);
      } finally {
        setIsSaving(false);
        pendingSaveRef.current = false;
      }
    },
    [task?.id, currentDate, authFetch, sections]
  );

  // Debounced save
  const debouncedSave = useCallback(
    data => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveCompletions(data), 1000);
    },
    [saveCompletions]
  );

  // Handle set toggle with outcome
  const handleSetToggle = (sectionId, dayId, exerciseId, setNumber, outcome) => {
    setCompletionData(prev => {
      const newData = { ...prev };

      if (!newData[sectionId]) newData[sectionId] = { days: {} };
      if (!newData[sectionId].days[dayId]) newData[sectionId].days[dayId] = { exercises: {} };
      if (!newData[sectionId].days[dayId].exercises[exerciseId]) {
        newData[sectionId].days[dayId].exercises[exerciseId] = { sets: [] };
      }

      const sets = [...(newData[sectionId].days[dayId].exercises[exerciseId].sets || [])];
      const existingIndex = sets.findIndex(s => s.setNumber === setNumber);

      const setData = {
        setNumber,
        outcome,
        completed: outcome === "completed",
      };

      if (existingIndex >= 0) {
        sets[existingIndex] = { ...sets[existingIndex], ...setData };
      } else {
        sets.push(setData);
      }
      newData[sectionId].days[dayId].exercises[exerciseId].sets = sets;

      debouncedSave(newData);
      return newData;
    });
  };

  // Handle actual value change (for distance exercises)
  const handleActualValueChange = (sectionId, dayId, exerciseId, setNumber, field, value) => {
    setCompletionData(prev => {
      const newData = { ...prev };

      if (!newData[sectionId]) newData[sectionId] = { days: {} };
      if (!newData[sectionId].days[dayId]) newData[sectionId].days[dayId] = { exercises: {} };
      if (!newData[sectionId].days[dayId].exercises[exerciseId]) {
        newData[sectionId].days[dayId].exercises[exerciseId] = { sets: [] };
      }

      const sets = [...(newData[sectionId].days[dayId].exercises[exerciseId].sets || [])];
      const existingIndex = sets.findIndex(s => s.setNumber === setNumber);

      const setData = {
        setNumber,
        [field]: value,
      };

      if (existingIndex >= 0) {
        sets[existingIndex] = { ...sets[existingIndex], ...setData };
      } else {
        sets.push(setData);
      }

      // Check if all fields are filled for distance exercise
      const updatedSetData = sets[existingIndex >= 0 ? existingIndex : sets.length - 1];
      if (updatedSetData.time && updatedSetData.distance && updatedSetData.pace) {
        updatedSetData.outcome = "completed";
        updatedSetData.completed = true;
      }

      newData[sectionId].days[dayId].exercises[exerciseId].sets = sets;

      debouncedSave(newData);
      return newData;
    });
  };

  // Helper to check if a set is complete (uses ref for latest data in setTimeout)
  const isSetCompleteCheck = (sectionId, dayId, exerciseId, setNum) => {
    const data = completionDataRef.current;
    const setData = data[sectionId]?.days?.[dayId]?.exercises?.[exerciseId]?.sets?.find(s => s.setNumber === setNum);
    return (
      setData?.outcome === "completed" || setData?.completed || (setData?.time && setData?.distance && setData?.pace)
    );
  };

  // Handle set completion and auto-scroll to next incomplete set
  const handleSetComplete = (exerciseId, setNumber) => {
    // Find the next incomplete set across all exercises
    setTimeout(() => {
      // Get all exercises grouped by section
      const exercisesBySection = [];
      sections.forEach(section => {
        const currentDay = getCurrentDayForSection(section);
        if (currentDay?.exercises) {
          const sectionExercises = currentDay.exercises.map(exercise => ({
            id: exercise.id,
            sets: exercise.sets,
            sectionId: section.id,
            dayId: currentDay.id,
          }));
          exercisesBySection.push({
            sectionId: section.id,
            dayId: currentDay.id,
            exercises: sectionExercises,
          });
        }
      });

      // Find which section the current exercise belongs to
      let currentSectionIndex = -1;
      let currentExerciseIndexInSection = -1;

      for (let i = 0; i < exercisesBySection.length; i++) {
        const sectionData = exercisesBySection[i];
        const exerciseIndex = sectionData.exercises.findIndex(ex => ex.id === exerciseId);
        if (exerciseIndex !== -1) {
          currentSectionIndex = i;
          currentExerciseIndexInSection = exerciseIndex;
          break;
        }
      }

      if (currentSectionIndex === -1) return;

      const currentSection = exercisesBySection[currentSectionIndex];
      let nextExerciseId = null;
      let nextSetNumber = null;

      // Strategy: Stay within the current section until all sets are complete
      // 1. Look for the same set number in exercises AFTER the current one in the SAME section
      for (let i = currentExerciseIndexInSection + 1; i < currentSection.exercises.length; i++) {
        const exercise = currentSection.exercises[i];
        if (
          setNumber <= exercise.sets &&
          !isSetCompleteCheck(exercise.sectionId, exercise.dayId, exercise.id, setNumber)
        ) {
          nextExerciseId = exercise.id;
          nextSetNumber = setNumber;
          break;
        }
      }

      // 2. If not found, wrap around to next set number starting from first exercise in SAME section
      if (!nextExerciseId) {
        const nextSet = setNumber + 1;
        const maxSetsInSection = Math.max(...currentSection.exercises.map(ex => ex.sets));

        if (nextSet <= maxSetsInSection) {
          for (const exercise of currentSection.exercises) {
            if (
              nextSet <= exercise.sets &&
              !isSetCompleteCheck(exercise.sectionId, exercise.dayId, exercise.id, nextSet)
            ) {
              nextExerciseId = exercise.id;
              nextSetNumber = nextSet;
              break;
            }
          }
        }
      }

      // 3. If still not found, move to the next section
      if (!nextExerciseId && currentSectionIndex + 1 < exercisesBySection.length) {
        const nextSection = exercisesBySection[currentSectionIndex + 1];
        // Find the first incomplete set in the next section (starting with set 1)
        for (let setNum = 1; setNum <= 10; setNum++) {
          // Check up to 10 sets
          for (const exercise of nextSection.exercises) {
            if (
              setNum <= exercise.sets &&
              !isSetCompleteCheck(exercise.sectionId, exercise.dayId, exercise.id, setNum)
            ) {
              nextExerciseId = exercise.id;
              nextSetNumber = setNum;
              break;
            }
          }
          if (nextExerciseId) break;
        }
      }

      // Scroll to the next incomplete set
      if (nextExerciseId && nextSetNumber) {
        const exerciseCard = exerciseRefs.current[nextExerciseId];
        if (exerciseCard?.scrollToSet) {
          exerciseCard.scrollToSet(nextSetNumber);
        }
      }
    }, 300); // Small delay to allow state updates
  };

  // Handle complete workout
  const handleComplete = () => {
    const dateStr = currentDate.toISOString().split("T")[0];
    handleCompleteTask(task.id, dateStr);
    handleClose();
  };

  if (!task) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth={isMobile ? undefined : "md"}
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: "100vh", md: "90vh" },
          maxHeight: { xs: "100vh", md: "90vh" },
          m: { xs: 0, md: "auto" },
          width: { xs: "100%", md: "600px" },
          borderRadius: { xs: 0, md: 1 },
        },
      }}
    >
      <DialogTitle sx={{ p: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <FitnessCenter fontSize="large" />
          <Box flex={1}>
            <Typography variant="h6">{task.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Week {currentWeek} of {totalWeeks}
            </Typography>
          </Box>
          {isSaving && <CircularProgress size={20} />}
          <IconButton onClick={handleClose} edge="end">
            <Close />
          </IconButton>
        </Stack>

        {/* Overall Progress */}
        <Box sx={{ mt: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">Overall Progress</Typography>
            <Typography variant="body2" fontWeight={600}>
              {overallProgress}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": {
                bgcolor: overallProgress === 100 ? "success.main" : "primary.main",
              },
            }}
          />
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: { xs: 1, md: 2 }, overflow: "auto" }}>
        {programLoading || isLoadingCompletions ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : sections.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <Typography color="text.secondary">No workout sections defined.</Typography>
          </Box>
        ) : (
          <Stack spacing={{ xs: 2, md: 4 }}>
            {sections.map(section => {
              const currentDay = getCurrentDayForSection(section);

              if (!currentDay) {
                return (
                  <Paper key={section.id} variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Typography variant="h6" fontWeight={600} mb={1}>
                      {section.name || getSectionTypeLabel(section.type)}
                    </Typography>
                    <Typography color="text.secondary">No workout day found for today.</Typography>
                  </Paper>
                );
              }

              return (
                <Paper key={section.id} variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
                  <Typography variant="h6" fontWeight={600} mb={{ xs: 1.5, md: 2 }}>
                    {section.name || getSectionTypeLabel(section.type)}
                  </Typography>
                  <WorkoutDaySection
                    day={currentDay}
                    completionData={completionData[section.id]?.days?.[currentDay.id] || {}}
                    onSetToggle={(dayId, exerciseId, setNumber, outcome) => {
                      handleSetToggle(section.id, dayId, exerciseId, setNumber, outcome);
                    }}
                    onActualValueChange={(dayId, exerciseId, setNumber, field, value) => {
                      handleActualValueChange(section.id, dayId, exerciseId, setNumber, field, value);
                    }}
                    currentWeek={currentWeek}
                    exerciseRefs={exerciseRefs}
                    onSetComplete={handleSetComplete}
                  />
                </Paper>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: { xs: 1, md: 2 }, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={handleClose}>Close</Button>
        {overallProgress === 100 && (
          <Button variant="contained" color="success" startIcon={<Check fontSize="small" />} onClick={handleComplete}>
            Complete Workout
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

"use client";

import { Box, Button, Flex, Text, VStack, HStack, Badge, Progress, Dialog } from "@chakra-ui/react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import WorkoutDaySection from "./WorkoutDaySection";
import { useGetWorkoutProgramQuery } from "@/lib/store/api/workoutProgramsApi";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * WorkoutModal - Main modal for executing workouts
 * Displays exercises organized by section (warmup/workout/cooldown) and day
 * Tracks completion per set with auto-save
 */
export default function WorkoutModal({ task, isOpen, onClose, onCompleteTask, currentDate = new Date() }) {
  const { mode } = useSemanticColors();
  const { data: workoutProgram } = useGetWorkoutProgramQuery(task?.id, {
    skip: !task?.id,
  });
  const authFetch = useAuthFetch();
  const [completionData, setCompletionData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);
  const [workoutData, setWorkoutData] = useState(null);
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false);

  // Use refs to prevent save loops
  const pendingSaveRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;

  // Calculate total weeks from task recurrence dates
  const totalWeeks = useMemo(() => {
    if (!task?.recurrence?.startDate || !task?.recurrence?.endDate) return 1;

    const startDate = new Date(task.recurrence.startDate);
    const endDate = new Date(task.recurrence.endDate);
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(daysDiff / 7);

    return Math.max(1, weeks);
  }, [task?.recurrence]);

  // Determine current week based on task start date
  const currentWeek = useMemo(() => {
    if (!task?.recurrence?.startDate) return 1;

    const startDate = new Date(task.recurrence.startDate);
    const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysDiff / 7) + 1;

    return Math.min(Math.max(1, weekNumber), totalWeeks);
  }, [task?.recurrence, currentDate, totalWeeks]);

  // Determine current day of week
  const currentDayOfWeek = currentDate.getDay();

  // Load workout program from Redux query
  useEffect(() => {
    if (isOpen && workoutProgram) {
      setWorkoutData(workoutProgram);
    } else if (!isOpen) {
      setWorkoutData(null);
    }
  }, [isOpen, workoutProgram]);

  // Load set completions from database when modal opens
  useEffect(() => {
    if (!isOpen || !task?.id) {
      // Clear state when modal closes
      setCompletionData({});
      setHasAutoCompleted(false);
      pendingSaveRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      return;
    }

    const loadCompletions = async () => {
      setIsLoadingCompletions(true);
      pendingSaveRef.current = false; // Don't save data we just loaded
      try {
        const dateKey = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD
        const response = await authFetchRef.current(`/api/workout-set-completions?taskId=${task.id}&date=${dateKey}`);

        if (response.ok) {
          const data = await response.json();
          // Transform API response into completionData structure
          const transformed = {};

          const transformCompletion = completion => {
            if (!workoutData) return;

            for (const section of workoutData.sections) {
              for (const day of section.days) {
                const exercise = day.exercises.find(ex => ex.id === completion.exerciseId);
                if (exercise) {
                  if (!transformed[section.id]) transformed[section.id] = { days: {} };
                  if (!transformed[section.id].days[day.id]) {
                    transformed[section.id].days[day.id] = { exercises: {} };
                  }
                  if (!transformed[section.id].days[day.id].exercises[exercise.id]) {
                    transformed[section.id].days[day.id].exercises[exercise.id] = { sets: [] };
                  }

                  transformed[section.id].days[day.id].exercises[exercise.id].sets.push({
                    setNumber: completion.setNumber,
                    completed: completion.completed,
                    value: completion.value,
                    time: completion.time,
                    distance: completion.distance,
                    pace: completion.pace,
                  });
                  return; // Found the exercise, no need to continue
                }
              }
            }
          };

          data.completions.forEach(transformCompletion);
          setCompletionData(transformed);
        }
      } catch (err) {
        console.error("Failed to load workout completions:", err);
      } finally {
        setIsLoadingCompletions(false);
      }
    };

    if (workoutData) {
      loadCompletions();
    }
  }, [isOpen, task?.id, currentDate, workoutData, authFetch]);

  // Save function using refs to avoid dependency issues
  const saveCompletions = useCallback(
    async dataToSave => {
      if (!task?.id) return;

      setIsSaving(true);
      try {
        const dateKey = currentDate.toISOString().split("T")[0];
        const savePromises = [];

        const createSavePromise = (exerciseId, setData) => {
          return authFetchRef.current("/api/workout-set-completions", {
            method: "POST",
            body: JSON.stringify({
              taskId: task.id,
              date: dateKey,
              exerciseId,
              setNumber: setData.setNumber,
              completed: setData.completed,
              value: setData.value,
              time: setData.time,
              distance: setData.distance,
              pace: setData.pace,
            }),
          });
        };

        const processExerciseSets = (exerciseId, exerciseData) => {
          if (!exerciseData?.sets) return;
          exerciseData.sets.forEach(setData => {
            savePromises.push(createSavePromise(exerciseId, setData));
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

        Object.values(dataToSave).forEach(sectionData => {
          processSectionDays(sectionData);
        });

        await Promise.all(savePromises);
      } catch (err) {
        console.error("Failed to save workout progress:", err);
      } finally {
        setIsSaving(false);
        pendingSaveRef.current = false;
      }
    },
    [task?.id, currentDate]
  );

  // Trigger save when pendingSaveRef is set (called from handleSetToggle)
  useEffect(() => {
    // Only save if we have a pending save and not currently loading/saving
    if (!pendingSaveRef.current || isLoadingCompletions || isSaving) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current && Object.keys(completionData).length > 0) {
        saveCompletions(completionData);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [completionData, isLoadingCompletions, isSaving, saveCompletions]);

  const handleSetToggle = (sectionId, dayId, exerciseId, setNumber, setData) => {
    // Mark that we need to save after this update
    pendingSaveRef.current = true;

    setCompletionData(prev => {
      const newData = { ...prev };

      if (!newData[sectionId]) {
        newData[sectionId] = { days: {} };
      }
      if (!newData[sectionId].days[dayId]) {
        newData[sectionId].days[dayId] = { exercises: {} };
      }
      if (!newData[sectionId].days[dayId].exercises[exerciseId]) {
        newData[sectionId].days[dayId].exercises[exerciseId] = { sets: [] };
      }

      const sets = newData[sectionId].days[dayId].exercises[exerciseId].sets;
      const existingIndex = sets.findIndex(s => s.setNumber === setNumber);

      if (existingIndex >= 0) {
        sets[existingIndex] = setData;
      } else {
        sets.push(setData);
      }

      return newData;
    });
  };

  const handleActualValueChange = (sectionId, dayId, exerciseId, actualValue) => {
    // Mark that we need to save after this update
    pendingSaveRef.current = true;

    setCompletionData(prev => {
      const newData = { ...prev };

      if (!newData[sectionId]) {
        newData[sectionId] = { days: {} };
      }
      if (!newData[sectionId].days[dayId]) {
        newData[sectionId].days[dayId] = { exercises: {} };
      }
      if (!newData[sectionId].days[dayId].exercises[exerciseId]) {
        newData[sectionId].days[dayId].exercises[exerciseId] = { sets: [] };
      }

      newData[sectionId].days[dayId].exercises[exerciseId].actualValue = actualValue;

      return newData;
    });
  };

  // Helper to check if a set is complete based on exercise type
  const isSetComplete = (setData, exerciseType) => {
    if (exerciseType === "distance") {
      // For distance exercises, all three fields must be filled
      return Boolean(setData.time && setData.distance && setData.pace);
    }
    // For reps/time exercises, check the completed flag
    return Boolean(setData.completed);
  };

  // Helper to check if a day matches the current day of week
  const isDayForCurrentDayOfWeek = day => {
    // Support both old dayOfWeek (single) and new daysOfWeek (array)
    if (day.daysOfWeek) {
      return day.daysOfWeek.includes(currentDayOfWeek);
    }
    if (day.dayOfWeek !== undefined) {
      return day.dayOfWeek === currentDayOfWeek;
    }
    return false;
  };

  // Calculate progress for all sections on the current day
  const calculateProgress = () => {
    if (!workoutData) return { completed: 0, total: 0 };

    let totalSets = 0;
    let completedSets = 0;

    // Count exercises from all sections for the current day
    workoutData.sections.forEach(section => {
      const dayInSection = section.days.find(d => isDayForCurrentDayOfWeek(d)) || section.days[0];
      if (!dayInSection) return;

      dayInSection.exercises.forEach(exercise => {
        totalSets += exercise.sets;

        const sectionData = completionData[section.id];
        const dayData = sectionData?.days?.[dayInSection.id];
        const exerciseData = dayData?.exercises?.[exercise.id];

        if (exerciseData?.sets) {
          completedSets += exerciseData.sets.filter(s => isSetComplete(s, exercise.type)).length;
        }
      });
    });

    return { completed: completedSets, total: totalSets };
  };

  const progress = calculateProgress();
  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Auto-complete task when all exercises are done
  useEffect(() => {
    if (progress.total > 0 && progress.completed === progress.total && !hasAutoCompleted && onCompleteTask) {
      setHasAutoCompleted(true);
      onCompleteTask(task.id, currentDate);
    }
  }, [progress.completed, progress.total, hasAutoCompleted, onCompleteTask, task?.id, currentDate]);

  const bgColor = mode.bg.surface;

  if (!workoutData) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={e => !e.open && onClose()} size="xl">
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner>
        <Dialog.Content maxW="900px" maxH="90vh" overflowY="auto" bg={bgColor}>
          <Dialog.Header>
            <Dialog.Title>
              <Flex justify="space-between" align="center" w="full">
                <VStack align="flex-start" gap={1}>
                  <Text fontSize="xl" fontWeight="bold">
                    {task?.title}
                  </Text>
                  <HStack>
                    <Badge colorPalette="blue" size="sm">
                      Week {currentWeek} of {totalWeeks}
                    </Badge>
                    {isSaving && (
                      <Badge colorPalette="green" size="sm">
                        Saving...
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              </Flex>
            </Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="stretch" gap={4}>
              {/* Progress bar */}
              <Box>
                <Flex justify="space-between" mb={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Progress
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" color={mode.text.secondary}>
                    {Math.round(progressPercent)}%
                  </Text>
                </Flex>
                <Progress.Root value={progressPercent} size="sm" colorPalette="blue">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Show all sections for the current day */}
              {workoutData.sections.map(section => {
                const dayInSection = section.days.find(d => isDayForCurrentDayOfWeek(d)) || section.days[0];
                if (!dayInSection) return null;

                return (
                  <Box key={section.id}>
                    {/* Section header */}
                    <Text fontSize="md" fontWeight="bold" mb={3} color={mode.text.primary}>
                      {section.name}
                    </Text>
                    <WorkoutDaySection
                      day={dayInSection}
                      completionData={completionData[section.id]?.days?.[dayInSection.id] || {}}
                      onSetToggle={(exerciseId, setNumber, setData) =>
                        handleSetToggle(section.id, dayInSection.id, exerciseId, setNumber, setData)
                      }
                      currentWeek={currentWeek}
                      isCurrentDay={isDayForCurrentDayOfWeek(dayInSection)}
                      onActualValueChange={(exerciseId, actualValue) =>
                        handleActualValueChange(section.id, dayInSection.id, exerciseId, actualValue)
                      }
                    />
                  </Box>
                );
              })}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

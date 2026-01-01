"use client";

import { Box, Button, Flex, Text, VStack, HStack, Badge, Progress, Dialog } from "@chakra-ui/react";
import { useState, useEffect, useMemo } from "react";
import WorkoutDaySection from "./WorkoutDaySection";

/**
 * WorkoutModal - Main modal for executing workouts
 * Displays exercises organized by section (warmup/workout/cooldown) and day
 * Tracks completion per set with auto-save
 */
export default function WorkoutModal({
  task,
  isOpen,
  onClose,
  onSaveProgress,
  onCompleteTask,
  currentDate = new Date(),
}) {
  const [completionData, setCompletionData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasAutoCompleted, setHasAutoCompleted] = useState(false);

  const workoutData = task?.workoutData;

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

  // Load existing progress from task's workoutData
  useEffect(() => {
    if (workoutData?.progress) {
      const weekProgress = workoutData.progress[currentWeek];
      if (weekProgress?.sectionCompletions) {
        setCompletionData(weekProgress.sectionCompletions || {});
      }
    }
  }, [workoutData, currentWeek]);

  // Auto-save on completion data change
  useEffect(() => {
    // Don't save if there's no completion data or if it's empty
    if (Object.keys(completionData).length === 0) return;

    // Check if there's any actual progress (any section with days/exercises)
    const hasActualProgress = Object.values(completionData).some(
      sectionData => sectionData?.days && Object.keys(sectionData.days).length > 0
    );
    if (!hasActualProgress) return;

    if (isSaving) return;

    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        const workoutCompletion = {
          week: currentWeek,
          sectionCompletions: completionData,
        };

        await onSaveProgress(task.id, currentDate, workoutCompletion);
      } catch (err) {
        console.error("Failed to save workout progress:", err);
      } finally {
        setIsSaving(false);
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionData]);

  const handleSetToggle = (sectionId, dayId, exerciseId, setNumber, setData) => {
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

  if (!workoutData) {
    return null;
  }

  const bgColor = { _light: "white", _dark: "gray.800" };

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
                  <Text fontSize="sm" fontWeight="medium" color={{ _light: "gray.600", _dark: "gray.400" }}>
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
                    <Text fontSize="md" fontWeight="bold" mb={3} color={{ _light: "gray.700", _dark: "gray.200" }}>
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

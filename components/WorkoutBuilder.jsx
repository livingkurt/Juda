"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Input,
  VStack,
  HStack,
  IconButton,
  Textarea,
  Dialog,
  createListCollection,
} from "@chakra-ui/react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES } from "@/lib/constants";
import WeekdaySelector from "./WeekdaySelector";
import { SelectDropdown } from "./SelectDropdown";
import { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";
import { useToast } from "@/hooks/useToast";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// Helper to generate CUID-like IDs
function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}

/**
 * WorkoutBuilder - Modal for creating/editing workout structures
 * Allows users to build multi-week workout programs with sections, days, and exercises
 */
export default function WorkoutBuilder({ isOpen, onClose, taskId, onSaveComplete }) {
  const { data: existingProgram, isLoading: programLoading } = useGetWorkoutProgramQuery(taskId, {
    skip: !taskId,
  });
  const [saveWorkoutProgramMutation] = useSaveWorkoutProgramMutation();

  const saveWorkoutProgram = async (taskId, programData) => {
    return await saveWorkoutProgramMutation({ taskId, ...programData }).unwrap();
  };
  const { toast } = useToast();
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [numberOfWeeks, setNumberOfWeeks] = useState(0);
  const [name, setName] = useState("");

  // Create collections for selects
  const sectionTypeCollection = useMemo(() => createListCollection({ items: WORKOUT_SECTION_TYPES }), []);

  const exerciseTypeCollection = useMemo(() => createListCollection({ items: EXERCISE_TYPES }), []);

  const weekTypeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Normal", value: "normal" },
          { label: "Deload", value: "deload" },
          { label: "Test", value: "test" },
        ],
      }),
    []
  );

  // Helper to convert exercise type/unit to Select value
  const getExerciseSelectValue = (type, unit) => {
    if (type === "time") {
      return unit === "mins" ? "time_mins" : "time_secs";
    }
    return type; // "reps" or "distance"
  };

  // Helper to get capitalized label for exercise type/unit
  const getExerciseLabel = (type, unit) => {
    const selectValue = getExerciseSelectValue(type, unit);
    const exerciseType = EXERCISE_TYPES.find(t => t.value === selectValue);
    return exerciseType?.label || selectValue;
  };

  // Helper to parse number value based on exercise type
  const parseExerciseValue = (value, exerciseType) => {
    if (value === "") return null;
    if (exerciseType === "distance") {
      return parseFloat(value) || 0;
    }
    return parseInt(value) || 0;
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

  // Load existing workout program from Redux query
  // This effect synchronizes external state (Redux) with local editing state
  useEffect(() => {
    if (isOpen && existingProgram) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(existingProgram.name || "");

      setNumberOfWeeks(existingProgram.numberOfWeeks || 0);

      setSections(existingProgram.sections || []);

      // Expand first section and day by default
      if (existingProgram.sections?.length > 0) {
        const firstSectionId = existingProgram.sections[0].id;

        setExpandedSections({ [firstSectionId]: true });
        if (existingProgram.sections[0].days?.length > 0) {
          setExpandedDays({ [existingProgram.sections[0].days[0].id]: true });
        }
      }
    } else if (isOpen && !existingProgram && !programLoading) {
      // Initialize with defaults for new workout
      const defaultSection = {
        id: generateCuid(),
        name: "Workout",
        type: "workout",
        days: [],
      };

      setName("");

      setSections([defaultSection]);

      setExpandedSections({ [defaultSection.id]: true });

      setNumberOfWeeks(0);
    }
  }, [isOpen, existingProgram, programLoading]);

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

  const updateSection = (sectionId, updates) => {
    setSections(sections.map(s => (s.id === sectionId ? { ...s, ...updates } : s)));
  };

  const deleteSection = sectionId => {
    setSections(sections.filter(s => s.id !== sectionId));
    const newExpanded = { ...expandedSections };
    delete newExpanded[sectionId];
    setExpandedSections(newExpanded);
  };

  const addDay = sectionId => {
    const newDay = {
      id: generateCuid(),
      name: "New Day",
      daysOfWeek: [1], // Monday by default, but can select multiple
      exercises: [],
    };

    setSections(sections.map(s => (s.id === sectionId ? { ...s, days: [...s.days, newDay] } : s)));
    setExpandedDays({ ...expandedDays, [newDay.id]: true });
  };

  const updateDay = (sectionId, dayId, updates) => {
    setSections(
      sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              days: s.days.map(d => (d.id === dayId ? { ...d, ...updates } : d)),
            }
          : s
      )
    );
  };

  const deleteDay = (sectionId, dayId) => {
    setSections(sections.map(s => (s.id === sectionId ? { ...s, days: s.days.filter(d => d.id !== dayId) } : s)));
    const newExpanded = { ...expandedDays };
    delete newExpanded[dayId];
    setExpandedDays(newExpanded);
  };

  const addExercise = (sectionId, dayId) => {
    // Initialize weekly progression based on component-level numberOfWeeks
    const weeklyProgression = [];
    if (numberOfWeeks > 0) {
      for (let i = 1; i <= numberOfWeeks; i++) {
        weeklyProgression.push({
          week: i,
          targetValue: 10, // Default to the exercise's targetValue
          actualValue: null,
          isDeload: false,
          isTest: false,
        });
      }
    }

    const newExercise = {
      id: generateCuid(),
      name: "New Exercise",
      type: "reps",
      sets: 3,
      targetValue: 10,
      unit: "reps",
      notes: "",
      goal: "",
      weeklyProgression,
    };

    setSections(
      sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              days: s.days.map(d => (d.id === dayId ? { ...d, exercises: [...d.exercises, newExercise] } : d)),
            }
          : s
      )
    );
  };

  const updateExercise = (sectionId, dayId, exerciseId, updates) => {
    setSections(
      sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              days: s.days.map(d =>
                d.id === dayId
                  ? {
                      ...d,
                      exercises: d.exercises.map(e => (e.id === exerciseId ? { ...e, ...updates } : e)),
                    }
                  : d
              ),
            }
          : s
      )
    );
  };

  const deleteExercise = (sectionId, dayId, exerciseId) => {
    setSections(
      sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              days: s.days.map(d =>
                d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) } : d
              ),
            }
          : s
      )
    );
  };

  const updateNumberOfWeeks = newNumberOfWeeks => {
    setNumberOfWeeks(newNumberOfWeeks);

    // Sync all exercises across all sections and days
    setSections(
      sections.map(section => ({
        ...section,
        days: section.days.map(day => ({
          ...day,
          exercises: day.exercises.map(exercise => {
            const currentWeeks = exercise.weeklyProgression?.length || 0;

            if (newNumberOfWeeks === 0) {
              return { ...exercise, weeklyProgression: [] };
            }

            const progression = [...(exercise.weeklyProgression || [])];

            // Add weeks if needed
            for (let i = currentWeeks + 1; i <= newNumberOfWeeks; i++) {
              progression.push({
                week: i,
                targetValue: exercise.targetValue || null,
                actualValue: null,
                isDeload: false,
                isTest: false,
              });
            }

            // Remove weeks if needed
            if (progression.length > newNumberOfWeeks) {
              progression.splice(newNumberOfWeeks);
            }

            return { ...exercise, weeklyProgression: progression };
          }),
        })),
      }))
    );
  };

  const handleSave = async () => {
    if (!taskId) {
      toast({
        title: "Error",
        description: "Task ID is required",
        status: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await saveWorkoutProgram(taskId, {
        name,
        numberOfWeeks,
        sections,
      });

      toast({
        title: "Workout saved",
        status: "success",
        duration: 2000,
      });

      onSaveComplete?.();
      onClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
      toast({
        title: "Failed to save workout",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  const toggleSection = sectionId => {
    setExpandedSections({
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId],
    });
  };

  const toggleDay = dayId => {
    setExpandedDays({
      ...expandedDays,
      [dayId]: !expandedDays[dayId],
    });
  };

  const { mode } = useSemanticColors();
  const bgColor = mode.bg.surface;

  return (
    <Dialog.Root open={isOpen} onOpenChange={e => !e.open && onClose()} size="full">
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner>
        <Dialog.Content maxW="1200px" maxH="90vh" overflowY="auto" bg={bgColor}>
          <Dialog.Header>
            <Dialog.Title>Workout Builder</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="stretch" gap={6}>
              {/* Workout Name */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Workout Name (optional)
                </Text>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My Workout Program"
                  maxW="400px"
                />
              </Box>

              {/* Number of Weeks - Controls all exercises */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Number of Weeks
                </Text>
                <Input
                  type="number"
                  min="0"
                  value={numberOfWeeks}
                  onChange={e => {
                    const weeks = parseInt(e.target.value) || 0;
                    updateNumberOfWeeks(weeks);
                  }}
                  placeholder="0"
                  maxW="200px"
                />
                <Text fontSize="xs" color={mode.text.secondary} mt={1}>
                  This controls weekly progression for all exercises across all sections and days
                </Text>
              </Box>

              {/* Sections */}
              <VStack align="stretch" gap={4}>
                <Flex justify="space-between" align="center">
                  <Heading size="md">Sections</Heading>
                  <Button size="sm" onClick={addSection} colorPalette="blue">
                    <Plus size={16} />
                    Add Section
                  </Button>
                </Flex>

                {sections.map(section => (
                  <Box
                    key={section.id}
                    borderWidth="1px"
                    borderColor="gray.300"
                    _dark={{ borderColor: "gray.600" }}
                    borderRadius="md"
                    overflow="hidden"
                  >
                    {/* Section header */}
                    <Flex
                      p={3}
                      bg="gray.100"
                      _dark={{ bg: "gray.700" }}
                      justify="space-between"
                      align="center"
                      cursor="pointer"
                      onClick={() => toggleSection(section.id)}
                    >
                      <HStack flex={1} gap={3} align="flex-end">
                        {expandedSections[section.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <Box flex={1} minW={0}>
                          <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                            Section Name
                          </Text>
                          <Input
                            value={section.name}
                            onChange={e => {
                              e.stopPropagation();
                              updateSection(section.id, { name: e.target.value });
                            }}
                            onClick={e => e.stopPropagation()}
                            size="sm"
                            variant="filled"
                            w="full"
                          />
                        </Box>
                        <Box minW="150px" onClick={e => e.stopPropagation()}>
                          <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                            Section Type
                          </Text>
                          <SelectDropdown
                            collection={sectionTypeCollection}
                            value={[section.type]}
                            onValueChange={({ value }) => updateSection(section.id, { type: value[0] })}
                            placeholder="Section type"
                            size="sm"
                            inModal={true}
                          />
                        </Box>
                      </HStack>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={e => {
                          e.stopPropagation();
                          deleteSection(section.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Flex>

                    {/* Section content */}
                    {expandedSections[section.id] && (
                      <Box p={4}>
                        <VStack align="stretch" gap={3}>
                          <Button size="sm" onClick={() => addDay(section.id)} variant="outline">
                            <Plus size={14} />
                            Add Day
                          </Button>

                          {section.days.map(day => (
                            <Box
                              key={day.id}
                              borderWidth="1px"
                              borderColor={mode.border.default}
                              borderRadius="md"
                              overflow="hidden"
                            >
                              {/* Day header */}
                              <Flex
                                p={2}
                                bg="gray.50"
                                _dark={{ bg: "gray.800" }}
                                justify="space-between"
                                align="center"
                                cursor="pointer"
                                onClick={() => toggleDay(day.id)}
                              >
                                <HStack flex={1} gap={3} align="flex-end">
                                  {expandedDays[day.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <Box flex={1} minW={0}>
                                    <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                      Day Name
                                    </Text>
                                    <Input
                                      value={day.name}
                                      onChange={e => {
                                        e.stopPropagation();
                                        updateDay(section.id, day.id, { name: e.target.value });
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      size="sm"
                                      variant="filled"
                                      w="full"
                                    />
                                  </Box>
                                  <Box onClick={e => e.stopPropagation()} flexShrink={0}>
                                    <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                      Days of Week
                                    </Text>
                                    <WeekdaySelector
                                      selectedDays={
                                        day.daysOfWeek || (day.dayOfWeek !== undefined ? [day.dayOfWeek] : [])
                                      }
                                      onChange={newDays => updateDaysOfWeek(section.id, day.id, newDays)}
                                      size="xs"
                                    />
                                  </Box>
                                </HStack>
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  colorPalette="red"
                                  onClick={e => {
                                    e.stopPropagation();
                                    deleteDay(section.id, day.id);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </Flex>

                              {/* Day exercises */}
                              {expandedDays[day.id] && (
                                <Box p={3}>
                                  <VStack align="stretch" gap={2}>
                                    <Button size="xs" onClick={() => addExercise(section.id, day.id)} variant="outline">
                                      <Plus size={12} />
                                      Add Exercise
                                    </Button>

                                    {day.exercises.map(exercise => (
                                      <Box
                                        key={exercise.id}
                                        p={3}
                                        bg={mode.bg.canvas}
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor={mode.border.default}
                                      >
                                        <VStack align="stretch" gap={2}>
                                          <Flex justify="space-between" align="flex-end" gap={2}>
                                            <Box flex={1} minW={0}>
                                              <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                Exercise Name
                                              </Text>
                                              <Input
                                                value={exercise.name}
                                                onChange={e =>
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    name: e.target.value,
                                                  })
                                                }
                                                placeholder="Exercise name"
                                                size="sm"
                                                w="full"
                                              />
                                            </Box>
                                            <IconButton
                                              size="xs"
                                              variant="ghost"
                                              colorPalette="red"
                                              onClick={() => deleteExercise(section.id, day.id, exercise.id)}
                                              flexShrink={0}
                                            >
                                              <Trash2 size={12} />
                                            </IconButton>
                                          </Flex>

                                          <HStack gap={2} align="flex-end" w="full">
                                            <Box minW="180px" flex={1.5}>
                                              <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                Primary Metric
                                              </Text>
                                              <SelectDropdown
                                                collection={exerciseTypeCollection}
                                                value={[getExerciseSelectValue(exercise.type, exercise.unit)]}
                                                onValueChange={({ value }) => {
                                                  const { type, unit } = parseExerciseSelectValue(value[0]);
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    type,
                                                    unit,
                                                  });
                                                }}
                                                placeholder="Type"
                                                size="sm"
                                                inModal={true}
                                              />
                                            </Box>

                                            <Box minW="70px" flex={1}>
                                              <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                Sets
                                              </Text>
                                              <Input
                                                type="number"
                                                value={exercise.sets}
                                                onChange={e =>
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    sets: parseInt(e.target.value) || 1,
                                                  })
                                                }
                                                placeholder="Sets"
                                                size="sm"
                                                w="full"
                                              />
                                            </Box>

                                            <Box minW="90px" flex={1}>
                                              <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                {getExerciseLabel(exercise.type, exercise.unit)}
                                              </Text>
                                              <Input
                                                type="number"
                                                value={exercise.targetValue}
                                                onChange={e =>
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    targetValue: parseInt(e.target.value) || 0,
                                                  })
                                                }
                                                placeholder={getExerciseLabel(exercise.type, exercise.unit)}
                                                size="sm"
                                                w="full"
                                              />
                                            </Box>

                                            <Box minW="120px" flex={2}>
                                              <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                Goal (optional)
                                              </Text>
                                              <Input
                                                value={exercise.goal || ""}
                                                onChange={e =>
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    goal: e.target.value,
                                                  })
                                                }
                                                placeholder="Goal (optional)"
                                                size="sm"
                                                w="full"
                                              />
                                            </Box>
                                          </HStack>

                                          <Box>
                                            <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                              Notes (optional)
                                            </Text>
                                            <Textarea
                                              value={exercise.notes || ""}
                                              onChange={e =>
                                                updateExercise(section.id, day.id, exercise.id, {
                                                  notes: e.target.value,
                                                })
                                              }
                                              placeholder="Notes (optional)"
                                              size="sm"
                                              rows={2}
                                            />
                                          </Box>

                                          {/* Weekly Progression Editor */}
                                          {numberOfWeeks > 0 && (
                                            <Box>
                                              <Text fontSize="xs" fontWeight="medium" mb={1}>
                                                Weekly Progression
                                              </Text>
                                              <VStack align="stretch" gap={1}>
                                                {Array.from({ length: numberOfWeeks }, (_, i) => {
                                                  const weekNumber = i + 1;
                                                  const weekData = exercise.weeklyProgression?.find(
                                                    w => w.week === weekNumber
                                                  ) || {
                                                    week: weekNumber,
                                                    targetValue: exercise.targetValue || null,
                                                    actualValue: null,
                                                    isDeload: false,
                                                    isTest: false,
                                                  };
                                                  const isTest = weekData.isTest ?? false;
                                                  return (
                                                    <HStack key={weekNumber} gap={2} align="flex-end" w="full">
                                                      <Text fontSize="xs" minW="50px" flexShrink={0}>
                                                        Week {weekNumber}:
                                                      </Text>
                                                      {isTest ? (
                                                        <>
                                                          <Box minW="90px" flex={1}>
                                                            <Text fontSize="xs" color={mode.text.secondary} mb={0.5}>
                                                              Test week doesn&apos;t get target
                                                            </Text>
                                                          </Box>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Box minW="90px" flex={1}>
                                                            <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                              Target {getExerciseLabel(exercise.type, exercise.unit)}
                                                            </Text>
                                                            <Input
                                                              type="number"
                                                              step={exercise.type === "distance" ? "0.01" : "1"}
                                                              value={weekData.targetValue ?? ""}
                                                              onChange={e => {
                                                                const currentProgression =
                                                                  exercise.weeklyProgression || [];
                                                                const weekIndex = currentProgression.findIndex(
                                                                  w => w.week === weekNumber
                                                                );
                                                                const newProgression = [...currentProgression];

                                                                if (weekIndex >= 0) {
                                                                  newProgression[weekIndex] = {
                                                                    ...newProgression[weekIndex],
                                                                    targetValue: parseExerciseValue(
                                                                      e.target.value,
                                                                      exercise.type
                                                                    ),
                                                                  };
                                                                } else {
                                                                  newProgression.push({
                                                                    week: weekNumber,
                                                                    targetValue: parseExerciseValue(
                                                                      e.target.value,
                                                                      exercise.type
                                                                    ),
                                                                    actualValue: null,
                                                                    isDeload: false,
                                                                    isTest: false,
                                                                  });
                                                                  newProgression.sort((a, b) => a.week - b.week);
                                                                }

                                                                updateExercise(section.id, day.id, exercise.id, {
                                                                  weeklyProgression: newProgression,
                                                                });
                                                              }}
                                                              placeholder={getExerciseLabel(
                                                                exercise.type,
                                                                exercise.unit
                                                              )}
                                                              size="xs"
                                                              w="full"
                                                            />
                                                          </Box>
                                                        </>
                                                      )}
                                                      <Box minW="100px">
                                                        <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                          Type
                                                        </Text>
                                                        <SelectDropdown
                                                          collection={weekTypeCollection}
                                                          value={[
                                                            weekData.isDeload
                                                              ? "deload"
                                                              : weekData.isTest
                                                                ? "test"
                                                                : "normal",
                                                          ]}
                                                          onValueChange={({ value }) => {
                                                            const currentProgression = exercise.weeklyProgression || [];
                                                            const weekIdx = currentProgression.findIndex(
                                                              w => w.week === weekNumber
                                                            );
                                                            const newProgression = [...currentProgression];
                                                            const isDeload = value[0] === "deload";
                                                            const isTest = value[0] === "test";

                                                            if (weekIdx >= 0) {
                                                              newProgression[weekIdx] = {
                                                                ...newProgression[weekIdx],
                                                                isDeload,
                                                                isTest,
                                                              };
                                                            } else {
                                                              newProgression.push({
                                                                week: weekNumber,
                                                                targetValue: exercise.targetValue || null,
                                                                actualValue: null,
                                                                isDeload,
                                                                isTest,
                                                              });
                                                              newProgression.sort((a, b) => a.week - b.week);
                                                            }

                                                            updateExercise(section.id, day.id, exercise.id, {
                                                              weeklyProgression: newProgression,
                                                            });
                                                          }}
                                                          size="xs"
                                                          inModal={true}
                                                        />
                                                      </Box>
                                                    </HStack>
                                                  );
                                                })}
                                              </VStack>
                                            </Box>
                                          )}
                                        </VStack>
                                      </Box>
                                    ))}
                                  </VStack>
                                </Box>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button colorPalette="blue" onClick={handleSave} loading={programLoading}>
              Save Workout
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

"use client";

import {
  Box,
  Button,
  Flex,
  Title,
  Text,
  TextInput,
  Stack,
  Group,
  ActionIcon,
  Textarea,
  Modal,
  Collapse,
} from "@mantine/core";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES } from "@/lib/constants";
import WeekdaySelector from "./WeekdaySelector";
import { SelectDropdown } from "./SelectDropdown";
import { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation } from "@/lib/store/api/workoutProgramsApi";
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
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [numberOfWeeks, setNumberOfWeeks] = useState(0);
  const [name, setName] = useState("");

  // Create options for selects
  const sectionTypeOptions = useMemo(() => WORKOUT_SECTION_TYPES, []);

  const exerciseTypeOptions = useMemo(() => EXERCISE_TYPES, []);

  const weekTypeOptions = useMemo(
    () => [
      { label: "Normal", value: "normal" },
      { label: "Deload", value: "deload" },
      { label: "Test", value: "test" },
    ],
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
      console.error("Error: Task ID is required");
      return;
    }

    try {
      await saveWorkoutProgram(taskId, {
        name,
        numberOfWeeks,
        sections,
      });

      console.warn("Workout saved");

      onSaveComplete?.();
      onClose();
    } catch (err) {
      console.error("Failed to save workout:", err);
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
    <Modal
      opened={isOpen}
      onClose={onClose}
      size="full"
      title="Workout Builder"
      styles={{
        body: {
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: bgColor,
        },
      }}
    >
      <Stack align="stretch" gap={24}>
        {/* Workout Name */}
        <Box>
          <Text size="sm" fw={500} style={{ marginBottom: 4 }}>
            Workout Name (optional)
          </Text>
          <TextInput
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Workout Program"
            style={{ maxWidth: "400px" }}
          />
        </Box>

        {/* Number of Weeks - Controls all exercises */}
        <Box>
          <Text size="sm" fw={500} style={{ marginBottom: 4 }}>
            Number of Weeks
          </Text>
          <TextInput
            type="number"
            min="0"
            value={numberOfWeeks}
            onChange={e => {
              const weeks = parseInt(e.target.value) || 0;
              updateNumberOfWeeks(weeks);
            }}
            placeholder="0"
            style={{ maxWidth: "200px" }}
          />
          <Text size="xs" c={mode.text.secondary} style={{ marginTop: 4 }}>
            This controls weekly progression for all exercises across all sections and days
          </Text>
        </Box>

        {/* Sections */}
        <Stack align="stretch" gap={16}>
          <Flex justify="space-between" align="center">
            <Title size="md">Sections</Title>
            <Button size="sm" onClick={addSection} color="blue" leftSection={<Plus size={16} />}>
              Add Section
            </Button>
          </Flex>

          {sections.map(section => (
            <Box
              key={section.id}
              style={{
                borderWidth: "1px",
                borderColor: "var(--mantine-color-gray-3)",
                borderRadius: "var(--mantine-radius-md)",
                overflow: "hidden",
              }}
            >
              {/* Section header */}
              <Flex
                style={{
                  padding: 12,
                  background: "var(--mantine-color-gray-1)",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => toggleSection(section.id)}
              >
                <Group gap={12} style={{ flex: 1 }} align="flex-end">
                  {expandedSections[section.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                      Section Name
                    </Text>
                    <TextInput
                      value={section.name}
                      onChange={e => {
                        e.stopPropagation();
                        updateSection(section.id, { name: e.target.value });
                      }}
                      onClick={e => e.stopPropagation()}
                      size="sm"
                      variant="filled"
                      style={{ width: "100%" }}
                    />
                  </Box>
                  <Box style={{ minWidth: "150px" }} onClick={e => e.stopPropagation()}>
                    <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                      Section Type
                    </Text>
                    <SelectDropdown
                      data={sectionTypeOptions}
                      value={section.type}
                      onChange={type => updateSection(section.id, { type })}
                      placeholder="Section type"
                      size="sm"
                      inModal={true}
                    />
                  </Box>
                </Group>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={e => {
                    e.stopPropagation();
                    deleteSection(section.id);
                  }}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Flex>

              {/* Section content */}
              <Collapse in={expandedSections[section.id]}>
                <Box style={{ padding: 16 }}>
                  <Stack align="stretch" gap={12}>
                    <Button
                      size="sm"
                      onClick={() => addDay(section.id)}
                      variant="outline"
                      leftSection={<Plus size={14} />}
                    >
                      Add Day
                    </Button>

                    {section.days.map(day => (
                      <Box
                        key={day.id}
                        style={{
                          borderWidth: "1px",
                          borderColor: mode.border.default,
                          borderRadius: "var(--mantine-radius-md)",
                          overflow: "hidden",
                        }}
                      >
                        {/* Day header */}
                        <Flex
                          style={{
                            padding: 8,
                            background: "var(--mantine-color-gray-0)",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                          onClick={() => toggleDay(day.id)}
                        >
                          <Group gap={12} style={{ flex: 1 }} align="flex-end">
                            {expandedDays[day.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                Day Name
                              </Text>
                              <TextInput
                                value={day.name}
                                onChange={e => {
                                  e.stopPropagation();
                                  updateDay(section.id, day.id, { name: e.target.value });
                                }}
                                onClick={e => e.stopPropagation()}
                                size="sm"
                                variant="filled"
                                style={{ width: "100%" }}
                              />
                            </Box>
                            <Box onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                              <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                Days of Week
                              </Text>
                              <WeekdaySelector
                                selectedDays={day.daysOfWeek || (day.dayOfWeek !== undefined ? [day.dayOfWeek] : [])}
                                onChange={newDays => updateDaysOfWeek(section.id, day.id, newDays)}
                                size="xs"
                              />
                            </Box>
                          </Group>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={e => {
                              e.stopPropagation();
                              deleteDay(section.id, day.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </ActionIcon>
                        </Flex>

                        {/* Day exercises */}
                        <Collapse in={expandedDays[day.id]}>
                          <Box style={{ padding: 12 }}>
                            <Stack align="stretch" gap={8}>
                              <Button
                                size="xs"
                                onClick={() => addExercise(section.id, day.id)}
                                variant="outline"
                                leftSection={<Plus size={12} />}
                              >
                                Add Exercise
                              </Button>

                              {day.exercises.map(exercise => (
                                <Box
                                  key={exercise.id}
                                  style={{
                                    padding: 12,
                                    background: mode.bg.canvas,
                                    borderRadius: "var(--mantine-radius-md)",
                                    borderWidth: "1px",
                                    borderColor: mode.border.default,
                                    borderStyle: "solid",
                                  }}
                                >
                                  <Stack align="stretch" gap={8}>
                                    <Flex justify="space-between" align="flex-end" gap={8}>
                                      <Box style={{ flex: 1, minWidth: 0 }}>
                                        <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                          Exercise Name
                                        </Text>
                                        <TextInput
                                          value={exercise.name}
                                          onChange={e =>
                                            updateExercise(section.id, day.id, exercise.id, {
                                              name: e.target.value,
                                            })
                                          }
                                          placeholder="Exercise name"
                                          size="sm"
                                          style={{ width: "100%" }}
                                        />
                                      </Box>
                                      <ActionIcon
                                        size="xs"
                                        variant="subtle"
                                        color="red"
                                        onClick={() => deleteExercise(section.id, day.id, exercise.id)}
                                        style={{ flexShrink: 0 }}
                                      >
                                        <Trash2 size={12} />
                                      </ActionIcon>
                                    </Flex>

                                    <Group gap={8} align="flex-end" style={{ width: "100%" }}>
                                      <Box style={{ minWidth: "180px", flex: 1.5 }}>
                                        <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                          Primary Metric
                                        </Text>
                                        <SelectDropdown
                                          data={exerciseTypeOptions}
                                          value={getExerciseSelectValue(exercise.type, exercise.unit)}
                                          onChange={val => {
                                            const { type, unit } = parseExerciseSelectValue(val);
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

                                      <Box style={{ minWidth: "70px", flex: 1 }}>
                                        <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                          Sets
                                        </Text>
                                        <TextInput
                                          type="number"
                                          value={exercise.sets}
                                          onChange={e =>
                                            updateExercise(section.id, day.id, exercise.id, {
                                              sets: parseInt(e.target.value) || 1,
                                            })
                                          }
                                          placeholder="Sets"
                                          size="sm"
                                          style={{ width: "100%" }}
                                        />
                                      </Box>

                                      <Box style={{ minWidth: "90px", flex: 1 }}>
                                        <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                          {getExerciseLabel(exercise.type, exercise.unit)}
                                        </Text>
                                        <TextInput
                                          type="number"
                                          value={exercise.targetValue}
                                          onChange={e =>
                                            updateExercise(section.id, day.id, exercise.id, {
                                              targetValue: parseInt(e.target.value) || 0,
                                            })
                                          }
                                          placeholder={getExerciseLabel(exercise.type, exercise.unit)}
                                          size="sm"
                                          style={{ width: "100%" }}
                                        />
                                      </Box>

                                      <Box style={{ minWidth: "120px", flex: 2 }}>
                                        <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                          Goal (optional)
                                        </Text>
                                        <TextInput
                                          value={exercise.goal || ""}
                                          onChange={e =>
                                            updateExercise(section.id, day.id, exercise.id, {
                                              goal: e.target.value,
                                            })
                                          }
                                          placeholder="Goal (optional)"
                                          size="sm"
                                          style={{ width: "100%" }}
                                        />
                                      </Box>
                                    </Group>

                                    <Box>
                                      <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
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
                                        <Text size="xs" fw={500} style={{ marginBottom: 4 }}>
                                          Weekly Progression
                                        </Text>
                                        <Stack align="stretch" gap={4}>
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
                                              <Group
                                                key={weekNumber}
                                                gap={8}
                                                align="flex-end"
                                                style={{ width: "100%" }}
                                              >
                                                <Text size="xs" style={{ minWidth: "50px", flexShrink: 0 }}>
                                                  Week {weekNumber}:
                                                </Text>
                                                {isTest ? (
                                                  <>
                                                    <Box style={{ minWidth: "90px", flex: 1 }}>
                                                      <Text
                                                        size="xs"
                                                        c={mode.text.secondary}
                                                        style={{ marginBottom: 2 }}
                                                      >
                                                        Test week doesn&apos;t get target
                                                      </Text>
                                                    </Box>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Box style={{ minWidth: "90px", flex: 1 }}>
                                                      <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                                        Target {getExerciseLabel(exercise.type, exercise.unit)}
                                                      </Text>
                                                      <TextInput
                                                        type="number"
                                                        step={exercise.type === "distance" ? "0.01" : "1"}
                                                        value={weekData.targetValue ?? ""}
                                                        onChange={e => {
                                                          const currentProgression = exercise.weeklyProgression || [];
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
                                                        placeholder={getExerciseLabel(exercise.type, exercise.unit)}
                                                        size="xs"
                                                        style={{ width: "100%" }}
                                                      />
                                                    </Box>
                                                  </>
                                                )}
                                                <Box style={{ minWidth: "100px" }}>
                                                  <Text size="xs" fw={500} style={{ marginBottom: 2 }}>
                                                    Type
                                                  </Text>
                                                  <SelectDropdown
                                                    data={weekTypeOptions}
                                                    value={
                                                      weekData.isDeload ? "deload" : weekData.isTest ? "test" : "normal"
                                                    }
                                                    onChange={val => {
                                                      const currentProgression = exercise.weeklyProgression || [];
                                                      const weekIdx = currentProgression.findIndex(
                                                        w => w.week === weekNumber
                                                      );
                                                      const newProgression = [...currentProgression];
                                                      const isDeload = val === "deload";
                                                      const isTest = val === "test";

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
                                              </Group>
                                            );
                                          })}
                                        </Stack>
                                      </Box>
                                    )}
                                  </Stack>
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        </Collapse>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          ))}
        </Stack>
      </Stack>
      <Group justify="flex-end" style={{ marginTop: 16 }}>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button color="blue" onClick={handleSave} loading={programLoading}>
          Save Workout
        </Button>
      </Group>
    </Modal>
  );
}

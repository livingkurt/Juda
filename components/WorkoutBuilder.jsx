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
  Select,
  IconButton,
  Textarea,
  Dialog,
  createListCollection,
} from "@chakra-ui/react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES } from "@/lib/constants";
import WeekdaySelector from "./WeekdaySelector";

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
export default function WorkoutBuilder({ isOpen, onClose, onSave, initialData = null }) {
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  // Create collections for selects
  const sectionTypeCollection = useMemo(() => createListCollection({ items: WORKOUT_SECTION_TYPES }), []);

  const exerciseTypeCollection = useMemo(() => createListCollection({ items: EXERCISE_TYPES }), []);

  // Helper to convert exercise type/unit to Select value
  const getExerciseSelectValue = (type, unit) => {
    if (type === "time") {
      return unit === "mins" ? "time_mins" : "time_secs";
    }
    return type; // "reps" or "distance"
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

  // Initialize with existing data or defaults
  useEffect(() => {
    if (initialData) {
      setSections(initialData.sections || []);

      // Expand first section and day by default
      if (initialData.sections?.length > 0) {
        const firstSectionId = initialData.sections[0].id;
        setExpandedSections({ [firstSectionId]: true });
        if (initialData.sections[0].days?.length > 0) {
          setExpandedDays({ [initialData.sections[0].days[0].id]: true });
        }
      }
    } else {
      // Initialize with one workout section
      const defaultSection = {
        id: generateCuid(),
        name: "Workout",
        type: "workout",
        days: [],
      };
      setSections([defaultSection]);
      setExpandedSections({ [defaultSection.id]: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const newExercise = {
      id: generateCuid(),
      name: "New Exercise",
      type: "reps",
      sets: 3,
      targetValue: 10,
      unit: "reps",
      notes: "",
      goal: "",
      // Weekly progression can be added later if needed
      weeklyProgression: [],
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

  const handleSave = () => {
    const workoutData = {
      sections,
    };

    onSave(workoutData);
    onClose();
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

  const bgColor = { _light: "white", _dark: "gray.800" };

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
                        <Box minW="150px">
                          <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                            Section Type
                          </Text>
                          <Select.Root
                            collection={sectionTypeCollection}
                            value={[section.type]}
                            onValueChange={({ value }) => updateSection(section.id, { type: value[0] })}
                            size="sm"
                          >
                            <Select.Trigger onClick={e => e.stopPropagation()} w="full">
                              <Select.ValueText placeholder="Section type" />
                            </Select.Trigger>
                            <Select.Content>
                              {sectionTypeCollection.items.map(type => (
                                <Select.Item key={type.value} item={type}>
                                  {type.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
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
                              borderColor="gray.200"
                              _dark={{ borderColor: "gray.600" }}
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
                                        bg={{ _light: "white", _dark: "gray.900" }}
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor={{ _light: "gray.200", _dark: "gray.700" }}
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
                                              <Select.Root
                                                collection={exerciseTypeCollection}
                                                value={[getExerciseSelectValue(exercise.type, exercise.unit)]}
                                                onValueChange={({ value }) => {
                                                  const { type, unit } = parseExerciseSelectValue(value[0]);
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    type,
                                                    unit,
                                                  });
                                                }}
                                                size="sm"
                                              >
                                                <Select.Trigger w="full">
                                                  <Select.ValueText placeholder="Type" />
                                                </Select.Trigger>
                                                <Select.Content>
                                                  {exerciseTypeCollection.items.map(type => (
                                                    <Select.Item key={type.value} item={type}>
                                                      {type.label}
                                                    </Select.Item>
                                                  ))}
                                                </Select.Content>
                                              </Select.Root>
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
                                                Reps
                                              </Text>
                                              <Input
                                                type="number"
                                                value={exercise.targetValue}
                                                onChange={e =>
                                                  updateExercise(section.id, day.id, exercise.id, {
                                                    targetValue: parseInt(e.target.value) || 0,
                                                  })
                                                }
                                                placeholder="Target"
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
                                          {exercise.weeklyProgression && exercise.weeklyProgression.length > 0 && (
                                            <Box>
                                              <Text fontSize="xs" fontWeight="medium" mb={1}>
                                                Weekly Progression
                                              </Text>
                                              <VStack align="stretch" gap={1}>
                                                {exercise.weeklyProgression.map((weekData, weekIndex) => (
                                                  <HStack key={weekIndex} gap={2} align="flex-end" w="full">
                                                    <Text fontSize="xs" minW="50px" flexShrink={0}>
                                                      Week {weekData.week}:
                                                    </Text>
                                                    <Box minW="90px" flex={1}>
                                                      <Text fontSize="xs" fontWeight="medium" mb={0.5}>
                                                        Reps
                                                      </Text>
                                                      <Input
                                                        type="number"
                                                        value={weekData.targetValue ?? ""}
                                                        onChange={e => {
                                                          const newProgression = [...exercise.weeklyProgression];
                                                          newProgression[weekIndex] = {
                                                            ...newProgression[weekIndex],
                                                            targetValue:
                                                              e.target.value === ""
                                                                ? null
                                                                : parseInt(e.target.value) || 0,
                                                          };
                                                          updateExercise(section.id, day.id, exercise.id, {
                                                            weeklyProgression: newProgression,
                                                          });
                                                        }}
                                                        placeholder="Target"
                                                        size="xs"
                                                        w="full"
                                                      />
                                                    </Box>
                                                    <HStack gap={1}>
                                                      <label
                                                        style={{
                                                          fontSize: "11px",
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: "4px",
                                                        }}
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={weekData.isDeload || false}
                                                          onChange={e => {
                                                            const newProgression = [...exercise.weeklyProgression];
                                                            newProgression[weekIndex] = {
                                                              ...newProgression[weekIndex],
                                                              isDeload: e.target.checked,
                                                            };
                                                            updateExercise(section.id, day.id, exercise.id, {
                                                              weeklyProgression: newProgression,
                                                            });
                                                          }}
                                                        />
                                                        Deload
                                                      </label>
                                                      <label
                                                        style={{
                                                          fontSize: "11px",
                                                          display: "flex",
                                                          alignItems: "center",
                                                          gap: "4px",
                                                        }}
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={weekData.isTest || false}
                                                          onChange={e => {
                                                            const newProgression = [...exercise.weeklyProgression];
                                                            newProgression[weekIndex] = {
                                                              ...newProgression[weekIndex],
                                                              isTest: e.target.checked,
                                                            };
                                                            updateExercise(section.id, day.id, exercise.id, {
                                                              weeklyProgression: newProgression,
                                                            });
                                                          }}
                                                        />
                                                        Test
                                                      </label>
                                                    </HStack>
                                                  </HStack>
                                                ))}
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
            <Button colorPalette="blue" onClick={handleSave}>
              Save Workout
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

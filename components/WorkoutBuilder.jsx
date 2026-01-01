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
} from "@chakra-ui/react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { EXERCISE_TYPES, WORKOUT_SECTION_TYPES, DAYS_OF_WEEK } from "@/lib/constants";

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
  const [workoutName, setWorkoutName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedDays, setExpandedDays] = useState({});

  // Initialize with existing data or defaults
  useEffect(() => {
    if (initialData) {
      setWorkoutName(initialData.name || "");
      setStartDate(initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : "");
      setWeeks(initialData.weeks || 4);
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
  }, [initialData]);

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
      dayOfWeek: 1, // Monday
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
      weeklyProgression: Array.from({ length: weeks }, (_, i) => ({
        week: i + 1,
        targetValue: 10,
      })),
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
      name: workoutName,
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      weeks: parseInt(weeks),
      currentWeek: 1,
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
              {/* Workout metadata */}
              <Box p={4} bg={{ _light: "gray.50", _dark: "gray.700" }} borderRadius="md">
                <VStack align="stretch" gap={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Workout Name
                    </Text>
                    <Input
                      value={workoutName}
                      onChange={e => setWorkoutName(e.target.value)}
                      placeholder="e.g., Workout 8: 11/10/25 - 12/15/25"
                      bg="white"
                      _dark={{ bg: "gray.800" }}
                    />
                  </Box>
                  <HStack>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Start Date
                      </Text>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        bg="white"
                        _dark={{ bg: "gray.800" }}
                      />
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" mb={1}>
                        Total Weeks
                      </Text>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        value={weeks}
                        onChange={e => setWeeks(parseInt(e.target.value) || 1)}
                        bg="white"
                        _dark={{ bg: "gray.800" }}
                      />
                    </Box>
                  </HStack>
                </VStack>
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
                      <HStack flex={1}>
                        {expandedSections[section.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <Input
                          value={section.name}
                          onChange={e => {
                            e.stopPropagation();
                            updateSection(section.id, { name: e.target.value });
                          }}
                          onClick={e => e.stopPropagation()}
                          size="sm"
                          variant="filled"
                          maxW="300px"
                        />
                        <Select.Root
                          value={[section.type]}
                          onValueChange={e => updateSection(section.id, { type: e.value[0] })}
                          size="sm"
                          maxW="200px"
                        >
                          <Select.Trigger onClick={e => e.stopPropagation()}>
                            <Select.ValueText placeholder="Section type" />
                          </Select.Trigger>
                          <Select.Content>
                            {WORKOUT_SECTION_TYPES.map(type => (
                              <Select.Item key={type.value} item={type.value}>
                                {type.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Root>
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
                                <HStack flex={1}>
                                  {expandedDays[day.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <Input
                                    value={day.name}
                                    onChange={e => {
                                      e.stopPropagation();
                                      updateDay(section.id, day.id, { name: e.target.value });
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    size="sm"
                                    variant="filled"
                                    maxW="250px"
                                  />
                                  <Select.Root
                                    value={[day.dayOfWeek.toString()]}
                                    onValueChange={e =>
                                      updateDay(section.id, day.id, { dayOfWeek: parseInt(e.value[0]) })
                                    }
                                    size="sm"
                                    maxW="150px"
                                  >
                                    <Select.Trigger onClick={e => e.stopPropagation()}>
                                      <Select.ValueText placeholder="Day" />
                                    </Select.Trigger>
                                    <Select.Content>
                                      {DAYS_OF_WEEK.map(d => (
                                        <Select.Item key={d.value} item={d.value.toString()}>
                                          {d.label}
                                        </Select.Item>
                                      ))}
                                    </Select.Content>
                                  </Select.Root>
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
                                          <Flex justify="space-between" align="center">
                                            <Input
                                              value={exercise.name}
                                              onChange={e =>
                                                updateExercise(section.id, day.id, exercise.id, {
                                                  name: e.target.value,
                                                })
                                              }
                                              placeholder="Exercise name"
                                              size="sm"
                                              flex={1}
                                              mr={2}
                                            />
                                            <IconButton
                                              size="xs"
                                              variant="ghost"
                                              colorPalette="red"
                                              onClick={() => deleteExercise(section.id, day.id, exercise.id)}
                                            >
                                              <Trash2 size={12} />
                                            </IconButton>
                                          </Flex>

                                          <HStack>
                                            <Select.Root
                                              value={[exercise.type]}
                                              onValueChange={e => {
                                                const selectedType = EXERCISE_TYPES.find(t => t.value === e.value[0]);
                                                updateExercise(section.id, day.id, exercise.id, {
                                                  type: e.value[0],
                                                  unit: selectedType?.unit || "reps",
                                                });
                                              }}
                                              size="sm"
                                            >
                                              <Select.Trigger>
                                                <Select.ValueText placeholder="Type" />
                                              </Select.Trigger>
                                              <Select.Content>
                                                {EXERCISE_TYPES.map(type => (
                                                  <Select.Item key={type.value} item={type.value}>
                                                    {type.label}
                                                  </Select.Item>
                                                ))}
                                              </Select.Content>
                                            </Select.Root>

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
                                              maxW="80px"
                                            />

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
                                              maxW="100px"
                                            />

                                            <Input
                                              value={exercise.goal || ""}
                                              onChange={e =>
                                                updateExercise(section.id, day.id, exercise.id, {
                                                  goal: e.target.value,
                                                })
                                              }
                                              placeholder="Goal (optional)"
                                              size="sm"
                                              maxW="150px"
                                            />
                                          </HStack>

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

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  Dialog,
  Select,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Badge,
  Separator,
  Alert,
} from "@chakra-ui/react";
import { Info } from "lucide-react";
import { DAYS_OF_WEEK, DURATION_OPTIONS, TASK_COLORS } from "@/lib/constants";

// Helper to check if all values in array are equal
const allEqual = arr => arr.every(v => v === arr[0]);

// Helper to get common value or null if mixed
const getCommonValue = (tasks, getter) => {
  if (!tasks || tasks.length === 0) return null;
  const values = tasks.map(getter);
  return allEqual(values) ? values[0] : null;
};

// MixedBadge component - moved outside to avoid render-time creation
const MixedBadge = ({ isMixed, wasTouched, mixedBadgeBg }) => {
  if (!isMixed || wasTouched) return null;
  return (
    <Badge size="sm" bg={mixedBadgeBg} color="gray.500" fontSize="xs" ml={2}>
      Mixed
    </Badge>
  );
};

export const BulkEditDialog = ({
  isOpen,
  onClose,
  tasks, // Array of selected tasks
  sections,
  onSave,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const mixedBadgeBg = { _light: "gray.100", _dark: "gray.600" };

  // Track which fields user has touched
  const [touchedFields, setTouchedFields] = useState(new Set());

  // Form state - null means "mixed, don't update"
  const [sectionId, setSectionId] = useState(null);
  const [time, setTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [color, setColor] = useState(null);
  const [recurrenceType, setRecurrenceType] = useState(null);
  const [selectedDays, setSelectedDays] = useState(null);

  // Calculate initial values based on selected tasks
  const initialValues = useMemo(() => {
    if (!tasks || tasks.length === 0) return {};

    return {
      sectionId: getCommonValue(tasks, t => t.sectionId),
      time: getCommonValue(tasks, t => t.time || ""),
      duration: getCommonValue(tasks, t => t.duration),
      color: getCommonValue(tasks, t => t.color),
      recurrenceType: getCommonValue(tasks, t => t.recurrence?.type || "none"),
      selectedDays: (() => {
        const allDays = tasks.map(t => t.recurrence?.days || []);
        if (allDays.length === 0) return null;
        const firstDays = allDays[0].sort();
        const allSame = allDays.every(d => JSON.stringify(d.sort()) === JSON.stringify(firstDays));
        return allSame ? firstDays : null;
      })(),
    };
  }, [tasks]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && tasks?.length > 0) {
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setTouchedFields(new Set());
        setSectionId(initialValues.sectionId);
        setTime(initialValues.time);
        setDuration(initialValues.duration);
        setColor(initialValues.color);
        setRecurrenceType(initialValues.recurrenceType);
        setSelectedDays(initialValues.selectedDays);
      }, 0);
    }
  }, [isOpen, tasks, initialValues]);

  // Mark field as touched
  const touchField = fieldName => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  // Check if a field is mixed (different across tasks)
  const isMixed = fieldName => {
    return initialValues[fieldName] === null || initialValues[fieldName] === undefined;
  };

  // Check if field was touched
  const wasTouched = fieldName => {
    return touchedFields.has(fieldName);
  };

  // Get display value for a field
  const getDisplayValue = (fieldName, currentValue) => {
    if (isMixed(fieldName) && !wasTouched(fieldName)) {
      return ""; // Show empty for mixed untouched
    }
    return currentValue ?? "";
  };

  const handleSave = () => {
    // Build update object with only touched fields
    const updates = {};

    if (touchedFields.has("sectionId") && sectionId !== null) {
      updates.sectionId = sectionId;
    }
    if (touchedFields.has("time")) {
      updates.time = time || null;
    }
    if (touchedFields.has("duration") && duration !== null) {
      updates.duration = duration;
    }
    if (touchedFields.has("color") && color !== null) {
      updates.color = color;
    }
    if (touchedFields.has("recurrenceType") || touchedFields.has("selectedDays")) {
      // Only update recurrence if user touched related fields
      if (recurrenceType !== null && recurrenceType !== "") {
        updates.recurrence = {
          type: recurrenceType,
          ...(recurrenceType === "weekly" && selectedDays && selectedDays.length > 0 && { days: selectedDays }),
        };
      } else if (touchedFields.has("recurrenceType") && recurrenceType === "") {
        // User explicitly cleared recurrence
        updates.recurrence = null;
      }
    }

    // Only save if there are updates
    if (Object.keys(updates).length > 0) {
      onSave(
        tasks.map(t => t.id),
        updates
      );
    }
    onClose();
  };

  // Count of updates that will be applied
  const updateCount = touchedFields.size;

  return (
    <Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()} size="md">
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner>
        <Dialog.Content bg={bgColor} maxH="90vh" overflowY="auto">
          <Dialog.Header>Edit {tasks?.length || 0} Tasks</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <VStack spacing={4} py={2}>
              <Alert.Root status="info" borderRadius="md" fontSize="sm">
                <HStack spacing={2}>
                  <Info size={16} />
                  <Alert.Title>
                    Only fields you modify will be updated. Mixed values show &quot;Mixed&quot; - leave unchanged to
                    preserve individual values.
                  </Alert.Title>
                </HStack>
              </Alert.Root>

              {/* Section */}
              <Box w="full">
                <HStack mb={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Section
                  </Text>
                  <MixedBadge
                    fieldName="sectionId"
                    isMixed={isMixed("sectionId")}
                    wasTouched={wasTouched("sectionId")}
                    mixedBadgeBg={mixedBadgeBg}
                  />
                </HStack>
                <Select
                  value={getDisplayValue("sectionId", sectionId)}
                  onChange={e => {
                    touchField("sectionId");
                    setSectionId(e.target.value);
                  }}
                  placeholder={
                    isMixed("sectionId") && !wasTouched("sectionId") ? "Mixed - select to change" : undefined
                  }
                >
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Box>

              {/* Color */}
              <Box w="full">
                <HStack mb={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Color
                  </Text>
                  <MixedBadge
                    fieldName="color"
                    isMixed={isMixed("color")}
                    wasTouched={wasTouched("color")}
                    mixedBadgeBg={mixedBadgeBg}
                  />
                </HStack>
                <HStack spacing={2} mt={2} flexWrap="wrap">
                  {TASK_COLORS.map(c => (
                    <Button
                      key={c}
                      w={8}
                      h={8}
                      borderRadius="full"
                      bg={c}
                      onClick={() => {
                        touchField("color");
                        setColor(c);
                      }}
                      borderWidth={color === c && wasTouched("color") ? "3px" : "0px"}
                      borderColor="blue.400"
                      opacity={!wasTouched("color") && isMixed("color") ? 0.5 : 1}
                      _hover={{ transform: "scale(1.1)" }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </HStack>
              </Box>

              <Separator />

              {/* Time and Duration */}
              <SimpleGrid columns={2} spacing={4} w="full">
                <Box w="full">
                  <HStack mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Time
                    </Text>
                    <MixedBadge
                      fieldName="time"
                      isMixed={isMixed("time")}
                      wasTouched={wasTouched("time")}
                      mixedBadgeBg={mixedBadgeBg}
                    />
                  </HStack>
                  <Input
                    type="time"
                    value={getDisplayValue("time", time)}
                    onChange={e => {
                      touchField("time");
                      setTime(e.target.value);
                    }}
                    placeholder={isMixed("time") ? "Mixed" : ""}
                  />
                </Box>

                <Box w="full">
                  <HStack mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Duration
                    </Text>
                    <MixedBadge
                      fieldName="duration"
                      isMixed={isMixed("duration")}
                      wasTouched={wasTouched("duration")}
                      mixedBadgeBg={mixedBadgeBg}
                    />
                  </HStack>
                  <Select
                    value={wasTouched("duration") || !isMixed("duration") ? duration?.toString() || "" : ""}
                    onChange={e => {
                      touchField("duration");
                      setDuration(e.target.value ? parseInt(e.target.value) : null);
                    }}
                  >
                    {isMixed("duration") && !wasTouched("duration") && <option value="">Mixed</option>}
                    {DURATION_OPTIONS.map(d => (
                      <option key={d.value} value={d.value.toString()}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </Box>
              </SimpleGrid>

              <Separator />

              {/* Recurrence */}
              <Box w="full">
                <HStack mb={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Recurrence
                  </Text>
                  <MixedBadge
                    fieldName="recurrenceType"
                    isMixed={isMixed("recurrenceType")}
                    wasTouched={wasTouched("recurrenceType")}
                    mixedBadgeBg={mixedBadgeBg}
                  />
                </HStack>
                <Select
                  value={wasTouched("recurrenceType") || !isMixed("recurrenceType") ? recurrenceType || "none" : ""}
                  onChange={e => {
                    touchField("recurrenceType");
                    setRecurrenceType(e.target.value);
                    // Clear days if changing to non-weekly
                    if (e.target.value !== "weekly") {
                      setSelectedDays(null);
                    }
                  }}
                >
                  {isMixed("recurrenceType") && !wasTouched("recurrenceType") && <option value="">Mixed</option>}
                  <option value="none">None (One-time task)</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Specific days</option>
                </Select>
              </Box>

              {/* Weekly days selector */}
              {(recurrenceType === "weekly" || (isMixed("recurrenceType") && !wasTouched("recurrenceType"))) && (
                <Box w="full">
                  <HStack mb={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Days
                    </Text>
                    <MixedBadge
                      fieldName="selectedDays"
                      isMixed={isMixed("selectedDays")}
                      wasTouched={wasTouched("selectedDays")}
                      mixedBadgeBg={mixedBadgeBg}
                    />
                  </HStack>
                  <HStack spacing={1} mt={2}>
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        w={9}
                        h={9}
                        borderRadius="full"
                        fontSize="sm"
                        fontWeight="medium"
                        onClick={() => {
                          touchField("selectedDays");
                          touchField("recurrenceType");
                          if (!recurrenceType || recurrenceType === "") {
                            setRecurrenceType("weekly");
                          }
                          setSelectedDays(prev => {
                            const current = prev || [];
                            return current.includes(day.value)
                              ? current.filter(d => d !== day.value)
                              : [...current, day.value];
                          });
                        }}
                        colorPalette={selectedDays?.includes(day.value) ? "blue" : "gray"}
                        variant={selectedDays?.includes(day.value) ? "solid" : "outline"}
                        opacity={isMixed("selectedDays") && !wasTouched("selectedDays") ? 0.5 : 1}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </HStack>
                </Box>
              )}
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <HStack w="full" justify="space-between">
              <Text fontSize="sm" color="gray.500">
                {updateCount > 0 ? `${updateCount} field${updateCount !== 1 ? "s" : ""} will be updated` : "No changes"}
              </Text>
              <HStack>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button colorPalette="blue" onClick={handleSave} disabled={updateCount === 0}>
                  Update {tasks?.length || 0} Tasks
                </Button>
              </HStack>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

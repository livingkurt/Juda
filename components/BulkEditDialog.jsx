"use client";

import { useState, useMemo } from "react";
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
  Tag,
  createListCollection,
} from "@chakra-ui/react";
import { DAYS_OF_WEEK, DURATION_OPTIONS } from "@/lib/constants";
import { TagSelector } from "./TagSelector";

export const BulkEditDialog = ({
  isOpen,
  onClose,
  onSave,
  sections,
  tags,
  onCreateTag,
  onDeleteTag,
  selectedCount,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const placeholderColor = { _light: "gray.400", _dark: "gray.500" };

  // Track which fields have been focused/edited
  const [editedFields, setEditedFields] = useState(new Set());

  // Field states - all start as empty/placeholder
  const [sectionId, setSectionId] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [endDate, setEndDate] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [status, setStatus] = useState("");

  // Create collections for selects
  const sectionCollection = useMemo(
    () =>
      createListCollection({
        items: [{ label: "...", value: "" }, ...sections.map(s => ({ label: s.name, value: s.id }))],
      }),
    [sections]
  );

  const durationCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "...", value: "" },
          ...DURATION_OPTIONS.map(d => ({ label: d.label, value: d.value.toString() })),
        ],
      }),
    []
  );

  const recurrenceCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "...", value: "" },
          { label: "None (One-time task)", value: "none" },
          { label: "Every day", value: "daily" },
          { label: "Specific days", value: "weekly" },
        ],
      }),
    []
  );

  const statusCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "...", value: "" },
          { label: "Todo", value: "todo" },
          { label: "In Progress", value: "in_progress" },
          { label: "Complete", value: "complete" },
        ],
      }),
    []
  );

  const markFieldEdited = fieldName => {
    setEditedFields(prev => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
  };

  const handleSave = () => {
    // Only include fields that were actually edited
    const updates = {};

    if (editedFields.has("sectionId") && sectionId) {
      updates.sectionId = sectionId;
    }
    if (editedFields.has("time")) {
      updates.time = time || null;
    }
    if (editedFields.has("date")) {
      if (date) {
        updates.recurrence = {
          type: "none",
          startDate: `${date}T00:00:00.000Z`,
        };
      }
    }
    if (editedFields.has("duration") && duration) {
      updates.duration = parseInt(duration);
    }
    if (editedFields.has("recurrenceType") && recurrenceType) {
      if (recurrenceType === "none") {
        updates.recurrence = null;
      } else if (recurrenceType === "daily") {
        updates.recurrence = {
          type: "daily",
          ...(date && { startDate: `${date}T00:00:00.000Z` }),
          ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
        };
      } else if (recurrenceType === "weekly") {
        updates.recurrence = {
          type: "weekly",
          days: selectedDays,
          ...(date && { startDate: `${date}T00:00:00.000Z` }),
          ...(endDate && { endDate: `${endDate}T00:00:00.000Z` }),
        };
      }
    }
    if (editedFields.has("endDate")) {
      if (updates.recurrence) {
        updates.recurrence.endDate = endDate ? `${endDate}T00:00:00.000Z` : null;
      }
    }
    if (editedFields.has("tags")) {
      updates.tagIds = selectedTagIds;
    }
    if (editedFields.has("status") && status) {
      updates.status = status;
    }

    onSave(updates);

    // Reset state
    setEditedFields(new Set());
    setSectionId("");
    setTime("");
    setDate("");
    setDuration("");
    setRecurrenceType("");
    setSelectedDays([]);
    setEndDate("");
    setSelectedTagIds([]);
    setStatus("");
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    handleSave();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()} size="md">
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner>
        <Dialog.Content bg={bgColor} maxH="90vh" overflowY="auto">
          <Dialog.Header>Bulk Edit ({selectedCount} tasks)</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <form onSubmit={handleFormSubmit}>
              <VStack spacing={4} py={4}>
                <Box w="full">
                  <Text fontSize="sm" color="gray.500" mb={4}>
                    Only fields you change will be updated. Fields showing "..." will remain unchanged.
                  </Text>
                </Box>

                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Section
                  </Text>
                  <Select.Root
                    collection={sectionCollection}
                    value={[sectionId]}
                    onValueChange={({ value }) => {
                      setSectionId(value[0]);
                      markFieldEdited("sectionId");
                    }}
                    onFocus={() => markFieldEdited("sectionId")}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="..." />
                    </Select.Trigger>
                    <Select.Content>
                      {sectionCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <Box>
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Date
                    </Text>
                    <Input
                      type="date"
                      value={date}
                      onChange={e => {
                        setDate(e.target.value);
                        markFieldEdited("date");
                      }}
                      onFocus={() => markFieldEdited("date")}
                      placeholder="..."
                      borderColor={borderColor}
                      fontSize={{ base: "md", md: "md" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                      _placeholder={{ color: placeholderColor }}
                    />
                  </Box>
                  <Box>
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      Time
                    </Text>
                    <Input
                      type="time"
                      value={time}
                      onChange={e => {
                        setTime(e.target.value);
                        markFieldEdited("time");
                      }}
                      onFocus={() => markFieldEdited("time")}
                      placeholder="..."
                      borderColor={borderColor}
                      fontSize={{ base: "md", md: "md" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                      _placeholder={{ color: placeholderColor }}
                    />
                  </Box>
                </SimpleGrid>

                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Duration
                  </Text>
                  <Select.Root
                    collection={durationCollection}
                    value={[duration]}
                    onValueChange={({ value }) => {
                      setDuration(value[0]);
                      markFieldEdited("duration");
                    }}
                    onFocus={() => markFieldEdited("duration")}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="..." />
                    </Select.Trigger>
                    <Select.Content>
                      {durationCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Status
                  </Text>
                  <Select.Root
                    collection={statusCollection}
                    value={[status]}
                    onValueChange={({ value }) => {
                      setStatus(value[0]);
                      markFieldEdited("status");
                    }}
                    onFocus={() => markFieldEdited("status")}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="..." />
                    </Select.Trigger>
                    <Select.Content>
                      {statusCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Recurrence
                  </Text>
                  <Select.Root
                    collection={recurrenceCollection}
                    value={[recurrenceType]}
                    onValueChange={({ value }) => {
                      setRecurrenceType(value[0]);
                      markFieldEdited("recurrenceType");
                    }}
                    onFocus={() => markFieldEdited("recurrenceType")}
                  >
                    <Select.Trigger>
                      <Select.ValueText placeholder="..." />
                    </Select.Trigger>
                    <Select.Content>
                      {recurrenceCollection.items.map(item => (
                        <Select.Item key={item.value} item={item}>
                          {item.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                {recurrenceType === "weekly" && (
                  <HStack spacing={1} w="full">
                    {DAYS_OF_WEEK.map(day => (
                      <Button
                        key={day.value}
                        w={9}
                        h={9}
                        borderRadius="full"
                        fontSize={{ base: "xs", md: "sm" }}
                        fontWeight="medium"
                        onClick={() => {
                          setSelectedDays(prev =>
                            prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value]
                          );
                          markFieldEdited("recurrenceType");
                        }}
                        colorPalette={selectedDays.includes(day.value) ? "blue" : "gray"}
                        variant={selectedDays.includes(day.value) ? "solid" : "outline"}
                      >
                        {day.short}
                      </Button>
                    ))}
                  </HStack>
                )}

                {recurrenceType !== "" && recurrenceType !== "none" && (
                  <Box w="full">
                    <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                      End Date (Optional)
                    </Text>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        markFieldEdited("endDate");
                      }}
                      onFocus={() => markFieldEdited("endDate")}
                      placeholder="No end date"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                      }}
                    />
                  </Box>
                )}

                <Box w="full">
                  <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="medium" mb={1}>
                    Tags
                  </Text>
                  <Box
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                    p={3}
                    minH="48px"
                    onClick={() => markFieldEdited("tags")}
                  >
                    <HStack spacing={2} flexWrap="wrap" align="center">
                      {/* Selected Tags */}
                      {Array.isArray(tags) &&
                        tags
                          .filter(t => selectedTagIds.includes(t.id))
                          .map(tag => (
                            <Tag.Root
                              key={tag.id}
                              size="sm"
                              borderRadius="full"
                              variant="solid"
                              bg={tag.color}
                              color="white"
                              fontSize="xs"
                            >
                              <Tag.Label>{tag.name}</Tag.Label>
                            </Tag.Root>
                          ))}
                      {/* Add Tag button */}
                      <TagSelector
                        tags={tags}
                        selectedTagIds={selectedTagIds}
                        onTagsChange={newTagIds => {
                          setSelectedTagIds(newTagIds);
                          markFieldEdited("tags");
                        }}
                        onCreateTag={onCreateTag}
                        onDeleteTag={onDeleteTag}
                        inline
                      />
                    </HStack>
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Tags will be added to selected tasks (existing tags will be preserved)
                  </Text>
                </Box>
              </VStack>
            </form>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} isDisabled={editedFields.size === 0}>
              Update {selectedCount} Task(s)
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

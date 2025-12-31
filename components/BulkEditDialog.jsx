"use client";

import { useState, useMemo, useEffect } from "react";
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
  createListCollection,
} from "@chakra-ui/react";
import { DAYS_OF_WEEK, DURATION_OPTIONS } from "@/lib/constants";
import { TagSelector } from "./TagSelector";
import { TagChip } from "./TagChip";

export const BulkEditDialog = ({
  isOpen,
  onClose,
  onSave,
  sections,
  tags,
  onCreateTag,
  onDeleteTag,
  selectedCount,
  selectedTasks,
}) => {
  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };
  const placeholderColor = { _light: "gray.400", _dark: "gray.500" };

  // Calculate common values across all selected tasks
  const commonValues = useMemo(() => {
    if (!selectedTasks || selectedTasks.length === 0) {
      return {
        sectionId: "",
        time: "",
        date: "",
        duration: "",
        recurrenceType: "",
        selectedDays: [],
        endDate: "",
        tagIds: [],
        status: "",
      };
    }

    const first = selectedTasks[0];
    const common = {
      sectionId: selectedTasks.every(t => t.sectionId === first.sectionId) ? first.sectionId : "",
      time: selectedTasks.every(t => t.time === first.time) ? first.time || "" : "",
      duration: selectedTasks.every(t => t.duration === first.duration) ? first.duration.toString() : "",
      status: selectedTasks.every(t => t.status === first.status) ? first.status || "" : "",
    };

    // Handle date from recurrence
    if (first.recurrence?.startDate) {
      const firstDate = first.recurrence.startDate.split("T")[0];
      common.date = selectedTasks.every(t => t.recurrence?.startDate?.split("T")[0] === firstDate) ? firstDate : "";
    } else {
      common.date = "";
    }

    // Handle recurrence type
    const firstRecType = first.recurrence?.type || "none";
    common.recurrenceType = selectedTasks.every(t => (t.recurrence?.type || "none") === firstRecType)
      ? firstRecType
      : "";

    // Handle weekly days
    if (firstRecType === "weekly" && first.recurrence?.days) {
      const firstDays = JSON.stringify(first.recurrence.days.sort());
      common.selectedDays = selectedTasks.every(
        t => t.recurrence?.type === "weekly" && JSON.stringify((t.recurrence.days || []).sort()) === firstDays
      )
        ? first.recurrence.days
        : [];
    } else {
      common.selectedDays = [];
    }

    // Handle end date
    if (first.recurrence?.endDate) {
      const firstEndDate = first.recurrence.endDate.split("T")[0];
      common.endDate = selectedTasks.every(t => t.recurrence?.endDate?.split("T")[0] === firstEndDate)
        ? firstEndDate
        : "";
    } else {
      common.endDate = "";
    }

    // Handle tags - find tags that ALL selected tasks have in common
    const allTaskTags = selectedTasks.map(t => (t.tags || []).map(tag => tag.id));
    if (allTaskTags.length > 0) {
      const commonTagIds = allTaskTags[0].filter(tagId => allTaskTags.every(taskTagIds => taskTagIds.includes(tagId)));
      common.tagIds = commonTagIds;
    } else {
      common.tagIds = [];
    }

    return common;
  }, [selectedTasks]);

  // Track which fields have been focused/edited
  const [editedFields, setEditedFields] = useState(new Set());

  // Field states - use common values directly (will update when commonValues changes)
  const [sectionId, setSectionId] = useState(commonValues.sectionId);
  const [time, setTime] = useState(commonValues.time);
  const [date, setDate] = useState(commonValues.date);
  const [duration, setDuration] = useState(commonValues.duration);
  const [recurrenceType, setRecurrenceType] = useState(commonValues.recurrenceType);
  const [selectedDays, setSelectedDays] = useState(commonValues.selectedDays);
  const [endDate, setEndDate] = useState(commonValues.endDate);
  const [selectedTagIds, setSelectedTagIds] = useState(commonValues.tagIds);
  const [status, setStatus] = useState(commonValues.status);

  // Reset to common values when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset all fields to common values
      setSectionId(commonValues.sectionId);
      setTime(commonValues.time);
      setDate(commonValues.date);
      setDuration(commonValues.duration);
      setRecurrenceType(commonValues.recurrenceType);
      setSelectedDays(commonValues.selectedDays);
      setEndDate(commonValues.endDate);
      setSelectedTagIds(commonValues.tagIds);
      setStatus(commonValues.status);
      setEditedFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
                    Fields show common values across all selected tasks. Only fields you change will be updated. Fields
                    showing &quot;...&quot; have different values or are empty.
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
                          .map(tag => <TagChip key={tag.id} tag={tag} size="sm" />)}
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
                    Common tags are shown. Add more tags to apply them to all selected tasks.
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

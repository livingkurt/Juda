"use client";

import { useState, useMemo, useEffect } from "react";
import { Box, Button, TextInput, Modal, Stack, Group, SimpleGrid, Text } from "@mantine/core";
import { DURATION_OPTIONS } from "@/lib/constants";
import { TagSelector } from "./TagSelector";
import { TagChip } from "./TagChip";
import { SelectDropdown } from "./SelectDropdown";
import { useSemanticColors } from "@/hooks/useSemanticColors";
import WeekdaySelector from "./WeekdaySelector";

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
  const { mode } = useSemanticColors();
  const borderColor = mode.border.default;

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

  // Create data arrays for selects
  const sectionData = useMemo(
    () => [{ label: "...", value: "" }, ...sections.map(s => ({ label: s.name, value: s.id }))],
    [sections]
  );

  const durationData = useMemo(
    () => [{ label: "...", value: "" }, ...DURATION_OPTIONS.map(d => ({ label: d.label, value: d.value.toString() }))],
    []
  );

  const recurrenceData = useMemo(
    () => [
      { label: "...", value: "" },
      { label: "None (One-time task)", value: "none" },
      { label: "Every day", value: "daily" },
      { label: "Specific days", value: "weekly" },
    ],
    []
  );

  const statusData = useMemo(
    () => [
      { label: "...", value: "" },
      { label: "Todo", value: "todo" },
      { label: "In Progress", value: "in_progress" },
      { label: "Complete", value: "complete" },
    ],
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
    <Modal opened={isOpen} onClose={onClose} title={`Bulk Edit (${selectedCount} tasks)`} size="md" centered>
      <form onSubmit={handleFormSubmit}>
        <Stack gap="md" py="md" style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <Box w="100%">
            <Text size="sm" c="gray.5" mb={16}>
              Fields show common values across all selected tasks. Only fields you change will be updated. Fields
              showing &quot;...&quot; have different values or are empty.
            </Text>
          </Box>

          <Box w="100%">
            <Text size={["xs", "sm"]} fw={500} mb={4}>
              Section
            </Text>
            <SelectDropdown
              data={sectionData}
              value={sectionId}
              onChange={value => {
                setSectionId(value);
                markFieldEdited("sectionId");
              }}
              placeholder="..."
            />
          </Box>

          <SimpleGrid cols={2} spacing="md" w="100%">
            <Box>
              <Text size={["xs", "sm"]} fw={500} mb={4}>
                Date
              </Text>
              <TextInput
                type="date"
                value={date}
                onChange={e => {
                  setDate(e.target.value);
                  markFieldEdited("date");
                }}
                onFocus={() => markFieldEdited("date")}
                placeholder="..."
                style={{
                  fontSize: "16px",
                }}
              />
            </Box>
            <Box>
              <Text size={["xs", "sm"]} fw={500} mb={4}>
                Time
              </Text>
              <TextInput
                type="time"
                value={time}
                onChange={e => {
                  setTime(e.target.value);
                  markFieldEdited("time");
                }}
                onFocus={() => markFieldEdited("time")}
                placeholder="..."
                style={{
                  fontSize: "16px",
                }}
              />
            </Box>
          </SimpleGrid>

          <Box w="100%">
            <Text size={["xs", "sm"]} fw={500} mb={4}>
              Duration
            </Text>
            <SelectDropdown
              data={durationData}
              value={duration}
              onChange={value => {
                setDuration(value);
                markFieldEdited("duration");
              }}
              placeholder="..."
            />
          </Box>

          <Box w="100%">
            <Text size={["xs", "sm"]} fw={500} mb={4}>
              Status
            </Text>
            <SelectDropdown
              data={statusData}
              value={status}
              onChange={value => {
                setStatus(value);
                markFieldEdited("status");
              }}
              placeholder="..."
            />
          </Box>

          <Box w="100%">
            <Text size={["xs", "sm"]} fw={500} mb={4}>
              Recurrence
            </Text>
            <SelectDropdown
              data={recurrenceData}
              value={recurrenceType}
              onChange={value => {
                setRecurrenceType(value);
                markFieldEdited("recurrenceType");
              }}
              placeholder="..."
            />
          </Box>

          {recurrenceType === "weekly" && (
            <Box w="100%">
              <WeekdaySelector
                selectedDays={selectedDays}
                onChange={newDays => {
                  setSelectedDays(newDays);
                  markFieldEdited("recurrenceType");
                }}
                size="sm"
              />
            </Box>
          )}

          {recurrenceType !== "" && recurrenceType !== "none" && (
            <Box w="100%">
              <Text size={["xs", "sm"]} fw={500} mb={4}>
                End Date (Optional)
              </Text>
              <TextInput
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  markFieldEdited("endDate");
                }}
                onFocus={() => markFieldEdited("endDate")}
                placeholder="No end date"
                style={{
                  fontSize: "16px",
                }}
              />
            </Box>
          )}

          <Box w="100%">
            <Text size={["xs", "sm"]} fw={500} mb={4}>
              Tags
            </Text>
            <Box
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: "0.375rem",
                padding: 12,
                minHeight: "48px",
              }}
              onClick={() => markFieldEdited("tags")}
            >
              <Group gap={8} wrap="wrap" align="center">
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
              </Group>
            </Box>
            <Text size="xs" c="gray.5" mt={4}>
              Common tags are shown. Add more tags to apply them to all selected tasks.
            </Text>
          </Box>
        </Stack>
      </form>
      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={editedFields.size === 0}>
          Update {selectedCount} Task(s)
        </Button>
      </Group>
    </Modal>
  );
};

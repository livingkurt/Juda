"use client";

import { useState, useMemo } from "react";
import { Box, Stack, Text, Button, TextInput, Title, Badge, Group } from "@mantine/core";
import { SelectDropdown } from "./SelectDropdown";
import { formatDateDisplay } from "@/lib/utils";
import { useSemanticColors } from "@/hooks/useSemanticColors";

// Format time for input (HH:MM)
const formatTimeForInput = time => {
  if (!time) return "";
  return time;
};

export const CellEditorPopover = ({ task, date, completion, isScheduled, onSave, onDelete, onClose }) => {
  const { mode } = useSemanticColors();
  // Initialize state based on completion - use "null" string for unchecked state
  const [outcome, setOutcome] = useState(() => completion?.outcome || "null");
  const [note, setNote] = useState(() => completion?.note || "");
  const [time, setTime] = useState(() => (completion?.completedAt ? formatTimeForInput(task.time) : task.time || ""));

  const outcomeData = useMemo(
    () => [
      { label: "Unchecked", value: "null" },
      { label: "Complete", value: "completed" },
      { label: "Not Completed", value: "not_completed" },
    ],
    []
  );

  const handleSave = () => {
    // If outcome is "null" (Unchecked), delete the completion instead
    if (outcome === "null") {
      if (completion) {
        onDelete();
      } else {
        // Nothing to do - no completion exists and user wants it unchecked
        onClose();
      }
      return;
    }

    const saveData = {
      outcome,
      note: task.completionType === "text" ? note : null,
      time: time || null, // Include time for off-schedule completions
      isScheduled, // Let the handler know if this is off-schedule
    };
    onSave(saveData);
  };

  const handleDelete = () => {
    if (completion) {
      onDelete();
    }
  };

  return (
    <Box p="md" style={{ minWidth: "300px" }}>
      <Stack gap="md">
        {/* Header */}
        <Stack gap={4}>
          <Title order={5}>{task.title}</Title>
          <Text size="sm" c={mode.text.secondary}>
            {formatDateDisplay(date)}
          </Text>
          {!isScheduled && (
            <Badge color="purple" size="sm" style={{ width: "fit-content" }}>
              Off-schedule completion
            </Badge>
          )}
        </Stack>

        {/* Outcome selector */}
        <Stack gap={8}>
          <Text size="sm" fw={500}>
            Status
          </Text>
          <SelectDropdown
            data={outcomeData}
            value={outcome}
            onChange={setOutcome}
            placeholder="Select status"
            size="sm"
          />
        </Stack>

        {/* Time picker - show for off-schedule or if task has time */}
        {(!isScheduled || task.time) && (
          <Stack gap={8}>
            <Text size="sm" fw={500}>
              Time (optional)
            </Text>
            <TextInput type="time" value={time} onChange={e => setTime(e.target.value)} size="sm" />
          </Stack>
        )}

        {/* Note input - only for text completion type */}
        {task.completionType === "text" && (
          <Stack gap={8}>
            <Text size="sm" fw={500}>
              Note
            </Text>
            <TextInput value={note} onChange={e => setNote(e.target.value)} placeholder="Enter note..." size="sm" />
          </Stack>
        )}

        {/* Actions */}
        <Group justify="flex-end" gap={8} pt={8}>
          {completion && (
            <Button size="sm" variant="outline" color="red" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" color="blue" onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};

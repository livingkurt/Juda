"use client";

import { useState, useEffect, useMemo } from "react";
import { Box, VStack, HStack, Text, Button, Input, createListCollection, Heading, Badge } from "@chakra-ui/react";
import { SelectDropdown } from "./SelectDropdown";
import { formatDateDisplay } from "@/lib/utils";

// Format time for input (HH:MM)
const formatTimeForInput = time => {
  if (!time) return "";
  return time;
};

export const CellEditorPopover = ({ task, date, completion, isScheduled, onSave, onDelete, onClose }) => {
  const [outcome, setOutcome] = useState(completion?.outcome || "completed");
  const [note, setNote] = useState(completion?.note || "");
  const [time, setTime] = useState(completion?.completedAt ? formatTimeForInput(task.time) : task.time || "");

  const outcomeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Complete", value: "completed" },
          { label: "Not Completed", value: "not_completed" },
        ],
      }),
    []
  );

  useEffect(() => {
    if (completion) {
      setOutcome(completion.outcome);
      setNote(completion.note || "");
      // For time, use task's time or completion's time if available
      setTime(task.time || "");
    } else {
      setOutcome("completed");
      setNote("");
      setTime(task.time || "");
    }
  }, [completion, task]);

  const handleSave = () => {
    const saveData = {
      outcome,
      note: task.completionType === "text" ? note : null,
      // For off-schedule completions, we might want to store time
      // But for now, we'll just use the outcome and note
    };
    onSave(saveData);
  };

  const handleDelete = () => {
    if (completion) {
      onDelete();
    }
  };

  return (
    <Box p={4} minW="300px">
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <VStack align="stretch" spacing={1}>
          <Heading size="sm">{task.title}</Heading>
          <Text fontSize="sm" color={{ _light: "gray.600", _dark: "gray.400" }}>
            {formatDateDisplay(date)}
          </Text>
          {!isScheduled && (
            <Badge colorPalette="purple" size="sm" w="fit-content">
              Off-schedule completion
            </Badge>
          )}
        </VStack>

        {/* Outcome selector */}
        <VStack align="stretch" spacing={2}>
          <Text fontSize="sm" fontWeight="medium">
            Status
          </Text>
          <SelectDropdown
            collection={outcomeCollection}
            value={[outcome]}
            onValueChange={({ value }) => setOutcome(value[0])}
            placeholder="Select status"
            size="sm"
            inModal={true}
          />
        </VStack>

        {/* Time picker - show for off-schedule or if task has time */}
        {(!isScheduled || task.time) && (
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" fontWeight="medium">
              Time (optional)
            </Text>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} size="sm" />
          </VStack>
        )}

        {/* Note input - only for text completion type */}
        {task.completionType === "text" && (
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" fontWeight="medium">
              Note
            </Text>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Enter note..." size="sm" />
          </VStack>
        )}

        {/* Actions */}
        <HStack justify="flex-end" spacing={2} pt={2}>
          {completion && (
            <Button size="sm" variant="outline" colorPalette="red" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" colorPalette="blue" onClick={handleSave}>
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

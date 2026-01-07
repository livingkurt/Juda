"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Stack, Typography, Button, TextField, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
import { Check, Close, RadioButtonUnchecked, Delete, SkipNext } from "@mui/icons-material";
import dayjs from "dayjs";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

/**
 * CellEditorPopover - Editor for task completion cells
 *
 * @param {Object} task - The task being edited
 * @param {string|Date} date - Date string (YYYY-MM-DD) or Date object
 * @param {Object} completion - Existing completion data
 * @param {boolean} isScheduled - Whether task is scheduled for this date
 * @param {Function} onSave - (data) => void
 * @param {Function} onDelete - () => void
 * @param {Function} onClose - () => void
 */
export const CellEditorPopover = ({ task, date, completion, isScheduled, onSave, onDelete, onClose }) => {
  // Normalize date to dayjs
  const dateObj = typeof date === "string" ? dayjs(date) : dayjs(date);

  const [outcome, setOutcome] = useState(completion?.outcome || null);
  const [note, setNote] = useState(completion?.note || "");
  const [actualValue, setActualValue] = useState(completion?.actualValue || "");

  const hasChanges =
    outcome !== (completion?.outcome || null) ||
    note !== (completion?.note || "") ||
    actualValue !== (completion?.actualValue || "");

  // Save function that saves all current state values
  // Use useRef to always access latest state values
  const saveAllFieldsRef = useRef();

  // Update ref whenever state changes
  useEffect(() => {
    saveAllFieldsRef.current = () => {
      // For text type, save to note field; for text_input, save to actualValue field
      if (task.completionType === "text") {
        onSave({
          outcome: "completed",
          note: note.trim() || null,
          actualValue: null,
        });
      } else if (task.completionType === "text_input") {
        onSave({
          outcome: "completed",
          note: null,
          actualValue: actualValue || null,
        });
      } else {
        // For other types, save all fields
        onSave({
          outcome,
          note: note.trim() || null,
          actualValue: actualValue || null,
        });
      }
    };
  }, [outcome, note, actualValue, onSave, task.completionType]);

  const { debouncedSave, immediateSave } = useDebouncedSave(() => saveAllFieldsRef.current?.(), 500);

  const handleNoteChange = e => {
    const newValue = e.target.value;
    setNote(newValue);
    // Trigger debounced save with all current values
    debouncedSave();
  };

  const handleActualValueChange = e => {
    const newValue = e.target.value;
    setActualValue(newValue);
    // Trigger debounced save with all current values
    debouncedSave();
  };

  const handleSave = () => {
    // Save immediately
    immediateSave();
  };

  const handleOutcomeChange = (event, newOutcome) => {
    if (newOutcome !== null) {
      setOutcome(newOutcome);
    }
  };

  // For text_input type, show a text field instead of outcome buttons
  if (task.completionType === "text_input" || task.completionType === "text") {
    // For text type, use note field; for text_input, use actualValue field
    const textValue = task.completionType === "text" ? note : actualValue;
    const handleTextChange = task.completionType === "text" ? handleNoteChange : handleActualValueChange;

    // Minimum 10 rows, expandable up to 30 rows
    const minRows = 10;

    return (
      <Box sx={{ p: 2, minWidth: 250, position: "relative" }}>
        <Typography variant="subtitle2" gutterBottom>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          {dateObj.format("MMM D, YYYY")}
        </Typography>

        <TextField
          fullWidth
          size="small"
          label={task.completionType === "text" ? "Journal Entry" : "Value"}
          value={textValue}
          onChange={handleTextChange}
          onBlur={handleSave}
          placeholder={task.completionType === "text" ? "Enter your journal entry..." : "Enter value..."}
          multiline
          minRows={minRows}
          maxRows={30}
          sx={{ mt: 2, "& .MuiInputBase-input": { overflow: "auto" } }}
          autoFocus
        />

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          {completion && (
            <Button size="small" color="error" startIcon={<Delete fontSize="small" />} onClick={onDelete}>
              Delete
            </Button>
          )}
          <Box flex={1} />
          <Button size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleSave} disabled={!textValue.trim() && !hasChanges}>
            Save
          </Button>
        </Stack>
      </Box>
    );
  }

  // For checkbox type (default)
  return (
    <Box sx={{ p: 2, minWidth: 280, position: "relative" }}>
      <Typography variant="subtitle2" gutterBottom>
        {task.title}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {dateObj.format("MMM D, YYYY")}
        </Typography>
        {!isScheduled && <Chip label="Off-schedule" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />}
      </Stack>

      {/* Outcome Selection */}
      <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
        Status
      </Typography>
      <ToggleButtonGroup value={outcome} exclusive onChange={handleOutcomeChange} fullWidth size="small">
        <ToggleButton value="completed" sx={{ flex: 1 }}>
          <Check fontSize="small" sx={{ mr: 0.5 }} />
          Done
        </ToggleButton>
        <ToggleButton value="not_completed" sx={{ flex: 1 }}>
          <Close fontSize="small" sx={{ mr: 0.5 }} />
          Missed
        </ToggleButton>
        {/* Only show Roll Over for scheduled days on recurring tasks or subtasks of recurring tasks */}

        <ToggleButton value="rolled_over" sx={{ flex: 1 }}>
          <SkipNext fontSize="small" sx={{ mr: 0.5 }} />
          Roll Over
        </ToggleButton>

        <ToggleButton value={null} sx={{ flex: 1 }}>
          <RadioButtonUnchecked fontSize="small" sx={{ mr: 0.5 }} />
          None
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Note */}
      <TextField
        fullWidth
        size="small"
        label="Note (optional)"
        value={note}
        onChange={handleNoteChange}
        onBlur={handleSave}
        placeholder="Add a note..."
        multiline
        rows={2}
        sx={{ mt: 2 }}
      />

      {/* Actions */}
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
        {completion && (
          <Button size="small" color="error" startIcon={<Delete fontSize="small" />} onClick={onDelete}>
            Delete
          </Button>
        )}
        <Box flex={1} />
        <Button size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={handleSave} disabled={!hasChanges && !outcome}>
          Save
        </Button>
      </Stack>
    </Box>
  );
};

export default CellEditorPopover;

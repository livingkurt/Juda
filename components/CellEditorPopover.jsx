"use client";

import { useState } from "react";
import { Box, Stack, Typography, Button, TextField, ToggleButton, ToggleButtonGroup, Chip } from "@mui/material";
import { Check, Close, RadioButtonUnchecked, Delete } from "@mui/icons-material";
import dayjs from "dayjs";

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

  const handleSave = () => {
    onSave({
      outcome,
      note: note.trim() || null,
      actualValue: actualValue || null,
    });
  };

  const handleOutcomeChange = (event, newOutcome) => {
    if (newOutcome !== null) {
      setOutcome(newOutcome);
    }
  };

  // For text_input type, show a text field instead of outcome buttons
  if (task.completionType === "text_input" || task.completionType === "text") {
    return (
      <Box sx={{ p: 2, minWidth: 250 }}>
        <Typography variant="subtitle2" gutterBottom>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
          {dateObj.format("MMM D, YYYY")}
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Value"
          value={actualValue}
          onChange={e => setActualValue(e.target.value)}
          placeholder="Enter value..."
          sx={{ mt: 2 }}
          autoFocus
        />

        <TextField
          fullWidth
          size="small"
          label="Note (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note..."
          multiline
          rows={2}
          sx={{ mt: 1.5 }}
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
          <Button size="small" variant="contained" onClick={handleSave} disabled={!actualValue && !hasChanges}>
            Save
          </Button>
        </Stack>
      </Box>
    );
  }

  // For checkbox type (default)
  return (
    <Box sx={{ p: 2, minWidth: 280 }}>
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
        onChange={e => setNote(e.target.value)}
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

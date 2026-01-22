"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Stack,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { SECTION_ICONS } from "@/lib/constants";
import { useDialogState } from "@/hooks/useDialogState";
import { useSectionOperations } from "@/hooks/useSectionOperations";

function SectionForm({ section, onSave, onClose }) {
  const [name, setName] = useState(section?.name || "");
  const [icon, setIcon] = useState(section?.icon || "sun");
  const [startTime, setStartTime] = useState(section?.startTime || null);
  const [endTime, setEndTime] = useState(section?.endTime || null);

  // Convert "HH:MM" string to dayjs for TimePicker
  const startTimeValue = startTime ? dayjs(`2000-01-01T${startTime}`) : null;
  const endTimeValue = endTime ? dayjs(`2000-01-01T${endTime}`) : null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: section?.id,
      name: name.trim(),
      icon,
      startTime: startTime || null,
      endTime: endTime || null,
      order: section?.order ?? 999,
    });
    onClose();
  };

  return (
    <>
      <DialogTitle>
        {section ? "Edit Section" : "New Section"}
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Name Input */}
          <Box>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Name
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Section name"
              autoFocus
            />
          </Box>

          {/* Icon Selector */}
          <Box>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Icon
            </Typography>
            <ToggleButtonGroup
              value={icon}
              exclusive
              onChange={(e, newIcon) => newIcon && setIcon(newIcon)}
              size="small"
            >
              {SECTION_ICONS.map(({ value, Icon }) => (
                <ToggleButton key={value} value={value} sx={{ px: 1.5 }}>
                  <Icon fontSize="medium" />
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Time Range Section */}
          <Box>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Time Range (Optional)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              Tasks with times in this range will automatically appear in this section
            </Typography>
            <Stack direction="row" spacing={2}>
              <TimePicker
                label="Start Time"
                value={startTimeValue}
                onChange={newValue => {
                  setStartTime(newValue ? newValue.format("HH:mm") : null);
                }}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
              <TimePicker
                label="End Time"
                value={endTimeValue}
                onChange={newValue => {
                  setEndTime(newValue ? newValue.format("HH:mm") : null);
                }}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
            </Stack>
            {startTime && endTime && (
              <Typography variant="caption" color="primary" sx={{ display: "block", mt: 1 }}>
                Tasks from {startTime} to {endTime} will appear here
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!name.trim()}>
          Save
        </Button>
      </DialogActions>
    </>
  );
}

export const SectionDialog = () => {
  const dialogState = useDialogState();
  const sectionOps = useSectionOperations();

  const isOpen = dialogState.sectionDialogOpen;
  const section = dialogState.editingSection;

  const handleClose = () => {
    dialogState.closeSectionDialog();
    dialogState.setEditingSection(null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <SectionForm
        key={section?.id || "new"}
        section={section}
        onSave={sectionOps.handleSaveSection}
        onClose={handleClose}
      />
    </Dialog>
  );
};

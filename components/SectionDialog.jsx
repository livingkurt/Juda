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
import { SECTION_ICONS } from "@/lib/constants";
import { useDialogState } from "@/hooks/useDialogState";
import { useSectionOperations } from "@/hooks/useSectionOperations";

function SectionForm({ section, onSave, onClose }) {
  const [name, setName] = useState(section?.name || "");
  const [icon, setIcon] = useState(section?.icon || "sun");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: section?.id,
      name: name.trim(),
      icon,
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

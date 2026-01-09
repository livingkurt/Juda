"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
} from "@mui/material";

export default function RecurringEditScopeDialog({ open, onClose, onSelect, taskTitle, editDate }) {
  const [scope, setScope] = useState("all");

  const handleConfirm = () => {
    onSelect(scope);
    onClose();
  };

  const formattedDate = editDate
    ? new Date(editDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Recurring Task</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          &quot;{taskTitle}&quot; is a recurring task. How would you like to apply your changes?
        </Typography>

        <RadioGroup value={scope} onChange={e => setScope(e.target.value)}>
          <FormControlLabel
            value="this"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">Only this occurrence</Typography>
                <Typography variant="caption" color="text.secondary">
                  Creates a separate task for {formattedDate}
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="future"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">This and future occurrences</Typography>
                <Typography variant="caption" color="text.secondary">
                  Changes apply from {formattedDate} onward
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="all"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">All occurrences</Typography>
                <Typography variant="caption" color="text.secondary">
                  Changes apply to the entire series
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

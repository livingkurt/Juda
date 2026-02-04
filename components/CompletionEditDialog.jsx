"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import { formatLocalDate } from "@/lib/utils";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import {
  useUpdateCompletionMutation,
  useDeleteCompletionMutation,
  useCreateCompletionMutation,
} from "@/lib/store/api/completionsApi";
import { useCompletionHelpers } from "@/hooks/useCompletionHelpers";

export const CompletionEditDialog = ({ task, open, onClose }) => {
  const [updateTaskMutation] = useUpdateTaskMutation();
  const [updateCompletionMutation] = useUpdateCompletionMutation();
  const [deleteCompletionMutation] = useDeleteCompletionMutation();
  const [createCompletionMutation] = useCreateCompletionMutation();
  const { getCompletionForDate } = useCompletionHelpers();

  // Get the current completion date from task.recurrence.startDate
  const currentDate = useMemo(
    () => (task?.recurrence?.startDate ? new Date(task.recurrence.startDate) : new Date()),
    [task?.recurrence?.startDate]
  );

  // Get the completion record for the current date
  const completion = getCompletionForDate(task?.id, currentDate);

  // State for form fields
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with current values
  useEffect(() => {
    if (open && task) {
      // Set date from task.recurrence.startDate
      const dateStr = formatLocalDate(currentDate);
      setDate(dateStr);

      // Set time from task.time if available
      setTime(task.time || "");
    }
  }, [open, task, currentDate]);

  const handleSave = async () => {
    if (!task || !date) return;

    setIsSaving(true);
    try {
      // Parse the new date
      const newDate = new Date(date);
      const newDateStr = formatLocalDate(newDate);
      const oldDateStr = formatLocalDate(currentDate);

      // Update task with new date and time
      const taskUpdates = {
        recurrence: {
          type: "none",
          startDate: `${newDateStr}T00:00:00.000Z`,
        },
      };

      // Only update time if it's provided
      if (time) {
        taskUpdates.time = time;
      } else {
        taskUpdates.time = null;
      }

      await updateTaskMutation({ id: task.id, ...taskUpdates }).unwrap();

      // If the date changed, we need to move the completion record
      if (newDateStr !== oldDateStr && completion) {
        // Delete the old completion
        await deleteCompletionMutation({
          taskId: task.id,
          date: oldDateStr,
        }).unwrap();

        // Create a new completion with the new date
        await createCompletionMutation({
          taskId: task.id,
          date: newDateStr,
          outcome: completion.outcome,
          note: completion.note,
          time: time || null,
          startedAt: completion.startedAt,
          completedAt: new Date().toISOString(), // Update completedAt to current time
        }).unwrap();
      } else if (completion) {
        // Just update the time in the existing completion
        await updateCompletionMutation({
          taskId: task.id,
          date: newDateStr,
          time: time || null,
        }).unwrap();
      }

      onClose();
    } catch (error) {
      console.error("Error updating completion:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Check if task is non-recurring
  const isNonRecurring = !task?.recurrence || task.recurrence.type === "none";

  if (!isNonRecurring) {
    return null; // Only show for non-recurring tasks
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Completion</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Update when you actually completed this task
            </Typography>
          </Box>

          <TextField
            label="Completion Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />

          <TextField
            label="Completion Time (Optional)"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
            helperText="Leave empty for no specific time"
          />

          <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              This will update both the task date and the completion record. The task will be moved to the new date in
              your calendar.
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={isSaving || !date}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompletionEditDialog;

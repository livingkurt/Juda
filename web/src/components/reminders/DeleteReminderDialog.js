import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { setDialog, setSnackbar } from "@/store/slices/uiSlice";
import { deleteReminder } from "@/store/slices/reminderSlice";
import apiService from "@/services/api";

export default function DeleteReminderDialog() {
  const dispatch = useDispatch();
  const isOpen = useSelector(state => state.ui.dialogs.deleteReminder);
  const selectedReminder = useSelector(
    state => state.reminders.selectedReminder
  );
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    dispatch(setDialog({ dialog: "deleteReminder", open: false }));
  };

  const handleDelete = async () => {
    if (!selectedReminder) return;

    try {
      setLoading(true);
      await apiService.deleteReminder(selectedReminder.id);

      dispatch(deleteReminder(selectedReminder.id));
      dispatch(
        setSnackbar({
          open: true,
          message: "Reminder deleted successfully",
          severity: "success",
        })
      );

      handleClose();
    } catch (error) {
      console.error("Error deleting reminder:", error);
      dispatch(
        setSnackbar({
          open: true,
          message: error.message,
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  if (!selectedReminder) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Reminder</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the reminder "{selectedReminder.title}
          "? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

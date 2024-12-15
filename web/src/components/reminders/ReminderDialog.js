import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
} from "@mui/material";
import { setDialog, setSnackbar } from "@/store/slices/uiSlice";
import { addReminder, updateReminder } from "@/store/slices/reminderSlice";
import apiService from "@/services/api";

const repeatOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function ReminderDialog({ mode = "create" }) {
  const dispatch = useDispatch();
  const isOpen = useSelector(state => state.ui.dialogs[`${mode}Reminder`]);
  const selectedReminder = useSelector(
    state => state.reminders.selectedReminder
  );
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "09:00",
    relative_to_wake: false,
    minutes_after_wake: 0,
    repeat_pattern: null,
  });

  useEffect(() => {
    if (mode === "edit" && selectedReminder) {
      setFormData({
        title: selectedReminder.title,
        description: selectedReminder.description || "",
        start_time: selectedReminder.start_time,
        relative_to_wake: selectedReminder.relative_to_wake,
        minutes_after_wake: selectedReminder.minutes_after_wake || 0,
        repeat_pattern: selectedReminder.repeat_pattern,
      });
    }
  }, [mode, selectedReminder]);

  const handleClose = () => {
    dispatch(setDialog({ dialog: `${mode}Reminder`, open: false }));
    setFormData({
      title: "",
      description: "",
      start_time: "09:00",
      relative_to_wake: false,
      minutes_after_wake: 0,
      repeat_pattern: null,
    });
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRepeatChange = e => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      repeat_pattern: value
        ? {
            type: value,
            interval: 1,
          }
        : null,
    }));
  };

  const handleIntervalChange = e => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      repeat_pattern: {
        ...prev.repeat_pattern,
        interval: parseInt(value, 10),
      },
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setLoading(true);

      if (mode === "create") {
        const response = await apiService.createReminder(formData);
        dispatch(addReminder(response.data.reminder));
        dispatch(
          setSnackbar({
            open: true,
            message: "Reminder created successfully",
            severity: "success",
          })
        );
      } else {
        const response = await apiService.updateReminder(
          selectedReminder.id,
          formData
        );
        dispatch(updateReminder(response.data.reminder));
        dispatch(
          setSnackbar({
            open: true,
            message: "Reminder updated successfully",
            severity: "success",
          })
        );
      }

      handleClose();
    } catch (error) {
      console.error("Error saving reminder:", error);
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

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {mode === "create" ? "Create New Reminder" : "Edit Reminder"}
        </DialogTitle>
        <DialogContent>
          <TextField
            name="title"
            label="Title"
            value={formData.title}
            onChange={handleChange}
            fullWidth
            required
            margin="normal"
          />
          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />

          <FormControlLabel
            control={
              <Switch
                name="relative_to_wake"
                checked={formData.relative_to_wake}
                onChange={handleChange}
              />
            }
            label="Relative to wake time"
            sx={{ my: 2 }}
          />

          {formData.relative_to_wake ? (
            <TextField
              name="minutes_after_wake"
              label="Minutes after wake"
              type="number"
              value={formData.minutes_after_wake}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ min: 0 }}
              margin="normal"
            />
          ) : (
            <TextField
              name="start_time"
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={handleChange}
              fullWidth
              required
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 300, // 5 min
              }}
            />
          )}

          <FormControl fullWidth margin="normal">
            <InputLabel>Repeat</InputLabel>
            <Select
              value={formData.repeat_pattern?.type || ""}
              onChange={handleRepeatChange}
              label="Repeat"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {repeatOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {formData.repeat_pattern && (
            <TextField
              label="Repeat Interval"
              type="number"
              value={formData.repeat_pattern.interval}
              onChange={handleIntervalChange}
              fullWidth
              margin="normal"
              inputProps={{ min: 1 }}
              helperText={`Repeat every ${formData.repeat_pattern.interval} ${formData.repeat_pattern.type}`}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : mode === "create" ? (
              "Create"
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

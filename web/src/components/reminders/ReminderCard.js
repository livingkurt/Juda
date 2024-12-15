import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Checkbox,
  Box,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
  Repeat as RepeatIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { setDialog, setSnackbar } from "@/store/slices/uiSlice";
import {
  setSelectedReminder,
  toggleReminderCompletion,
} from "@/store/slices/reminderSlice";
import apiService from "@/services/api";

export default function ReminderCard({ reminder }) {
  const dispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleMenuOpen = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    dispatch(setSelectedReminder(reminder));
    dispatch(setDialog({ dialog: "editReminder", open: true }));
    handleMenuClose();
  };

  const handleDelete = () => {
    dispatch(setSelectedReminder(reminder));
    dispatch(setDialog({ dialog: "deleteReminder", open: true }));
    handleMenuClose();
  };

  const handleToggleCompletion = async () => {
    try {
      setLoading(true);
      const newStatus = !reminder.completion_status;
      const completionTime = newStatus ? new Date().toISOString() : null;

      await apiService.updateCompletion(reminder.id, {
        completion_status: newStatus,
        completion_time: completionTime,
      });

      dispatch(
        toggleReminderCompletion({
          reminderId: reminder.id,
          completionStatus: newStatus,
          completionTime,
        })
      );

      dispatch(
        setSnackbar({
          open: true,
          message: `Reminder marked as ${
            newStatus ? "completed" : "incomplete"
          }`,
          severity: "success",
        })
      );
    } catch (error) {
      console.error("Error updating completion status:", error);
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

  const formatTime = time => {
    try {
      // Parse time string (HH:mm) and create a date object for today with that time
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "h:mm a");
    } catch (error) {
      console.error("Error formatting time:", error);
      return time;
    }
  };

  return (
    <Card
      sx={{
        position: "relative",
        opacity: reminder.completion_status ? 0.7 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Checkbox
            checked={reminder.completion_status}
            onChange={handleToggleCompletion}
            disabled={loading}
          />
          <Typography
            variant="h6"
            component="h2"
            sx={{
              textDecoration: reminder.completion_status
                ? "line-through"
                : "none",
              flex: 1,
            }}
          >
            {reminder.title}
          </Typography>
          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>

        {reminder.description && (
          <Typography
            color="textSecondary"
            sx={{
              mb: 1,
              textDecoration: reminder.completion_status
                ? "line-through"
                : "none",
            }}
          >
            {reminder.description}
          </Typography>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2" color="textSecondary">
            {reminder.relative_to_wake
              ? `${reminder.minutes_after_wake} min after wake`
              : formatTime(reminder.start_time)}
          </Typography>
        </Box>

        {reminder.repeat_pattern && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Chip
              icon={<RepeatIcon />}
              label={`${reminder.repeat_pattern.type} (${reminder.repeat_pattern.interval})`}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}

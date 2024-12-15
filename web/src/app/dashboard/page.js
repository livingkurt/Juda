"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import AppLayout from "@/components/layout/AppLayout";
import ReminderCard from "@/components/reminders/ReminderCard";
import ReminderDialog from "@/components/reminders/ReminderDialog";
import DeleteReminderDialog from "@/components/reminders/DeleteReminderDialog";
import { setDialog } from "@/store/slices/uiSlice";
import {
  setReminders,
  setLoading,
  setError,
  setCompletionStats,
} from "@/store/slices/reminderSlice";
import apiService from "@/services/api";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { reminders, loading, error, completionStats } = useSelector(
    state => state.reminders
  );

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      dispatch(setLoading(true));
      const response = await apiService.getReminders();
      dispatch(setReminders(response.data.reminders));

      // Load completion stats
      const statsResponse = await apiService.getCompletionStats();
      dispatch(setCompletionStats(statsResponse.data));
    } catch (error) {
      console.error("Error loading reminders:", error);
      dispatch(setError(error.message));
    }
  };

  const handleCreateReminder = () => {
    dispatch(setDialog({ dialog: "createReminder", open: true }));
  };

  const getTodayReminders = () => {
    const today = new Date().toISOString().split("T")[0];
    return reminders.filter(reminder => {
      const reminderDate = new Date().toISOString().split("T")[0];
      return reminderDate === today;
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateReminder}
          >
            New Reminder
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Reminders
                </Typography>
                <Typography variant="h5">
                  {completionStats.total || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed Today
                </Typography>
                <Typography variant="h5">
                  {completionStats.completed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completion Rate
                </Typography>
                <Typography variant="h5">
                  {Math.round((completionStats.completion_rate || 0) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Current Streak
                </Typography>
                <Typography variant="h5">
                  {completionStats.current_streak || 0} days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Today's Reminders */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Today's Reminders
          </Typography>
          {getTodayReminders().length > 0 ? (
            <Grid container spacing={2}>
              {getTodayReminders().map(reminder => (
                <Grid item xs={12} sm={6} md={4} key={reminder.id}>
                  <ReminderCard reminder={reminder} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="textSecondary">
              No reminders scheduled for today
            </Typography>
          )}
        </Paper>

        {/* Error Display */}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Dialogs */}
      <ReminderDialog mode="create" />
      <ReminderDialog mode="edit" />
      <DeleteReminderDialog />
    </AppLayout>
  );
}

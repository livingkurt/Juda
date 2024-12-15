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
import { setDialog } from "../store/uiSlice";
import { setReminders, setLoading, setError } from "../store/reminderSlice";

function Dashboard() {
  const dispatch = useDispatch();
  const { reminders, loading, error } = useSelector(state => state.reminders);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      dispatch(setLoading(true));
      const response = await fetch("http://localhost:3000/api/reminders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load reminders");
      }

      dispatch(setReminders(data.data.reminders));
    } catch (error) {
      dispatch(setError(error.message));
    }
  };

  const handleCreateReminder = () => {
    dispatch(setDialog({ dialog: "createReminder", open: true }));
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" component="h1">
          Welcome, {user?.name || "User"}
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
              <Typography variant="h5">{reminders.length}</Typography>
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
                {reminders.filter(r => r.completion_status).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Reminders List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Today's Reminders
        </Typography>
        {reminders.length > 0 ? (
          <Grid container spacing={2}>
            {reminders.map(reminder => (
              <Grid item xs={12} sm={6} md={4} key={reminder._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{reminder.title}</Typography>
                    {reminder.description && (
                      <Typography color="textSecondary">
                        {reminder.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography color="textSecondary">
            No reminders scheduled for today
          </Typography>
        )}
      </Paper>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default Dashboard;

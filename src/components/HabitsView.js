"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Box,
  Chip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { CheckCircle, Cancel, Schedule } from "@mui/icons-material";
import { habitService } from "../services/habitService";

const HabitsView = () => {
  const [habits, setHabits] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [newHabit, setNewHabit] = useState({
    title: "",
    description: "",
    reminder_time: "",
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setLoading(true);

      // Get test user
      const userData = await habitService.getTestUser();
      setUser(userData);

      // Get habits and today's entries
      const [habitsData, entriesData] = await Promise.all([
        habitService.getHabits(userData.id),
        habitService.getTodayHabitEntries(userData.id),
      ]);

      setHabits(habitsData);
      setTodayEntries(entriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async e => {
    e.preventDefault();
    if (!newHabit.title || !user) return;

    try {
      await habitService.createHabit(user.id, newHabit);
      setNewHabit({ title: "", description: "", reminder_time: "" });

      // Refresh data
      initializeData();
    } catch (error) {
      console.error("Error creating habit:", error);
    }
  };

  const handleHabitAction = async (habitId, status) => {
    try {
      await habitService.updateHabitEntry(habitId, status);

      // Refresh today's entries
      const entriesData = await habitService.getTodayHabitEntries(user.id);
      setTodayEntries(entriesData);
    } catch (error) {
      console.error("Error updating habit:", error);
    }
  };

  const getHabitStatus = habitId => {
    const entry = todayEntries.find(entry => entry.habit_id === habitId);
    return entry?.status || "pending";
  };

  const getStatusColor = status => {
    switch (status) {
      case "completed":
        return "success";
      case "skipped":
        return "warning";
      case "missed":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: 4, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        sx={{ mb: 4, color: "white", fontWeight: "bold" }}
      >
        Today&apos;s Habits
      </Typography>

      {/* Create new habit form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "white" }}>
          Add New Habit
        </Typography>
        <Box component="form" onSubmit={handleCreateHabit}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              placeholder="Habit title"
              value={newHabit.title}
              onChange={e =>
                setNewHabit({ ...newHabit, title: e.target.value })
              }
              sx={{ flex: 1 }}
              variant="outlined"
            />
            <TextField
              type="time"
              value={newHabit.reminder_time}
              onChange={e =>
                setNewHabit({ ...newHabit, reminder_time: e.target.value })
              }
              sx={{ width: 150 }}
            />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>
              Add Habit
            </Button>
          </Box>
          <TextField
            placeholder="Description (optional)"
            value={newHabit.description}
            onChange={e =>
              setNewHabit({ ...newHabit, description: e.target.value })
            }
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </Paper>

      {/* Habits list */}
      {habits.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            No habits yet. Create your first habit above!
          </Typography>
        </Paper>
      ) : (
        habits.map(habit => {
          const status = getHabitStatus(habit.id);
          return (
            <Card key={habit.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1, color: "white" }}>
                      {habit.title}
                    </Typography>
                    {habit.description && (
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, color: "text.secondary" }}
                      >
                        {habit.description}
                      </Typography>
                    )}
                    {habit.reminder_time && (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Schedule fontSize="small" />
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          Reminder: {habit.reminder_time}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Chip
                    label={status}
                    color={getStatusColor(status)}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant={status === "completed" ? "contained" : "outlined"}
                    color="success"
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={() => handleHabitAction(habit.id, "completed")}
                  >
                    Complete
                  </Button>
                  <Button
                    variant={status === "skipped" ? "contained" : "outlined"}
                    color="warning"
                    size="small"
                    startIcon={<Cancel />}
                    onClick={() => handleHabitAction(habit.id, "skipped")}
                  >
                    Skip
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}
    </Container>
  );
};

export default HabitsView;

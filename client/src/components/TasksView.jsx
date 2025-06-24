import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Box,
  CircularProgress,
} from "@mui/material";
import { taskAPI } from "../services/api";
import NotificationSetup from "./NotificationSetup";

const TasksView = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    reminder_time: "",
  });
  const [loading, setLoading] = useState(false);

  // Temporary user ID - we'll add proper auth later
  const userId = 1;

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTasks(userId);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async e => {
    e.preventDefault();
    if (!newTask.title) return;

    try {
      await taskAPI.createTask(userId, newTask);
      setNewTask({ title: "", description: "", reminder_time: "" });
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleCompleteTask = async taskId => {
    try {
      await taskAPI.completeTask(taskId, { status: "completed" });
      console.log("Task completed!");
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        sx={{ mb: 4, color: "white", fontWeight: "bold" }}
      >
        Tasks
      </Typography>

      <NotificationSetup />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleCreateTask}>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <TextField
              placeholder="Task title"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              sx={{ flex: 1 }}
              variant="outlined"
            />
            <TextField
              type="time"
              value={newTask.reminder_time}
              onChange={e =>
                setNewTask({ ...newTask, reminder_time: e.target.value })
              }
              sx={{ width: 150 }}
            />
            <Button type="submit" variant="contained" sx={{ px: 3 }}>
              Add Task
            </Button>
          </Box>
          <TextField
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={e =>
              setNewTask({ ...newTask, description: e.target.value })
            }
            fullWidth
            multiline
            rows={2}
          />
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {tasks.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="text.secondary">
                No tasks yet. Create your first task above!
              </Typography>
            </Paper>
          ) : (
            tasks.map(task => (
              <Card key={task.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {task.title}
                  </Typography>
                  {task.description && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {task.description}
                    </Typography>
                  )}
                  {task.reminder_time && (
                    <Typography
                      variant="caption"
                      sx={{ mb: 2, display: "block" }}
                    >
                      Reminder: {task.reminder_time}
                    </Typography>
                  )}
                  <Button
                    onClick={() => handleCompleteTask(task.id)}
                    variant="contained"
                    color="success"
                  >
                    Complete
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      )}
    </Container>
  );
};

export default TasksView;

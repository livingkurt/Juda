"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { openTaskDialog } from "@/lib/store/slices/uiSlice";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";

export function GoalsTab({ isLoading }) {
  const dispatch = useDispatch();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch all tasks and filter for goals
  const { data: allTasks = [], isLoading: tasksLoading } = useGetTasksQuery();

  // Filter and organize goals
  const goals = useMemo(() => {
    const goalTasks = allTasks.filter(task => task.completionType === "goal" && task.goalYear === selectedYear);

    const yearlyGoals = goalTasks.filter(g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0));
    const monthlyGoals = goalTasks.filter(g => g.parentId || (g.goalMonths && g.goalMonths.length > 0));

    return { yearlyGoals, monthlyGoals };
  }, [allTasks, selectedYear]);

  const handleCreateGoal = () => {
    dispatch(
      openTaskDialog({
        completionType: "goal",
        goalYear: selectedYear,
      })
    );
  };

  // Generate year options (current year and next 4 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  if (isLoading) {
    return (
      <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        p: { xs: 2, md: 3 },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ flex: 1 }}>
          Goals
        </Typography>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} label="Year">
            {yearOptions.map(year => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateGoal}>
          New Goal
        </Button>
      </Stack>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {tasksLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={4}>
            {/* Yearly Goals Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Yearly Goals
              </Typography>
              {goals.yearlyGoals.length === 0 ? (
                <Typography color="text.secondary">No yearly goals for {selectedYear}</Typography>
              ) : (
                <Stack spacing={2}>
                  {goals.yearlyGoals.map(goal => (
                    <Box
                      key={goal.id}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {goal.title}
                      </Typography>
                      {goal.status && (
                        <Typography variant="caption" color="text.secondary">
                          Status: {goal.status}
                        </Typography>
                      )}
                      {goal.subtasks && goal.subtasks.length > 0 && (
                        <Box sx={{ mt: 1, pl: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            {goal.subtasks.filter(s => s.status === "complete").length}/{goal.subtasks.length} sub-goals
                            complete
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Monthly Goals Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Monthly Goals
              </Typography>
              {goals.monthlyGoals.length === 0 ? (
                <Typography color="text.secondary">No monthly goals for {selectedYear}</Typography>
              ) : (
                <Stack spacing={2}>
                  {goals.monthlyGoals.map(goal => (
                    <Box
                      key={goal.id}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      <Typography variant="body1" fontWeight={500}>
                        {goal.title}
                      </Typography>
                      {goal.goalMonths && goal.goalMonths.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Months:{" "}
                          {goal.goalMonths
                            .map(m => new Date(2000, m - 1).toLocaleString("default", { month: "short" }))
                            .join(", ")}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

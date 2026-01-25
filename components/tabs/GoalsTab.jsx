"use client";

import { useState, useMemo, useCallback } from "react";
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
import { useGetTasksQuery, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { TaskItem } from "@/components/TaskItem";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";

export function GoalsTab({ isLoading }) {
  const dispatch = useDispatch();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [updateTask] = useUpdateTaskMutation();

  // Fetch all tasks and filter for goals
  const { data: allTasks = [], isLoading: tasksLoading } = useGetTasksQuery();

  // Filter and organize goals - only show yearly goals (monthly goals will be shown as subtasks)
  const yearlyGoals = useMemo(() => {
    const goalTasks = allTasks.filter(task => task.completionType === "goal" && task.goalYear === selectedYear);

    // Only return yearly goals (no parentId), sorted by order
    // Monthly goals will be displayed as subtasks within their parent yearly goal
    return goalTasks.filter(g => !g.parentId).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [allTasks, selectedYear]);

  const handleCreateGoal = () => {
    dispatch(
      openTaskDialog({
        completionType: "goal",
        goalYear: selectedYear,
      })
    );
  };

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(
    async result => {
      const { destination, source } = result;

      // Dropped outside the list
      if (!destination) return;

      // No movement
      if (destination.index === source.index) return;

      // Reorder the goals array
      const reorderedGoals = Array.from(yearlyGoals);
      const [movedGoal] = reorderedGoals.splice(source.index, 1);
      reorderedGoals.splice(destination.index, 0, movedGoal);

      // Update order for all affected goals
      const updates = reorderedGoals.map((goal, index) => ({
        id: goal.id,
        order: index,
      }));

      // Optimistically update (the mutation will handle the actual update)
      try {
        await Promise.all(updates.map(update => updateTask(update).unwrap()));
      } catch (error) {
        console.error("Failed to reorder goals:", error);
      }
    },
    [yearlyGoals, updateTask]
  );

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
          {selectedYear} Goals
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
        ) : yearlyGoals.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No goals for {selectedYear}
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateGoal}>
              Create Your First Goal
            </Button>
          </Box>
        ) : (
          <Box>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={`goals-${selectedYear}`}>
                {provided => (
                  <Stack spacing={1} ref={provided.innerRef} {...provided.droppableProps}>
                    {yearlyGoals.map((goal, index) => (
                      <TaskItem
                        key={goal.id}
                        task={goal}
                        variant="today"
                        draggableId={goal.id}
                        index={index}
                        date={null}
                        showSubtasks={true}
                        defaultExpanded={true}
                      />
                    ))}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        )}
      </Box>
    </Box>
  );
}

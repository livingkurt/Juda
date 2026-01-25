"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { openTaskDialog } from "@/lib/store/slices/uiSlice";
import { useGetTasksQuery, useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { TaskItem } from "@/components/TaskItem";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { DateNavigation } from "@/components/DateNavigation";

export function GoalsTab({ isLoading }) {
  const dispatch = useDispatch();
  const [viewType, setViewType] = useState("monthly"); // "yearly" or "monthly"
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [updateTask] = useUpdateTaskMutation();

  // Fetch all tasks and filter for goals
  const { data: allTasks = [], isLoading: tasksLoading } = useGetTasksQuery();

  // Filter and organize goals - only show yearly goals (monthly goals will be shown as subtasks)
  const yearlyGoals = useMemo(() => {
    const goalTasks = allTasks.filter(task => task.completionType === "goal" && task.goalYear === selectedYear);

    // Only return yearly goals (no parentId), sorted by order
    // Monthly goals will be displayed as subtasks within their parent yearly goal
    // Use stable sort: first by order, then by id for consistent ordering
    return goalTasks
      .filter(g => !g.parentId)
      .sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // If orders are equal, sort by id for stable ordering
        return a.id.localeCompare(b.id);
      });
  }, [allTasks, selectedYear]);

  // Get all sub-goals (monthly goals) grouped by month
  const monthlyGoalsByMonth = useMemo(() => {
    const goalTasks = allTasks.filter(task => task.completionType === "goal" && task.goalYear === selectedYear);
    
    // Collect all sub-goals from yearly goals
    const allSubGoals = [];
    goalTasks.forEach(goal => {
      if (goal.subtasks && goal.subtasks.length > 0) {
        goal.subtasks.forEach(subtask => {
          allSubGoals.push(subtask);
        });
      }
    });

    // Group sub-goals by month
    // If subtask has goalMonths array, use that; otherwise, we'll need to infer from order or show in all months
    const grouped = {};
    
    allSubGoals.forEach(subgoal => {
      // If subgoal has goalMonths, add it to those months
      if (subgoal.goalMonths && Array.isArray(subgoal.goalMonths) && subgoal.goalMonths.length > 0) {
        subgoal.goalMonths.forEach(month => {
          if (!grouped[month]) {
            grouped[month] = [];
          }
          // Avoid duplicates
          if (!grouped[month].find(g => g.id === subgoal.id)) {
            grouped[month].push(subgoal);
          }
        });
      } else {
        // If no goalMonths specified, we could show in all months or a default month
        // For now, let's not include them, or we could add them to month 1 as a fallback
        // Actually, let's check if they're monthly goals by checking if they have a parentId
        if (subgoal.parentId) {
          // It's a subgoal but no specific months - we'll skip it for now
          // Or add to all months? Let's skip for now to keep it simple
        }
      }
    });

    // Sort goals within each month by order
    Object.keys(grouped).forEach(month => {
      grouped[month].sort((a, b) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.id.localeCompare(b.id);
      });
    });

    return grouped;
  }, [allTasks, selectedYear]);

  // Get goals for the selected month
  const selectedMonthGoals = useMemo(() => {
    return monthlyGoalsByMonth[selectedMonth] || [];
  }, [monthlyGoalsByMonth, selectedMonth]);

  const handleCreateGoal = () => {
    dispatch(
      openTaskDialog({
        completionType: "goal",
        goalYear: selectedYear,
      })
    );
  };

  // Handle month navigation
  const handleMonthChange = useCallback((newDate) => {
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    setSelectedMonth(newMonth);
    if (newYear !== selectedYear) {
      setSelectedYear(newYear);
    }
  }, [selectedYear]);

  const handlePreviousMonth = useCallback(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    currentDate.setMonth(currentDate.getMonth() - 1);
    handleMonthChange(currentDate);
  }, [selectedYear, selectedMonth, handleMonthChange]);

  const handleNextMonth = useCallback(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1, 1);
    currentDate.setMonth(currentDate.getMonth() + 1);
    handleMonthChange(currentDate);
  }, [selectedYear, selectedMonth, handleMonthChange]);

  const handleTodayMonth = useCallback(() => {
    const today = new Date();
    handleMonthChange(today);
  }, [handleMonthChange]);

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(
    async result => {
      const { destination, source } = result;

      // Dropped outside the list
      if (!destination) return;

      // No movement
      if (destination.index === source.index) return;

      // Reorder the goals array based on view type
      const goalsToReorder = viewType === "yearly" ? yearlyGoals : selectedMonthGoals;
      const reorderedGoals = Array.from(goalsToReorder);
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
    [yearlyGoals, selectedMonthGoals, viewType, updateTask]
  );

  // Get current date for DateNavigation (first day of selected month)
  const selectedDate = useMemo(() => {
    return new Date(selectedYear, selectedMonth - 1, 1);
  }, [selectedYear, selectedMonth]);

  // Format month name
  const getMonthName = (month) => {
    return new Date(selectedYear, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
  };

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
      {/* Header with DateNavigation */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h4" sx={{ flex: 1 }}>
            {viewType === "yearly" ? `${selectedYear} Goals` : `${getMonthName(selectedMonth)} ${selectedYear} Goals`}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateGoal}>
            New Goal
          </Button>
        </Stack>

        <DateNavigation
          selectedDate={selectedDate}
          onDateChange={viewType === "monthly" ? handleMonthChange : (newDate) => setSelectedYear(newDate.getFullYear())}
          onPrevious={viewType === "monthly" ? handlePreviousMonth : () => setSelectedYear(prev => prev - 1)}
          onNext={viewType === "monthly" ? handleNextMonth : () => setSelectedYear(prev => prev + 1)}
          onToday={viewType === "monthly" ? handleTodayMonth : () => setSelectedYear(new Date().getFullYear())}
          showDatePicker={viewType === "monthly"}
          showDateDisplay={viewType === "monthly"}
          showViewSelector={true}
          viewCollection={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
          selectedView={viewType}
          onViewChange={(newView) => {
            setViewType(newView);
            if (newView === "monthly") {
              const today = new Date();
              setSelectedMonth(today.getMonth() + 1);
              setSelectedYear(today.getFullYear());
            }
          }}
          viewSelectorWidth="120px"
          compareMode={viewType === "monthly" ? "month" : "year"}
        />
      </Stack>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {tasksLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : viewType === "yearly" ? (
          // Yearly view
          yearlyGoals.length === 0 ? (
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
                <Droppable droppableId={`goals-yearly-${selectedYear}`}>
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
          )
        ) : (
          // Monthly view
          selectedMonthGoals.length === 0 ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No goals for {getMonthName(selectedMonth)} {selectedYear}
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateGoal}>
                Create Your First Goal
              </Button>
            </Box>
          ) : (
            <Box>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`goals-monthly-${selectedYear}-${selectedMonth}`}>
                  {provided => (
                    <Stack spacing={1} ref={provided.innerRef} {...provided.droppableProps}>
                      {selectedMonthGoals.map((goal, index) => (
                        <TaskItem
                          key={goal.id}
                          task={goal}
                          variant="today"
                          draggableId={goal.id}
                          index={index}
                          date={null}
                          showSubtasks={false}
                          defaultExpanded={false}
                        />
                      ))}
                      {provided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>
          )
        )}
      </Box>
    </Box>
  );
}

"use client";

import { useMemo, useCallback, useDeferredValue } from "react";
import { Box, Typography, Button, Stack, CircularProgress } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  openTaskDialog,
  setGoalsSearchTerm,
  addGoalsSelectedTag,
  removeGoalsSelectedTag,
  setGoalsSelectedYear,
  setGoalsSelectedMonth,
  setGoalsViewType,
} from "@/lib/store/slices/uiSlice";
import { useGetGoalsQuery } from "@/lib/store/api/goalsApi";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetTagsQuery, useCreateTagMutation } from "@/lib/store/api/tagsApi";
import { TaskItem } from "@/components/TaskItem";
import { useTaskItemShared } from "@/hooks/useTaskItemShared";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { DateNavigation } from "@/components/DateNavigation";
import { TaskSearchInput } from "@/components/TaskSearchInput";

export function GoalsTab({ isLoading }) {
  const dispatch = useDispatch();
  const [updateTask] = useUpdateTaskMutation();
  const { data: tags = [] } = useGetTagsQuery();
  const [createTagMutation] = useCreateTagMutation();
  const handleCreateTag = async (name, color) => {
    return await createTagMutation({ name, color }).unwrap();
  };
  const viewType = useSelector(state => state.ui.goalsViewType || "monthly");
  const selectedYear = useSelector(state => state.ui.goalsSelectedYear || new Date().getFullYear());
  const selectedMonth = useSelector(state => state.ui.goalsSelectedMonth || new Date().getMonth() + 1);
  const goalsSearchTerm = useSelector(state => state.ui.goalsSearchTerm || "");
  const goalsSelectedTagIds = useSelector(state => state.ui.goalsSelectedTagIds || []);
  const deferredGoalsSearchTerm = useDeferredValue(goalsSearchTerm);
  const deferredGoalsSelectedTagIds = useDeferredValue(goalsSelectedTagIds);

  // Fetch all goals with subtasks
  const { data: goalsData, isLoading: tasksLoading } = useGetGoalsQuery({
    year: selectedYear,
    includeSubgoals: true,
  });

  const allGoals = useMemo(() => goalsData?.allGoals || [], [goalsData]);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const taskItemShared = useTaskItemShared({
    allTasks: allGoals,
    viewDate: todayDate,
    tags,
    onCreateTag: handleCreateTag,
  });

  // Filter and organize goals - only show yearly goals (monthly goals will be shown as subtasks)
  const yearlyGoals = useMemo(() => {
    if (!allGoals.length) return [];

    let filtered = allGoals.filter(g => !g.parentId);

    // Filter by search term
    if (deferredGoalsSearchTerm.trim()) {
      const search = deferredGoalsSearchTerm.toLowerCase();
      filtered = filtered.filter(
        goal => goal.title?.toLowerCase().includes(search) || goal.description?.toLowerCase().includes(search)
      );
    }

    // Filter by tags
    if (deferredGoalsSelectedTagIds.length > 0) {
      filtered = filtered.filter(goal => goal.tags?.some(tag => deferredGoalsSelectedTagIds.includes(tag.id)));
    }

    // Use stable sort: first by order, then by id for consistent ordering
    return filtered.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If orders are equal, sort by id for stable ordering
      return a.id.localeCompare(b.id);
    });
  }, [allGoals, deferredGoalsSearchTerm, deferredGoalsSelectedTagIds]);

  // Get all sub-goals (monthly goals) grouped by month
  const monthlyGoalsByMonth = useMemo(() => {
    if (!allGoals.length) return {};

    // Group all goals by month (including both standalone monthly goals and subgoals)
    const grouped = {};

    allGoals.forEach(goal => {
      // Check if this goal has goalMonths (is a monthly goal)
      if (goal.goalMonths && Array.isArray(goal.goalMonths) && goal.goalMonths.length > 0) {
        goal.goalMonths.forEach(month => {
          if (!grouped[month]) {
            grouped[month] = [];
          }
          // Avoid duplicates
          if (!grouped[month].find(g => g.id === goal.id)) {
            grouped[month].push(goal);
          }
        });
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
  }, [allGoals]);

  // Get goals for the selected month
  const selectedMonthGoals = useMemo(() => {
    let filtered = monthlyGoalsByMonth[selectedMonth] || [];

    // Filter by search term
    if (deferredGoalsSearchTerm.trim()) {
      const search = deferredGoalsSearchTerm.toLowerCase();
      filtered = filtered.filter(
        goal => goal.title?.toLowerCase().includes(search) || goal.description?.toLowerCase().includes(search)
      );
    }

    // Filter by tags
    if (deferredGoalsSelectedTagIds.length > 0) {
      filtered = filtered.filter(goal => goal.tags?.some(tag => deferredGoalsSelectedTagIds.includes(tag.id)));
    }

    return filtered;
  }, [monthlyGoalsByMonth, selectedMonth, deferredGoalsSearchTerm, deferredGoalsSelectedTagIds]);

  const handleCreateGoal = () => {
    dispatch(
      openTaskDialog({
        completionType: "goal",
        goalYear: selectedYear,
      })
    );
  };

  // Handle month navigation
  const handleMonthChange = useCallback(
    newDate => {
      const newMonth = newDate.getMonth() + 1;
      const newYear = newDate.getFullYear();
      dispatch(setGoalsSelectedMonth(newMonth));
      if (newYear !== selectedYear) {
        dispatch(setGoalsSelectedYear(newYear));
      }
    },
    [dispatch, selectedYear]
  );

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
  const getMonthName = month => {
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

        <TaskSearchInput
          onSearchChange={term => dispatch(setGoalsSearchTerm(term))}
          placeholder="Search goals..."
          tags={tags}
          selectedTagIds={goalsSelectedTagIds}
          onTagSelect={tagId => dispatch(addGoalsSelectedTag(tagId))}
          onTagDeselect={tagId => dispatch(removeGoalsSelectedTag(tagId))}
          onCreateTag={async (name, color) => {
            return await createTagMutation({ name, color }).unwrap();
          }}
          showPriorityFilter={false}
          showSort={false}
          showUntaggedOption={false}
        />

        <DateNavigation
          selectedDate={selectedDate}
          onDateChange={
            viewType === "monthly"
              ? handleMonthChange
              : newDate => dispatch(setGoalsSelectedYear(newDate.getFullYear()))
          }
          onPrevious={
            viewType === "monthly" ? handlePreviousMonth : () => dispatch(setGoalsSelectedYear(selectedYear - 1))
          }
          onNext={viewType === "monthly" ? handleNextMonth : () => dispatch(setGoalsSelectedYear(selectedYear + 1))}
          onToday={
            viewType === "monthly" ? handleTodayMonth : () => dispatch(setGoalsSelectedYear(new Date().getFullYear()))
          }
          showDatePicker={viewType === "monthly"}
          showDateDisplay={viewType === "monthly"}
          showViewSelector={true}
          viewCollection={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
          selectedView={viewType}
          onViewChange={newView => {
            dispatch(setGoalsViewType(newView));
            if (newView === "monthly") {
              const today = new Date();
              dispatch(setGoalsSelectedMonth(today.getMonth() + 1));
              dispatch(setGoalsSelectedYear(today.getFullYear()));
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
                  {(provided, snapshot) => (
                    <Stack
                      spacing={1}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        minHeight: snapshot.isDraggingOver || yearlyGoals.length === 0 ? 48 : undefined,
                        transition: "min-height 0.2s ease",
                      }}
                    >
                      {yearlyGoals.map((goal, index) => (
                        <TaskItem
                          key={goal.id}
                          task={goal}
                          variant="today"
                          draggableId={goal.id}
                          index={index}
                          viewDate={todayDate}
                          showSubtasks={true}
                          defaultExpanded={true}
                          allTasksOverride={allGoals}
                          shared={taskItemShared}
                          meta={taskItemShared?.taskMetaById?.get(goal.id)}
                        />
                      ))}
                      {provided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>
          )
        ) : // Monthly view
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
                {(provided, snapshot) => (
                  <Stack
                    spacing={1}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: snapshot.isDraggingOver || selectedMonthGoals.length === 0 ? 48 : undefined,
                      transition: "min-height 0.2s ease",
                    }}
                  >
                    {selectedMonthGoals.map((goal, index) => (
                      <TaskItem
                        key={goal.id}
                        task={goal}
                        variant="today"
                        draggableId={goal.id}
                        index={index}
                        viewDate={todayDate}
                        showSubtasks={false}
                        defaultExpanded={false}
                        allTasksOverride={allGoals}
                        shared={taskItemShared}
                        meta={taskItemShared?.taskMetaById?.get(goal.id)}
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

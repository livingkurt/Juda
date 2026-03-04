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
  setGoalsSelectedWeekStart,
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
import { formatLocalDate } from "@/lib/utils";

export function GoalsTab({ isLoading }) {
  const getWeekStartDate = dateValue => {
    let date;
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [y, m, d] = dateValue.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateValue);
    }
    date.setHours(0, 0, 0, 0);
    const day = date.getDay(); // 0=Sun ... 6=Sat
    const mondayOffset = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + mondayOffset);
    return date;
  };

  const getWeekEndDate = weekStart => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 6);
    return date;
  };

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
  const selectedWeekStart = useSelector(state => state.ui.goalsSelectedWeekStart || null);
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
  const weeklyViewDate = selectedWeekStart ? getWeekStartDate(selectedWeekStart) : getWeekStartDate(todayDate);
  const goalsViewDate = viewType === "weekly" ? weeklyViewDate : todayDate;

  const taskItemShared = useTaskItemShared({
    allTasks: allGoals,
    viewDate: goalsViewDate,
    tags,
    onCreateTag: handleCreateTag,
  });

  // Filter and organize goals - only show yearly goals (monthly goals will be shown as subtasks)
  const yearlyGoals = useMemo(() => {
    if (!allGoals.length) return [];

    let filtered = allGoals.filter(g => !g.parentId && !g.goalData?.weekStartDate);

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

    const grouped = {};

    allGoals.forEach(goal => {
      // Only group actual monthly goals (not weekly goals)
      if (
        goal.goalMonths &&
        Array.isArray(goal.goalMonths) &&
        goal.goalMonths.length > 0 &&
        !goal.goalData?.weekStartDate
      ) {
        goal.goalMonths.forEach(month => {
          if (!grouped[month]) {
            grouped[month] = [];
          }
          if (!grouped[month].find(g => g.id === goal.id)) {
            grouped[month].push(goal);
          }
        });

        // Also include this monthly goal in any month where it has weekly subtasks
        // This handles the case where a weekly goal's weekStartDate falls in a
        // different month than the parent monthly goal's goalMonths
        if (goal.subtasks && goal.subtasks.length > 0) {
          goal.subtasks.forEach(sub => {
            if (sub.goalData?.weekStartDate) {
              const weekMonth = new Date(sub.goalData.weekStartDate + "T12:00:00").getMonth() + 1;
              if (!goal.goalMonths.includes(weekMonth)) {
                if (!grouped[weekMonth]) {
                  grouped[weekMonth] = [];
                }
                if (!grouped[weekMonth].find(g => g.id === goal.id)) {
                  grouped[weekMonth].push(goal);
                }
              }
            }
          });
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
  }, [allGoals]);

  // Get goals for the selected month, with subtasks filtered to those relevant to the month
  const selectedMonthGoals = useMemo(() => {
    let filtered = (monthlyGoalsByMonth[selectedMonth] || []).filter(goal => !goal.goalData?.weekStartDate);

    // For each goal, filter its subtasks to only show weekly goals relevant to this month
    // A weekly goal is relevant if its weekStartDate falls in the selected month,
    // OR if the monthly goal itself is natively in the selected month (show all subtasks)
    filtered = filtered.map(goal => {
      const isNativeMonth = goal.goalMonths?.includes(selectedMonth);
      if (isNativeMonth) {
        // Show all weekly subtasks for native month goals
        return goal;
      }
      // For goals borrowed from another month, only show subtasks in this month
      const relevantSubtasks = (goal.subtasks || []).filter(sub => {
        if (!sub.goalData?.weekStartDate) return false;
        const weekMonth = new Date(sub.goalData.weekStartDate + "T12:00:00").getMonth() + 1;
        return weekMonth === selectedMonth;
      });
      return { ...goal, subtasks: relevantSubtasks };
    });

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

  const selectedWeekGoals = useMemo(() => {
    const weekStart = weeklyViewDate;
    const weekStartKey = formatLocalDate(weekStart);
    const weekGoals = allGoals.filter(g => g.goalData?.weekStartDate === weekStartKey);
    const weekGoalIds = new Set(weekGoals.map(g => g.id));
    let filtered = weekGoals.filter(g => !g.parentId || !weekGoalIds.has(g.parentId));

    if (deferredGoalsSearchTerm.trim()) {
      const search = deferredGoalsSearchTerm.toLowerCase();
      filtered = filtered.filter(
        goal => goal.title?.toLowerCase().includes(search) || goal.description?.toLowerCase().includes(search)
      );
    }

    if (deferredGoalsSelectedTagIds.length > 0) {
      filtered = filtered.filter(goal => goal.tags?.some(tag => deferredGoalsSelectedTagIds.includes(tag.id)));
    }

    return filtered.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id);
    });
  }, [allGoals, weeklyViewDate, deferredGoalsSearchTerm, deferredGoalsSelectedTagIds]);

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
      const goalsToReorder =
        viewType === "yearly" ? yearlyGoals : viewType === "weekly" ? selectedWeekGoals : selectedMonthGoals;
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
    [yearlyGoals, selectedMonthGoals, selectedWeekGoals, viewType, updateTask]
  );

  // Get current date for DateNavigation
  const selectedDate = useMemo(() => {
    if (viewType === "weekly") {
      return weeklyViewDate;
    }
    if (viewType === "yearly") {
      return new Date(selectedYear, 0, 1);
    }
    return new Date(selectedYear, selectedMonth - 1, 1);
  }, [viewType, selectedYear, selectedMonth, weeklyViewDate]);

  // Format month name
  const getMonthName = month => {
    return new Date(selectedYear, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
  };

  const weekEndDate = getWeekEndDate(weeklyViewDate);
  const weeklyHeaderLabel = `${weeklyViewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${weeklyViewDate.getFullYear()}`;

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
            {viewType === "yearly"
              ? `${selectedYear} Goals`
              : viewType === "weekly"
                ? `Week of ${weeklyHeaderLabel}`
                : `${getMonthName(selectedMonth)} ${selectedYear} Goals`}
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
              : viewType === "weekly"
                ? newDate => {
                    dispatch(setGoalsSelectedWeekStart(formatLocalDate(getWeekStartDate(newDate))));
                  }
                : newDate => dispatch(setGoalsSelectedYear(newDate.getFullYear()))
          }
          onPrevious={
            viewType === "monthly"
              ? handlePreviousMonth
              : viewType === "weekly"
                ? () => {
                    const prevWeek = new Date(weeklyViewDate);
                    prevWeek.setDate(prevWeek.getDate() - 7);
                    dispatch(setGoalsSelectedWeekStart(formatLocalDate(prevWeek)));
                  }
                : () => dispatch(setGoalsSelectedYear(selectedYear - 1))
          }
          onNext={
            viewType === "monthly"
              ? handleNextMonth
              : viewType === "weekly"
                ? () => {
                    const nextWeek = new Date(weeklyViewDate);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    dispatch(setGoalsSelectedWeekStart(formatLocalDate(nextWeek)));
                  }
                : () => dispatch(setGoalsSelectedYear(selectedYear + 1))
          }
          onToday={
            viewType === "monthly"
              ? handleTodayMonth
              : viewType === "weekly"
                ? () => dispatch(setGoalsSelectedWeekStart(formatLocalDate(getWeekStartDate(new Date()))))
                : () => dispatch(setGoalsSelectedYear(new Date().getFullYear()))
          }
          showDatePicker={viewType !== "yearly"}
          showDateDisplay={viewType !== "yearly"}
          showViewSelector={true}
          viewCollection={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
          selectedView={viewType}
          onViewChange={newView => {
            dispatch(setGoalsViewType(newView));
            if (newView === "weekly") {
              dispatch(setGoalsSelectedWeekStart(formatLocalDate(getWeekStartDate(new Date()))));
            } else if (newView === "monthly") {
              const today = new Date();
              dispatch(setGoalsSelectedMonth(today.getMonth() + 1));
              dispatch(setGoalsSelectedYear(today.getFullYear()));
            }
          }}
          viewSelectorWidth="120px"
          compareMode={viewType === "monthly" ? "month" : viewType === "yearly" ? "year" : "day"}
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
                          task={{ ...goal, expanded: true }}
                          variant="today"
                          draggableId={goal.id}
                          index={index}
                          viewDate={goalsViewDate}
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
        ) : viewType === "monthly" ? (
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
                          task={{ ...goal, expanded: true }}
                          variant="today"
                          draggableId={goal.id}
                          index={index}
                          viewDate={goalsViewDate}
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
        ) : selectedWeekGoals.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No weekly goals for {weeklyHeaderLabel}
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateGoal}>
              Create Weekly Goal
            </Button>
          </Box>
        ) : (
          <Box>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={`goals-weekly-${weeklyViewDate.toISOString().slice(0, 10)}`}>
                {(provided, snapshot) => (
                  <Stack
                    spacing={1}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: snapshot.isDraggingOver || selectedWeekGoals.length === 0 ? 48 : undefined,
                      transition: "min-height 0.2s ease",
                    }}
                  >
                    {selectedWeekGoals.map((goal, index) => (
                      <TaskItem
                        key={goal.id}
                        task={{ ...goal, expanded: true }}
                        variant="today"
                        draggableId={goal.id}
                        index={index}
                        viewDate={goalsViewDate}
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
        )}
      </Box>
    </Box>
  );
}

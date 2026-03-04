"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Stack,
  Chip,
  IconButton,
  Button,
  Paper,
  Collapse,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Add as AddIcon,
  ContentCopy as RolloverIcon,
  CheckCircle,
  RadioButtonUnchecked,
  PlayCircle,
  ExpandMore,
  ChevronRight,
  Flag as GoalIcon,
  Star as FocusIcon,
} from "@mui/icons-material";
import { useGetGoalsQuery, useRolloverGoalMutation } from "@/lib/store/api/goalsApi";
import { useCreateTaskMutation } from "@/lib/store/api/tasksApi";
import { useGetTagsQuery } from "@/lib/store/api/tagsApi";
import dayjs from "dayjs";

/**
 * GoalCreationQuestion Component
 *
 * Renders an interactive goal creation interface for reflection questions
 * that have `allowGoalCreation: true`.
 *
 * For monthly reflections (goalCreationType: "next_month"):
 * - Shows yearly goals with their monthly sub-goals
 * - Allows creating new monthly goals under each yearly goal
 * - New goals are automatically assigned to next month
 *
 * For yearly reflections (goalCreationType: "rollover"):
 * - Shows previous year's goals with sub-goals
 * - Allows rolling over goals to new year with one click
 * - Also allows creating new yearly goals
 *
 * @param {Object} props
 * @param {Object} props.question - The reflection question with allowGoalCreation
 * @param {Date|string} props.reflectionDate - The date of the reflection
 * @param {string} props.response - Current text response for this question
 * @param {Function} props.onResponseChange - Callback when text response changes
 * @param {boolean} props.compact - Compact mode for Journal view
 */
export function GoalCreationQuestion({ question, reflectionDate, compact = false }) {
  const reflectionDayjs = dayjs(reflectionDate);
  const currentYear = reflectionDayjs.year();
  const currentMonth = reflectionDayjs.month() + 1;
  const dayOfMonth = reflectionDayjs.date();

  // For "next_week", calculate the start of next week (Monday after the reflection date)
  const nextWeekStart =
    question.goalCreationType === "next_week" ? reflectionDayjs.add(1, "week").startOf("week").add(1, "day") : null;
  const nextWeekEnd = nextWeekStart ? nextWeekStart.add(6, "day") : null;

  // Calculate target year/month based on creation type
  // If it's the 1st of the month, create goals for the current month (not next month)
  // Otherwise, create goals for next month
  // For "next_year", we show previous year's goals and allow rolling them over to the current year
  const targetYear = question.goalCreationType === "next_year" ? currentYear : currentYear;
  const targetMonth =
    question.goalCreationType === "next_month"
      ? dayOfMonth === 1
        ? currentMonth // Use current month if it's the 1st
        : currentMonth === 12
          ? 1
          : currentMonth + 1
      : question.goalCreationType === "next_week"
        ? currentMonth
        : null;
  const targetMonthYear =
    question.goalCreationType === "next_month" && currentMonth === 12 && dayOfMonth !== 1
      ? currentYear + 1
      : currentYear;

  // For "next_year", show previous year's goals (to roll over to current year); otherwise show current year
  const sourceYear = question.goalCreationType === "next_year" ? currentYear - 1 : currentYear;

  // For "next_month", calculate previous month
  const sourceMonth =
    question.goalCreationType === "next_month"
      ? dayOfMonth === 1
        ? currentMonth === 1
          ? 12
          : currentMonth - 1
        : currentMonth
      : null;
  const sourceMonthYear =
    question.goalCreationType === "next_month" && dayOfMonth === 1 && currentMonth === 1
      ? currentYear - 1
      : currentYear;

  // Fetch goals for source year/month
  // For monthly: fetch from sourceMonthYear (previous month's year) to get previous month's goals
  // For yearly: fetch from sourceYear (previous year)
  const goalsQueryYear = question.goalCreationType === "next_month" ? sourceMonthYear : sourceYear;
  const {
    data: goalsData,
    isLoading: goalsLoading,
    refetch: refetchSourceGoals,
  } = useGetGoalsQuery({
    year: goalsQueryYear,
    includeSubgoals: true,
  });

  // Fetch goals for target year/month (to check what's already rolled over and show current goals)
  // For monthly: fetch from targetMonthYear (current month's year)
  // For yearly: fetch from targetYear (current year)
  const targetQueryYear = question.goalCreationType === "next_month" ? targetMonthYear : targetYear;
  const { data: targetGoalsData, refetch: refetchTargetGoals } = useGetGoalsQuery({
    year: targetQueryYear,
    includeSubgoals: true,
  });

  // For monthly reflections, fetch current year goals for parent selection
  // This ensures we have yearly goals even if targetMonthYear is different (e.g., Jan 1st reflecting on Dec)
  const { data: currentYearGoalsData, refetch: refetchCurrentYearGoals } = useGetGoalsQuery(
    {
      year: currentYear,
      includeSubgoals: true,
    },
    { skip: question.goalCreationType !== "next_month" }
  );

  // Fetch tags for "Goals" tag
  const { data: tags = [] } = useGetTagsQuery();
  const goalsTag = useMemo(() => tags.find(t => t.name.toLowerCase() === "goals"), [tags]);

  // Mutations
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [rolloverGoal, { isLoading: rollingOver }] = useRolloverGoalMutation();

  // Local state for new goal inputs
  const [newMonthlyGoalTitle, setNewMonthlyGoalTitle] = useState("");
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [newYearlyGoalTitle, setNewYearlyGoalTitle] = useState("");
  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = useState("");
  const [selectedWeeklyParentId, setSelectedWeeklyParentId] = useState(null);
  const [expandedGoals, setExpandedGoals] = useState(new Set());

  // Get yearly goals from source year (previous year for rollover)
  const previousYearGoals = goalsData?.allGoals
    ? goalsData.allGoals.filter(
        g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0) && g.goalYear === sourceYear
      )
    : [];

  // Get yearly goals from target year (current year - already rolled over or newly created)
  const currentYearGoals =
    question.goalCreationType === "next_year" && targetGoalsData?.allGoals
      ? targetGoalsData.allGoals.filter(
          g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0) && g.goalYear === targetYear
        )
      : [];

  // Get yearly goals for parent selection (for monthly reflections)
  const yearlyGoalsForSelection =
    question.goalCreationType === "next_month" && currentYearGoalsData?.allGoals
      ? currentYearGoalsData.allGoals.filter(
          g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0) && g.goalYear === currentYear
        )
      : [];

  // Get monthly goals from previous month (for rollover)
  const previousMonthGoals =
    question.goalCreationType === "next_month" && goalsData?.allGoals
      ? goalsData.allGoals.filter(
          g =>
            g.parentId &&
            g.goalMonths &&
            Array.isArray(g.goalMonths) &&
            g.goalMonths.includes(sourceMonth) &&
            g.goalYear === sourceMonthYear
        )
      : [];

  // Get monthly goals from current/target month (already rolled over or newly created)
  const currentMonthGoals =
    question.goalCreationType === "next_month" && targetGoalsData?.allGoals
      ? targetGoalsData.allGoals.filter(
          g =>
            g.parentId &&
            g.goalMonths &&
            Array.isArray(g.goalMonths) &&
            g.goalMonths.includes(targetMonth) &&
            g.goalYear === targetMonthYear
        )
      : [];

  // Get monthly goals grouped by parent (from source year)
  const monthlyGoalsByParent = (() => {
    if (!goalsData?.allGoals) return {};
    const grouped = {};
    goalsData.allGoals.forEach(g => {
      if (g.parentId && g.goalMonths && g.goalMonths.length > 0) {
        if (!grouped[g.parentId]) grouped[g.parentId] = [];
        grouped[g.parentId].push(g);
      }
    });
    return grouped;
  })();

  // Get monthly goals grouped by parent (from target year - for next_year type)
  const targetMonthlyGoalsByParent = (() => {
    if (question.goalCreationType !== "next_year" || !targetGoalsData?.allGoals) return {};
    const grouped = {};
    targetGoalsData.allGoals.forEach(g => {
      if (g.parentId && g.goalMonths && g.goalMonths.length > 0) {
        if (!grouped[g.parentId]) grouped[g.parentId] = [];
        grouped[g.parentId].push(g);
      }
    });
    return grouped;
  })();

  // Get monthly goals for next_week type (current month's goals to pick from)
  const weeklyParentGoals =
    question.goalCreationType === "next_week" && goalsData?.allGoals
      ? goalsData.allGoals.filter(
          g =>
            g.goalYear === currentYear &&
            g.goalMonths &&
            Array.isArray(g.goalMonths) &&
            g.goalMonths.includes(currentMonth) &&
            !g.goalData?.weekStartDate &&
            g.status !== "complete"
        )
      : [];

  // Get existing weekly focus goals for the target week
  const weeklyFocusWeekStartStr = nextWeekStart ? nextWeekStart.format("YYYY-MM-DD") : null;
  const existingWeeklyGoals =
    question.goalCreationType === "next_week" && weeklyFocusWeekStartStr && goalsData?.allGoals
      ? goalsData.allGoals.filter(
          g =>
            g.goalYear === currentYear &&
            g.goalData?.weekStartDate === weeklyFocusWeekStartStr &&
            g.status !== "complete"
        )
      : [];

  // Get yearly goals for context in weekly view (to show hierarchy)
  const weeklyYearlyGoals =
    question.goalCreationType === "next_week" && goalsData?.allGoals
      ? goalsData.allGoals.filter(
          g => g.goalYear === currentYear && !g.parentId && (!g.goalMonths || g.goalMonths.length === 0)
        )
      : [];

  // Calculate next order value for a monthly goal under a parent
  const getNextMonthlyGoalOrder = parentId => {
    // For next_month type, use current month goals to calculate order
    if (question.goalCreationType === "next_month") {
      const currentMonthSubgoals = currentMonthGoals.filter(g => g.parentId === parentId);
      if (currentMonthSubgoals.length === 0) return 0;
      const maxOrder = Math.max(...currentMonthSubgoals.map(sg => sg.order ?? 0));
      return maxOrder + 1;
    }

    // For next_year type, use target year subgoals
    let subgoals = targetMonthlyGoalsByParent[parentId] || [];
    if (subgoals.length === 0) {
      subgoals = monthlyGoalsByParent[parentId] || [];
    }

    if (subgoals.length === 0) return 0;
    const maxOrder = Math.max(...subgoals.map(sg => sg.order ?? 0));
    return maxOrder + 1;
  };

  // Calculate next order value for a yearly goal
  const getNextYearlyGoalOrder = () => {
    if (!targetGoalsData?.allGoals) return 0;
    const yearlyGoalsList = targetGoalsData.allGoals.filter(
      g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0) && g.goalYear === targetYear
    );
    if (yearlyGoalsList.length === 0) return 0;
    const maxOrder = Math.max(...yearlyGoalsList.map(g => g.order ?? 0));
    return maxOrder + 1;
  };

  // Check if a goal has been rolled over to target year
  const isGoalRolledOver = goalTitle => {
    if (!targetGoalsData?.allGoals) return false;
    return targetGoalsData.allGoals.some(g => g.title === goalTitle);
  };

  // Check if a monthly goal has been rolled over to target month
  const isMonthlyGoalRolledOver = goalTitle => {
    if (!targetGoalsData?.allGoals) return false;
    return targetGoalsData.allGoals.some(
      g =>
        g.title === goalTitle &&
        g.goalMonths &&
        Array.isArray(g.goalMonths) &&
        g.goalMonths.includes(targetMonth) &&
        g.goalYear === targetMonthYear
    );
  };

  // Toggle goal expansion
  const toggleExpanded = goalId => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  // Handle creating a new monthly goal
  const handleCreateMonthlyGoal = async () => {
    const title = newMonthlyGoalTitle.trim();
    if (!title || !selectedParentId) return;

    try {
      // Calculate the next order value to append at the end
      const nextOrder = getNextMonthlyGoalOrder(selectedParentId);

      await createTask({
        title,
        completionType: "goal",
        goalYear: targetMonthYear,
        goalMonths: [targetMonth],
        parentId: selectedParentId,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
      }).unwrap();

      // Clear input after success
      setNewMonthlyGoalTitle("");
      setSelectedParentId(null);

      // Refetch goals to update the UI
      refetchSourceGoals();
      if (targetMonthYear !== sourceMonthYear || targetMonth !== sourceMonth) {
        refetchTargetGoals();
      }
      if (question.goalCreationType === "next_month") {
        refetchCurrentYearGoals();
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
    }
  };

  // Handle rolling over a monthly goal to next month
  const handleRolloverMonthlyGoal = async goal => {
    try {
      // Create a new goal with the same title but for the target month
      const nextOrder = getNextMonthlyGoalOrder(goal.parentId);

      await createTask({
        title: goal.title,
        completionType: "goal",
        goalYear: targetMonthYear,
        goalMonths: [targetMonth],
        parentId: goal.parentId,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
        goalData: {
          ...goal.goalData,
          rolledOverFrom: goal.id,
          rolledOverFromMonth: sourceMonth,
        },
      }).unwrap();

      // Refetch goals to update the UI
      refetchSourceGoals();
      if (targetMonthYear !== sourceMonthYear || targetMonth !== sourceMonth) {
        refetchTargetGoals();
      }
      refetchCurrentYearGoals();
    } catch (error) {
      console.error("Failed to rollover monthly goal:", error);
    }
  };

  // Handle creating a new yearly goal
  const handleCreateYearlyGoal = async () => {
    const title = newYearlyGoalTitle.trim();
    if (!title) return;

    try {
      // Calculate the next order value to append at the end
      const nextOrder = getNextYearlyGoalOrder();

      await createTask({
        title,
        completionType: "goal",
        goalYear: targetYear,
        goalMonths: null,
        parentId: null,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
      }).unwrap();

      setNewYearlyGoalTitle("");

      // Refetch goals to update the UI (cache invalidation should handle this, but refetch to be sure)
      refetchSourceGoals();
      if (targetYear !== sourceYear) {
        refetchTargetGoals();
      }
    } catch (error) {
      console.error("Failed to create yearly goal:", error);
      // Show error to user - you might want to add a toast notification here
    }
  };

  // Handle creating a weekly focus goal
  const handleCreateWeeklyGoal = async () => {
    const title = newWeeklyGoalTitle.trim();
    if (!title || !selectedWeeklyParentId || !nextWeekStart) return;

    try {
      const weekStartStr = nextWeekStart.format("YYYY-MM-DD");
      const existingWeekGoals = goalsData?.allGoals?.filter(g => g.goalData?.weekStartDate === weekStartStr) || [];
      const nextOrder = existingWeekGoals.length > 0 ? Math.max(...existingWeekGoals.map(g => g.order ?? 0)) + 1 : 0;

      await createTask({
        title,
        completionType: "goal",
        goalYear: currentYear,
        goalMonths: [nextWeekStart.month() + 1],
        parentId: selectedWeeklyParentId,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
        goalData: {
          weekStartDate: weekStartStr,
        },
      }).unwrap();

      setNewWeeklyGoalTitle("");
      setSelectedWeeklyParentId(null);

      refetchSourceGoals();
    } catch (error) {
      console.error("Failed to create weekly focus goal:", error);
    }
  };

  // Handle selecting an existing monthly goal as the weekly focus
  const handleSelectAsWeeklyFocus = async goal => {
    if (!nextWeekStart) return;

    try {
      const weekStartStr = nextWeekStart.format("YYYY-MM-DD");
      const existingWeekGoals = goalsData?.allGoals?.filter(g => g.goalData?.weekStartDate === weekStartStr) || [];
      const nextOrder = existingWeekGoals.length > 0 ? Math.max(...existingWeekGoals.map(g => g.order ?? 0)) + 1 : 0;

      await createTask({
        title: goal.title,
        completionType: "goal",
        goalYear: currentYear,
        goalMonths: [nextWeekStart.month() + 1],
        // Weekly focus goals must be children of the selected monthly goal.
        parentId: goal.id,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
        goalData: {
          weekStartDate: weekStartStr,
          sourceGoalId: goal.id,
        },
      }).unwrap();

      refetchSourceGoals();
    } catch (error) {
      console.error("Failed to select weekly focus goal:", error);
    }
  };

  // Handle rolling over a goal
  const handleRolloverGoal = async goal => {
    try {
      await rolloverGoal({
        goalId: goal.id,
        targetYear,
        includeSubgoals: true,
      }).unwrap();
    } catch (error) {
      console.error("Failed to rollover goal:", error);
    }
  };

  // Render status icon for goals
  const StatusIcon = ({ status }) => {
    if (status === "complete") return <CheckCircle fontSize="small" color="success" />;
    if (status === "in_progress") return <PlayCircle fontSize="small" color="primary" />;
    return <RadioButtonUnchecked fontSize="small" color="disabled" />;
  };

  if (goalsLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Question text */}
      <Typography variant={compact ? "body2" : "subtitle1"} fontWeight={500} gutterBottom>
        {question.question}
      </Typography>

      {/* Target info */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
        {question.goalCreationType === "next_year"
          ? `Rolling over goals from ${sourceYear} to ${targetYear}`
          : question.goalCreationType === "next_week"
            ? `Select or create a focus goal for the week of ${nextWeekStart?.format("MMM D")} - ${nextWeekEnd?.format("MMM D")}`
            : `Rolling over goals from ${dayjs(new Date(sourceMonthYear, sourceMonth - 1, 1)).format("MMMM")} to ${dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}`}
      </Typography>

      {/* Goals list */}
      <Stack spacing={1.5}>
        {/* Empty state message */}
        {question.goalCreationType === "next_year" &&
          previousYearGoals.length === 0 &&
          currentYearGoals.length === 0 && (
            <Paper sx={{ p: 2, bgcolor: "background.default" }}>
              <Typography variant="body2" color="text.secondary">
                No goals found for {sourceYear}. Create your first yearly goal for {targetYear} below.
              </Typography>
            </Paper>
          )}

        {/* Show previous year's goals section for next_year */}
        {question.goalCreationType === "next_year" && previousYearGoals.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 1 }}>
              Goals from {sourceYear} (roll over to {targetYear})
            </Typography>
            {previousYearGoals.map(goal => {
              const isExpanded = expandedGoals.has(goal.id);
              const subgoals = monthlyGoalsByParent[goal.id] || [];
              const hasSubgoals = subgoals.length > 0;
              const alreadyRolledOver = isGoalRolledOver(goal.title);

              return (
                <Paper
                  key={goal.id}
                  variant="outlined"
                  sx={{
                    overflow: "hidden",
                    opacity: alreadyRolledOver ? 0.6 : 1,
                  }}
                >
                  {/* Yearly goal header */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: 1.5,
                      bgcolor: "background.default",
                      borderBottom: isExpanded && hasSubgoals ? 1 : 0,
                      borderColor: "divider",
                    }}
                  >
                    {/* Status icon */}
                    <StatusIcon status={goal.status} />

                    {/* Goal title */}
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                      {goal.title}
                    </Typography>

                    {/* Year badge */}
                    <Chip size="small" label={goal.goalYear} variant="outlined" />

                    {/* Rollover button - only show on goals from previous year */}
                    <Tooltip title={alreadyRolledOver ? `Already in ${targetYear}` : `Roll over to ${targetYear}`}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleRolloverGoal(goal)}
                          disabled={alreadyRolledOver || rollingOver}
                          color={alreadyRolledOver ? "success" : "primary"}
                        >
                          {alreadyRolledOver ? <CheckCircle fontSize="small" /> : <RolloverIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </>
        )}

        {/* Show current year's goals section for next_year */}
        {question.goalCreationType === "next_year" && currentYearGoals.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 2 }}>
              Goals for {targetYear}
            </Typography>
            {currentYearGoals.map(goal => {
              const isExpanded = expandedGoals.has(goal.id);
              const subgoals = targetMonthlyGoalsByParent[goal.id] || [];
              const hasSubgoals = subgoals.length > 0;

              return (
                <Paper key={goal.id} variant="outlined" sx={{ overflow: "hidden" }}>
                  {/* Yearly goal header */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: 1.5,
                      bgcolor: "background.default",
                      borderBottom: isExpanded && hasSubgoals ? 1 : 0,
                      borderColor: "divider",
                    }}
                  >
                    {/* Expand button */}
                    {hasSubgoals && (
                      <IconButton size="small" onClick={() => toggleExpanded(goal.id)}>
                        {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                      </IconButton>
                    )}

                    {/* Status icon */}
                    <StatusIcon status={goal.status} />

                    {/* Goal title */}
                    <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                      {goal.title}
                    </Typography>

                    {/* Year badge */}
                    <Chip size="small" label={goal.goalYear} variant="outlined" />
                  </Stack>

                  {/* Sub-goals */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ p: 1.5, pl: 5 }}>
                      {subgoals.length > 0 && (
                        <Stack spacing={0.5}>
                          {subgoals.map(subgoal => (
                            <Stack key={subgoal.id} direction="row" alignItems="center" spacing={1}>
                              <StatusIcon status={subgoal.status} />
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {subgoal.title}
                              </Typography>
                              {subgoal.goalMonths && (
                                <Chip
                                  size="small"
                                  label={subgoal.goalMonths
                                    .map(m => dayjs(new Date(2024, m - 1, 1)).format("MMM"))
                                    .join(", ")}
                                  variant="outlined"
                                  sx={{ fontSize: "0.7rem" }}
                                />
                              )}
                            </Stack>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </>
        )}

        {/* Show monthly goals for next_month type */}
        {question.goalCreationType === "next_month" && (
          <>
            {/* Empty state */}
            {previousMonthGoals.length === 0 &&
              currentMonthGoals.length === 0 &&
              yearlyGoalsForSelection.length === 0 && (
                <Paper sx={{ p: 2, bgcolor: "background.default" }}>
                  <Typography variant="body2" color="text.secondary">
                    No yearly goals found. Create a yearly goal first to add monthly sub-goals.
                  </Typography>
                </Paper>
              )}

            {/* Previous month's goals (for rollover) */}
            {previousMonthGoals.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 1 }}>
                  Goals from {dayjs(new Date(sourceMonthYear, sourceMonth - 1, 1)).format("MMMM")} (roll over to{" "}
                  {dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")})
                </Typography>
                {previousMonthGoals.map(goal => {
                  const alreadyRolledOver = isMonthlyGoalRolledOver(goal.title);
                  // Get parent goal title for display
                  const parentGoal = goalsData?.allGoals?.find(g => g.id === goal.parentId);

                  return (
                    <Paper
                      key={goal.id}
                      variant="outlined"
                      sx={{
                        overflow: "hidden",
                        opacity: alreadyRolledOver ? 0.6 : 1,
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <StatusIcon status={goal.status} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {goal.title}
                          </Typography>
                          {parentGoal && (
                            <Typography variant="caption" color="text.secondary">
                              Under: {parentGoal.title}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={dayjs(new Date(sourceMonthYear, sourceMonth - 1, 1)).format("MMM")}
                          variant="outlined"
                        />
                        <Tooltip
                          title={
                            alreadyRolledOver
                              ? `Already in ${dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}`
                              : `Roll over to ${dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}`
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleRolloverMonthlyGoal(goal)}
                              disabled={alreadyRolledOver || rollingOver}
                              color={alreadyRolledOver ? "success" : "primary"}
                            >
                              {alreadyRolledOver ? <CheckCircle fontSize="small" /> : <RolloverIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  );
                })}
              </>
            )}

            {/* Current month's goals */}
            {currentMonthGoals.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 2 }}>
                  Goals for {dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}
                </Typography>
                {currentMonthGoals.map(goal => {
                  // Get parent goal title for display
                  const parentGoal = targetGoalsData?.allGoals?.find(g => g.id === goal.parentId);

                  return (
                    <Paper key={goal.id} variant="outlined" sx={{ overflow: "hidden" }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <StatusIcon status={goal.status} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {goal.title}
                          </Typography>
                          {parentGoal && (
                            <Typography variant="caption" color="text.secondary">
                              Under: {parentGoal.title}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMM")}
                          variant="outlined"
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </>
            )}

            {/* Create new monthly goal */}
            {yearlyGoalsForSelection.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, mt: 2 }}>
                <Stack spacing={1.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Create new goal for {dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Parent Goal</InputLabel>
                      <Select
                        value={selectedParentId || ""}
                        onChange={e => setSelectedParentId(e.target.value || null)}
                        label="Parent Goal"
                      >
                        <MenuItem value="">Select a yearly goal...</MenuItem>
                        {yearlyGoalsForSelection.map(g => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      placeholder="Goal title..."
                      value={newMonthlyGoalTitle}
                      onChange={e => setNewMonthlyGoalTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateMonthlyGoal();
                        }
                      }}
                      sx={{ flex: 1 }}
                      disabled={creating || !selectedParentId}
                      variant="outlined"
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleCreateMonthlyGoal}
                      disabled={!newMonthlyGoalTitle.trim() || !selectedParentId || creating}
                      startIcon={<AddIcon />}
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </>
        )}

        {/* Weekly focus goal selection for next_week type */}
        {question.goalCreationType === "next_week" && (
          <>
            {/* Existing weekly focus goals */}
            {existingWeeklyGoals.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, mt: 1 }}>
                  Weekly focus for {nextWeekStart?.format("MMM D")} - {nextWeekEnd?.format("MMM D")}
                </Typography>
                {existingWeeklyGoals.map(goal => {
                  const parentGoal = goalsData?.allGoals?.find(g => g.id === goal.parentId);

                  return (
                    <Paper key={goal.id} variant="outlined" sx={{ overflow: "hidden" }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <FocusIcon fontSize="small" color="warning" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {goal.title}
                          </Typography>
                          {parentGoal && (
                            <Typography variant="caption" color="text.secondary">
                              Under: {parentGoal.title}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={
                            goal.status === "complete"
                              ? "Complete"
                              : goal.status === "in_progress"
                                ? "In Progress"
                                : "Todo"
                          }
                          color={
                            goal.status === "complete"
                              ? "success"
                              : goal.status === "in_progress"
                                ? "primary"
                                : "default"
                          }
                          sx={{ height: 20, fontSize: "0.625rem" }}
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </>
            )}

            {/* Monthly goals to pick from */}
            {weeklyParentGoals.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 500, mt: existingWeeklyGoals.length > 0 ? 2 : 1 }}
                >
                  Pick a monthly goal to focus on, or create a specific weekly goal
                </Typography>
                {weeklyParentGoals.map(goal => {
                  const parentGoal = weeklyYearlyGoals.find(g => g.id === goal.parentId);
                  const alreadySelected = existingWeeklyGoals.some(
                    wg => wg.goalData?.sourceGoalId === goal.id || wg.title === goal.title
                  );

                  return (
                    <Paper
                      key={goal.id}
                      variant="outlined"
                      sx={{
                        overflow: "hidden",
                        opacity: alreadySelected ? 0.6 : 1,
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          p: 1.5,
                          bgcolor: "background.default",
                        }}
                      >
                        <StatusIcon status={goal.status} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {goal.title}
                          </Typography>
                          {parentGoal && (
                            <Typography variant="caption" color="text.secondary">
                              Under: {parentGoal.title}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label={dayjs(new Date(currentYear, currentMonth - 1, 1)).format("MMM")}
                          variant="outlined"
                        />
                        <Tooltip title={alreadySelected ? "Already selected for this week" : "Set as weekly focus"}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleSelectAsWeeklyFocus(goal)}
                              disabled={alreadySelected || creating}
                              color={alreadySelected ? "success" : "warning"}
                            >
                              {alreadySelected ? <CheckCircle fontSize="small" /> : <FocusIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  );
                })}
              </>
            )}

            {/* Empty state */}
            {weeklyParentGoals.length === 0 && existingWeeklyGoals.length === 0 && (
              <Paper sx={{ p: 2, bgcolor: "background.default" }}>
                <Typography variant="body2" color="text.secondary">
                  No monthly goals found for {dayjs(new Date(currentYear, currentMonth - 1, 1)).format("MMMM")}. Create
                  monthly goals in your monthly reflection first.
                </Typography>
              </Paper>
            )}

            {/* Create a new specific weekly goal under a monthly goal */}
            {weeklyParentGoals.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, mt: 1 }}>
                <Stack spacing={1.5}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Or create a specific focus goal for {nextWeekStart?.format("MMM D")} -{" "}
                    {nextWeekEnd?.format("MMM D")}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Under Goal</InputLabel>
                      <Select
                        value={selectedWeeklyParentId || ""}
                        onChange={e => setSelectedWeeklyParentId(e.target.value || null)}
                        label="Under Goal"
                      >
                        <MenuItem value="">Select a monthly goal...</MenuItem>
                        {weeklyParentGoals.map(g => (
                          <MenuItem key={g.id} value={g.id}>
                            {g.title}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      placeholder="Specific focus for the week..."
                      value={newWeeklyGoalTitle}
                      onChange={e => setNewWeeklyGoalTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateWeeklyGoal();
                        }
                      }}
                      sx={{ flex: 1 }}
                      disabled={creating || !selectedWeeklyParentId}
                      variant="outlined"
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleCreateWeeklyGoal}
                      disabled={!newWeeklyGoalTitle.trim() || !selectedWeeklyParentId || creating}
                      startIcon={<AddIcon />}
                    >
                      Add
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </>
        )}

        {/* Create new yearly goal */}
        {question.goalCreationType === "next_year" && (
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GoalIcon fontSize="small" color="primary" />
              <TextField
                size="small"
                placeholder={`New yearly goal for ${targetYear}...`}
                value={newYearlyGoalTitle}
                onChange={e => setNewYearlyGoalTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateYearlyGoal();
                  }
                }}
                sx={{ flex: 1 }}
                disabled={creating}
                variant="outlined"
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleCreateYearlyGoal}
                disabled={!newYearlyGoalTitle.trim() || creating}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}

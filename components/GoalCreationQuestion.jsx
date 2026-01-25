"use client";

import { useState, useMemo, useCallback } from "react";
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
export function GoalCreationQuestion({ question, reflectionDate, response = "", onResponseChange, compact = false }) {
  const reflectionDayjs = dayjs(reflectionDate);
  const currentYear = reflectionDayjs.year();
  const currentMonth = reflectionDayjs.month() + 1;
  const dayOfMonth = reflectionDayjs.date();

  // Calculate target year/month based on creation type
  // If it's the 1st of the month, create goals for the current month (not next month)
  // Otherwise, create goals for next month
  const targetYear = question.goalCreationType === "rollover" ? currentYear + 1 : currentYear;
  const targetMonth =
    question.goalCreationType === "next_month"
      ? dayOfMonth === 1
        ? currentMonth // Use current month if it's the 1st
        : currentMonth === 12
          ? 1
          : currentMonth + 1
      : null;
  const targetMonthYear =
    question.goalCreationType === "next_month" && currentMonth === 12 && dayOfMonth !== 1
      ? currentYear + 1
      : currentYear;

  // For rollover, show previous year's goals; otherwise show current year
  const sourceYear = question.goalCreationType === "rollover" ? currentYear : currentYear;

  // Fetch goals for source year
  const {
    data: goalsData,
    isLoading: goalsLoading,
    refetch: refetchSourceGoals,
  } = useGetGoalsQuery({
    year: sourceYear,
    includeSubgoals: true,
  });

  // Fetch goals for target year (to check what's already rolled over)
  const { data: targetGoalsData, refetch: refetchTargetGoals } = useGetGoalsQuery({
    year: targetYear,
    includeSubgoals: true,
  });

  // Fetch tags for "Goals" tag
  const { data: tags = [] } = useGetTagsQuery();
  const goalsTag = useMemo(() => tags.find(t => t.name.toLowerCase() === "goals"), [tags]);

  // Mutations
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [rolloverGoal, { isLoading: rollingOver }] = useRolloverGoalMutation();

  // Local state for new goal inputs
  const [newGoalInputs, setNewGoalInputs] = useState({}); // { [parentGoalId]: string }
  const [expandedGoals, setExpandedGoals] = useState(new Set());
  const [newYearlyGoalTitle, setNewYearlyGoalTitle] = useState("");

  // Get yearly goals from source year
  const yearlyGoals = useMemo(() => {
    if (!goalsData?.allGoals) return [];
    return goalsData.allGoals.filter(g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0));
  }, [goalsData]);

  // Get monthly goals grouped by parent
  const monthlyGoalsByParent = useMemo(() => {
    if (!goalsData?.allGoals) return {};
    const grouped = {};
    goalsData.allGoals.forEach(g => {
      if (g.parentId && g.goalMonths && g.goalMonths.length > 0) {
        if (!grouped[g.parentId]) grouped[g.parentId] = [];
        grouped[g.parentId].push(g);
      }
    });
    return grouped;
  }, [goalsData]);

  // Get monthly goals grouped by parent for target year
  const targetMonthlyGoalsByParent = useMemo(() => {
    if (!targetGoalsData?.allGoals) return {};
    const grouped = {};
    targetGoalsData.allGoals.forEach(g => {
      if (g.parentId && g.goalMonths && g.goalMonths.length > 0) {
        if (!grouped[g.parentId]) grouped[g.parentId] = [];
        grouped[g.parentId].push(g);
      }
    });
    return grouped;
  }, [targetGoalsData]);

  // Calculate next order value for a monthly goal under a parent
  const getNextMonthlyGoalOrder = useCallback(
    parentId => {
      // First try to get subgoals from target year (where we're creating the goal)
      let subgoals = targetMonthlyGoalsByParent[parentId] || [];

      // If no subgoals in target year, fall back to source year subgoals
      // (this handles the case where we're creating the first goal for next month)
      if (subgoals.length === 0) {
        subgoals = monthlyGoalsByParent[parentId] || [];
      }

      if (subgoals.length === 0) return 0;
      const maxOrder = Math.max(...subgoals.map(sg => sg.order ?? 0));
      return maxOrder + 1;
    },
    [targetMonthlyGoalsByParent, monthlyGoalsByParent]
  );

  // Calculate next order value for a yearly goal
  const getNextYearlyGoalOrder = useCallback(() => {
    // Use target goals data to get correct order for the target year
    if (!targetGoalsData?.allGoals) return 0;
    const yearlyGoalsList = targetGoalsData.allGoals.filter(
      g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0) && g.goalYear === targetYear
    );
    if (yearlyGoalsList.length === 0) return 0;
    const maxOrder = Math.max(...yearlyGoalsList.map(g => g.order ?? 0));
    return maxOrder + 1;
  }, [targetGoalsData, targetYear]);

  // Check if a goal has been rolled over to target year
  const isGoalRolledOver = useCallback(
    goalTitle => {
      if (!targetGoalsData?.allGoals) return false;
      return targetGoalsData.allGoals.some(g => g.title === goalTitle);
    },
    [targetGoalsData]
  );

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

  // Handle creating a new monthly goal under a yearly goal
  const handleCreateMonthlyGoal = async parentGoal => {
    const title = newGoalInputs[parentGoal.id]?.trim();
    if (!title) return;

    try {
      // Calculate the next order value to append at the end
      const nextOrder = getNextMonthlyGoalOrder(parentGoal.id);

      await createTask({
        title,
        completionType: "goal",
        goalYear: targetMonthYear,
        goalMonths: [targetMonth],
        parentId: parentGoal.id,
        status: "todo",
        order: nextOrder,
        tagIds: goalsTag ? [goalsTag.id] : [],
      }).unwrap();

      // Clear input after success
      setNewGoalInputs(prev => ({ ...prev, [parentGoal.id]: "" }));

      // Refetch goals to update the UI (cache invalidation should handle this, but refetch to be sure)
      refetchSourceGoals();
      if (targetMonthYear !== sourceYear) {
        refetchTargetGoals();
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
      // Show error to user - you might want to add a toast notification here
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
        {question.goalCreationType === "rollover"
          ? `Rolling over goals from ${currentYear} to ${targetYear}`
          : `Creating goals for ${dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")} ${targetMonthYear}`}
      </Typography>

      {/* Goals list */}
      <Stack spacing={1.5}>
        {yearlyGoals.length === 0 ? (
          <Paper sx={{ p: 2, bgcolor: "background.default" }}>
            <Typography variant="body2" color="text.secondary">
              No goals found for {sourceYear}. Create your first yearly goal below.
            </Typography>
          </Paper>
        ) : (
          yearlyGoals.map(goal => {
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
                  opacity: alreadyRolledOver && question.goalCreationType === "rollover" ? 0.6 : 1,
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
                    borderBottom: isExpanded && (hasSubgoals || question.goalCreationType === "next_month") ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  {/* Expand button */}
                  {(hasSubgoals || question.goalCreationType === "next_month") && (
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

                  {/* Rollover button (for yearly reflections) */}
                  {question.goalCreationType === "rollover" && (
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
                  )}
                </Stack>

                {/* Sub-goals and new goal input */}
                <Collapse in={isExpanded}>
                  <Box sx={{ p: 1.5, pl: 5 }}>
                    {/* Existing monthly sub-goals */}
                    {subgoals.length > 0 && (
                      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
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

                    {/* New monthly goal input (for monthly reflections) */}
                    {question.goalCreationType === "next_month" && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          size="small"
                          placeholder={`New goal for ${dayjs(new Date(targetMonthYear, targetMonth - 1, 1)).format("MMMM")}...`}
                          value={newGoalInputs[goal.id] || ""}
                          onChange={e =>
                            setNewGoalInputs(prev => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                          onKeyPress={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateMonthlyGoal(goal);
                            }
                          }}
                          sx={{ flex: 1 }}
                          disabled={creating}
                          variant="outlined"
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleCreateMonthlyGoal(goal)}
                          disabled={!newGoalInputs[goal.id]?.trim() || creating}
                          color="primary"
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                </Collapse>
              </Paper>
            );
          })
        )}

        {/* Create new yearly goal */}
        {(question.goalCreationType === "rollover" || question.goalCreationType === "next_year") && (
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GoalIcon fontSize="small" color="primary" />
              <TextField
                size="small"
                placeholder={`New yearly goal for ${targetYear}...`}
                value={newYearlyGoalTitle}
                onChange={e => setNewYearlyGoalTitle(e.target.value)}
                onKeyPress={e => {
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

"use client";

import { Box, Typography, Stack, Chip, LinearProgress, Paper } from "@mui/material";
import { CheckCircle, RadioButtonUnchecked, AccessTime } from "@mui/icons-material";
import { useGetCompletionsQuery } from "@/lib/store/api/completionsApi";
import { useMemo } from "react";

/**
 * GoalProgressCard - Visual component for displaying goal progress
 *
 * Shows:
 * - Goal title and status
 * - Progress bar (for goals with sub-goals)
 * - Recent progress updates from reflections
 * - Visual status indicators
 *
 * @param {Object} goal - The goal task object
 * @param {Function} onStatusChange - Callback when status is changed
 * @param {Function} onProgressNoteChange - Callback when progress note is changed
 */
export function GoalProgressCard({ goal, compact = false }) {
  // Fetch completions to get reflection progress updates
  const { data: completionsData } = useGetCompletionsQuery();

  // Memoize completions array to avoid dependency issues
  const completions = useMemo(() => {
    return Array.isArray(completionsData) ? completionsData : [];
  }, [completionsData]);

  // Calculate progress from sub-goals
  const progress = useMemo(() => {
    if (!goal.subtasks || goal.subtasks.length === 0) {
      return null;
    }

    const completed = goal.subtasks.filter(s => s.status === "complete").length;
    const total = goal.subtasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }, [goal.subtasks]);

  // Get recent progress updates from reflections
  const recentProgressUpdates = useMemo(() => {
    const updates = [];

    // Find completions that mention this goal
    completions.forEach(completion => {
      try {
        const note = JSON.parse(completion.note || "{}");
        if (note.responses && Array.isArray(note.responses)) {
          note.responses.forEach(response => {
            if (response.goalProgress && Array.isArray(response.goalProgress)) {
              const goalProgress = response.goalProgress.find(gp => gp.goalId === goal.id);
              if (goalProgress && goalProgress.progressNote) {
                updates.push({
                  date: completion.date,
                  note: goalProgress.progressNote,
                  status: goalProgress.status,
                });
              }
            }
          });
        }
      } catch (_error) {
        // Ignore invalid JSON
      }
    });

    // Sort by date descending and take most recent 3
    return updates.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  }, [completions, goal.id]);

  // Status icon and color
  const statusConfig = useMemo(() => {
    switch (goal.status) {
      case "complete":
        return {
          icon: <CheckCircle fontSize="small" />,
          color: "success",
          label: "Complete",
        };
      case "in_progress":
        return {
          icon: <AccessTime fontSize="small" />,
          color: "info",
          label: "In Progress",
        };
      default:
        return {
          icon: <RadioButtonUnchecked fontSize="small" />,
          color: "default",
          label: "To Do",
        };
    }
  }, [goal.status]);

  if (compact) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.color}
          size="small"
          variant="outlined"
        />
        {progress && (
          <Typography variant="caption" color="text.secondary">
            {progress.completed}/{progress.total} complete
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={2}>
        {/* Header with status */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body1" fontWeight={500} sx={{ flex: 1 }}>
            {goal.title}
          </Typography>
          <Chip
            icon={statusConfig.icon}
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
            variant="outlined"
          />
        </Stack>

        {/* Progress bar for goals with sub-goals */}
        {progress && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Sub-goals: {progress.completed}/{progress.total}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                ({Math.round(progress.percentage)}%)
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress.percentage}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 1,
                  bgcolor: statusConfig.color === "success" ? "success.main" : "primary.main",
                },
              }}
            />
          </Box>
        )}

        {/* Recent progress updates from reflections */}
        {recentProgressUpdates.length > 0 && (
          <Box>
            <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Recent Updates
            </Typography>
            <Stack spacing={1}>
              {recentProgressUpdates.map((update, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor:
                      update.status === "complete"
                        ? "success.main"
                        : update.status === "in_progress"
                          ? "info.main"
                          : "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    {new Date(update.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Typography>
                  <Typography variant="body2">{update.note}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Goal months if applicable */}
        {goal.goalMonths && goal.goalMonths.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {goal.goalMonths.map(month => (
              <Chip
                key={month}
                label={new Date(2000, month - 1).toLocaleString("default", { month: "short" })}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

export default GoalProgressCard;

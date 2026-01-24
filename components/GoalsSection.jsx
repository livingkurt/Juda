"use client";

import { useState } from "react";
import { Box, Stack, Typography, IconButton, Collapse } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { TaskItem } from "@/components/TaskItem";
import { useTaskOperations } from "@/hooks/useTaskOperations";

export const GoalsSection = ({ goals, showPinnedOnly = true, title = "🏆 Goals", viewDate }) => {
  const taskOps = useTaskOperations();
  const shouldSkipQuery = Boolean(goals);
  const { data: allTasks = [] } = useGetTasksQuery(undefined, { skip: shouldSkipQuery });

  const sourceGoals = goals || allTasks;
  const goalTasks = sourceGoals.filter(
    task => task.completionType === "goals" && !task.parentId && (!showPinnedOnly || task.isPinned)
  );

  const groupedGoals = {
    weekly: [],
    monthly: [],
    yearly: [],
    other: [],
  };

  goalTasks.forEach(goal => {
    const type = goal.recurrence?.type;
    if (type === "weekly") groupedGoals.weekly.push(goal);
    else if (type === "monthly") groupedGoals.monthly.push(goal);
    else if (type === "yearly") groupedGoals.yearly.push(goal);
    else groupedGoals.other.push(goal);
  });

  const defaultExpandedGroup = groupedGoals.weekly.length
    ? "weekly"
    : groupedGoals.monthly.length
      ? "monthly"
      : groupedGoals.yearly.length
        ? "yearly"
        : "other";

  const [expandedMap, setExpandedMap] = useState({});

  if (goalTasks.length === 0) {
    return null;
  }

  const handleToggle = goalId => {
    setExpandedMap(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const normalizedViewDate = (() => {
    const date = viewDate ? new Date(viewDate) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  })();

  const renderGroup = (label, items) => {
    if (!items.length) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary", textTransform: "capitalize" }}>
          {label}
        </Typography>
        <Stack spacing={1}>
          {items.map(goal => {
            const isExpanded =
              expandedMap[goal.id] !== undefined
                ? expandedMap[goal.id]
                : label.toLowerCase().includes(defaultExpandedGroup);
            const orderedSubtasks = (goal.subtasks || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

            return (
              <Box key={goal.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleToggle(goal.id)}
                    sx={{
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <ExpandMore fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, cursor: "pointer" }}
                    onClick={() => taskOps.handleEditTask(goal)}
                  >
                    {goal.title}
                  </Typography>
                </Box>
                <Collapse in={isExpanded}>
                  <Box sx={{ ml: 4, mt: 1 }}>
                    {orderedSubtasks.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        No goal subtasks yet
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {orderedSubtasks.map(subtask => (
                          <TaskItem
                            key={subtask.id}
                            task={subtask}
                            variant="subtask"
                            parentTaskId={goal.id}
                            containerId={`goal-${goal.id}`}
                            viewDate={normalizedViewDate}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {title}
      </Typography>
      {renderGroup("Weekly Goals", groupedGoals.weekly)}
      {renderGroup("Monthly Goals", groupedGoals.monthly)}
      {renderGroup("Yearly Goals", groupedGoals.yearly)}
      {renderGroup("Custom Goals", groupedGoals.other)}
    </Box>
  );
};

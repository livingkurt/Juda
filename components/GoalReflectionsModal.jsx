"use client";

import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Paper,
  Menu,
  MenuItem,
  Button,
} from "@mui/material";
import { Close, RadioButtonUnchecked, PlayCircle, CheckCircle, ArrowForward } from "@mui/icons-material";
import dayjs from "dayjs";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useGetCompletionsQuery, useUpdateCompletionMutation } from "@/lib/store/api/completionsApi";
import {
  setMainTabIndex,
  setJournalSelectedDate,
  setJournalView,
  setJournalScrollToTaskId,
  setJournalScrollToGoalId,
} from "@/lib/store/slices/uiSlice";

/**
 * GoalReflectionsModal
 *
 * Displays all reflections that reference a specific goal.
 * Shows reflection entries organized by most recent first.
 */
export const GoalReflectionsModal = ({ open, onClose, goalId, goalTitle }) => {
  const dispatch = useDispatch();

  // Fetch all reflection tasks
  const { data: allTasks = [], isLoading: tasksLoading } = useGetTasksQuery();

  // Fetch all completions
  const { data: completionsData, isLoading: completionsLoading } = useGetCompletionsQuery();

  // Mutation to update completion
  const [updateCompletion] = useUpdateCompletionMutation();

  // Status menu state
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState(null);

  // Extract completions array from response
  const completions = useMemo(() => {
    if (!completionsData) return [];
    // Handle both array response and object with completions property
    if (Array.isArray(completionsData)) return completionsData;
    if (completionsData.completions) return completionsData.completions;
    return [];
  }, [completionsData]);

  // Filter to get only reflection tasks
  const reflectionTasks = useMemo(() => {
    return allTasks.filter(task => task.completionType === "reflection");
  }, [allTasks]);

  // Find all reflections that reference this goal
  const goalReflections = useMemo(() => {
    if (!goalId || !completions.length || !reflectionTasks.length) return [];

    const reflections = [];

    completions.forEach(completion => {
      // Find the reflection task for this completion
      const reflectionTask = reflectionTasks.find(t => t.id === completion.taskId);
      if (!reflectionTask) return;

      // Parse the completion note (should be JSON for reflections)
      let completionData;
      try {
        completionData = JSON.parse(completion.note || "{}");
      } catch {
        return;
      }

      // Check if this reflection has any responses that reference our goal
      if (!completionData.responses || !Array.isArray(completionData.responses)) return;

      completionData.responses.forEach(response => {
        if (!response.goalProgress || !Array.isArray(response.goalProgress)) return;

        // Check if this response has progress for our goal
        const goalProgress = response.goalProgress.find(gp => gp.goalId === goalId);
        if (!goalProgress) return;

        // Add this reflection entry
        reflections.push({
          date: completion.date,
          reflectionTaskTitle: reflectionTask.title,
          reflectionType: reflectionTask.recurrence?.type || "one-time",
          questionText: response.questionText,
          answer: response.answer,
          status: goalProgress.status,
          progressNote: goalProgress.progressNote,
          completionId: completion.id,
          taskId: completion.taskId,
          questionId: response.questionId,
          completionData: completionData, // Store full completion data for updates
        });
      });
    });

    // Sort by date, most recent first
    return reflections.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
  }, [goalId, completions, reflectionTasks]);

  const isLoading = tasksLoading || completionsLoading;

  // Handle navigation to journal
  const handleGoToReflection = reflection => {
    // Set the journal date to the reflection date
    dispatch(setJournalSelectedDate(dayjs(reflection.date).toISOString()));

    // Set journal view to day view
    dispatch(setJournalView("day"));

    // Set the task and goal to scroll to
    dispatch(setJournalScrollToTaskId(reflection.taskId));
    dispatch(setJournalScrollToGoalId(goalId));

    // Switch to Journal tab (index 2)
    dispatch(setMainTabIndex(2));

    // Close the modal
    onClose();
  };

  // Handle status change
  const handleStatusChange = async (reflection, newStatus) => {
    try {
      // Parse the completion data
      const completionData = reflection.completionData;

      // Update the status in the goalProgress for this specific goal
      const updatedResponses = completionData.responses.map(response => {
        if (response.questionId === reflection.questionId) {
          return {
            ...response,
            goalProgress: response.goalProgress.map(gp => (gp.goalId === goalId ? { ...gp, status: newStatus } : gp)),
          };
        }
        return response;
      });

      // Create updated completion data
      const updatedCompletionData = {
        ...completionData,
        responses: updatedResponses,
      };

      // Update the completion
      await updateCompletion({
        taskId: reflection.taskId,
        date: reflection.date,
        note: JSON.stringify(updatedCompletionData),
      }).unwrap();

      // Close the menu
      setStatusMenuOpen(false);
      setStatusMenuAnchor(null);
      setSelectedReflection(null);
    } catch (error) {
      console.error("Failed to update reflection status:", error);
    }
  };

  // Get status color
  const getStatusColor = status => {
    switch (status) {
      case "complete":
        return "success";
      case "in_progress":
        return "primary";
      case "todo":
      default:
        return "default";
    }
  };

  // Get status label
  const getStatusLabel = status => {
    switch (status) {
      case "complete":
        return "Complete";
      case "in_progress":
        return "In Progress";
      case "todo":
      default:
        return "Todo";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: "80vh",
          maxHeight: "80vh",
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Reflections on: {goalTitle}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : goalReflections.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary">No reflections have been recorded for this goal yet.</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Reflections will appear here when you complete reflection tasks that track progress on this goal.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {goalReflections.map((reflection, index) => (
              <Paper
                key={`${reflection.completionId}-${index}`}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  {/* Header with date and reflection type */}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="subtitle2" fontWeight={600}>
                        {dayjs(reflection.date).format("MMMM D, YYYY")}
                      </Typography>
                      <Chip
                        label={reflection.reflectionTaskTitle}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          bgcolor: "secondary.main",
                          color: "secondary.contrastText",
                        }}
                      />
                      <Chip
                        icon={
                          reflection.status === "in_progress" ? (
                            <PlayCircle fontSize="inherit" />
                          ) : reflection.status === "complete" ? (
                            <CheckCircle fontSize="inherit" />
                          ) : (
                            <RadioButtonUnchecked fontSize="inherit" />
                          )
                        }
                        label={getStatusLabel(reflection.status)}
                        size="small"
                        color={getStatusColor(reflection.status)}
                        onClick={e => {
                          e.stopPropagation();
                          setStatusMenuAnchor(e.currentTarget);
                          setStatusMenuOpen(true);
                          setSelectedReflection(reflection);
                        }}
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          cursor: "pointer",
                          "&:hover": {
                            opacity: 0.8,
                          },
                        }}
                      />
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      endIcon={<ArrowForward fontSize="small" />}
                      onClick={() => handleGoToReflection(reflection)}
                      sx={{
                        fontSize: "0.75rem",
                        textTransform: "none",
                        minWidth: "auto",
                        px: 1.5,
                        py: 0.5,
                      }}
                    >
                      Go to Reflection
                    </Button>
                  </Stack>

                  {/* Progress note */}
                  {reflection.progressNote && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Progress Note:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          p: 1.5,
                          bgcolor: "background.default",
                          borderRadius: 1,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {reflection.progressNote}
                      </Typography>
                    </Box>
                  )}

                  {/* Answer (if any) */}
                  {reflection.answer && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Answer:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          p: 1.5,
                          bgcolor: "background.default",
                          borderRadius: 1,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {reflection.answer}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Status Change Menu */}
        <Menu
          anchorEl={statusMenuAnchor}
          open={statusMenuOpen}
          onClose={() => {
            setStatusMenuOpen(false);
            setStatusMenuAnchor(null);
            setSelectedReflection(null);
          }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              if (selectedReflection) {
                handleStatusChange(selectedReflection, "todo");
              }
            }}
            selected={selectedReflection?.status === "todo"}
          >
            <RadioButtonUnchecked fontSize="small" sx={{ mr: 1 }} />
            Todo
          </MenuItem>
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              if (selectedReflection) {
                handleStatusChange(selectedReflection, "in_progress");
              }
            }}
            selected={selectedReflection?.status === "in_progress"}
          >
            <PlayCircle fontSize="small" sx={{ mr: 1 }} />
            In Progress
          </MenuItem>
          <MenuItem
            onClick={e => {
              e.stopPropagation();
              if (selectedReflection) {
                handleStatusChange(selectedReflection, "complete");
              }
            }}
            selected={selectedReflection?.status === "complete"}
          >
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Complete
          </MenuItem>
        </Menu>
      </DialogContent>
    </Dialog>
  );
};

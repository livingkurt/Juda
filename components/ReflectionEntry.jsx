"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { useGetGoalsQuery } from "@/lib/store/api/goalsApi";
import { useUpdateTaskMutation } from "@/lib/store/api/tasksApi";
import { useCreateCompletionMutation, useDeleteCompletionMutation } from "@/lib/store/api/completionsApi";
import { GoalCreationQuestion } from "@/components/GoalCreationQuestion";
import { formatLocalDate } from "@/lib/utils";
import dayjs from "dayjs";

/**
 * ReflectionEntry Component
 *
 * Replaces text input for reflection-type tasks. Renders each question with its input field.
 * For questions with linkedGoalType, shows relevant goals with progress tracking.
 *
 * @param {Object} props
 * @param {Object} props.task - The reflection task with reflectionData
 * @param {Date|string} props.date - The date of the reflection completion
 * @param {Object} props.existingCompletion - Existing completion record (if any)
 * @param {Function} props.onSave - Callback to save completion: (taskId, date, noteJsonString) => Promise
 * @param {boolean} props.compact - If true, shows compact view (for journal)
 */
export const ReflectionEntry = ({ task, date, existingCompletion, onSave, compact = false }) => {
  const reflectionDate = dayjs(date);
  const currentYear = reflectionDate.year();
  const isFirstOfYear = reflectionDate.month() === 0 && reflectionDate.date() === 1; // January 1st

  // Parse existing completion note (should be JSON for reflections)
  const existingData = useMemo(() => {
    const note = existingCompletion?.note;
    if (!note) return null;
    try {
      return JSON.parse(note);
    } catch {
      // If not valid JSON, treat as old format and return null
      return null;
    }
  }, [existingCompletion?.note]);

  // Helper function to get questions from task
  const getQuestions = useCallback(taskData => {
    if (!taskData.reflectionData?.questions || !Array.isArray(taskData.reflectionData.questions)) {
      return [];
    }
    return [...taskData.reflectionData.questions].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, []);

  // Get questions from task reflectionData
  const questions = useMemo(() => {
    return getQuestions(task);
  }, [task, getQuestions]);

  // Get all goals for filtering (with subtasks loaded)
  const { data: goalsData } = useGetGoalsQuery({ year: currentYear, includeSubgoals: true });
  const goals = useMemo(() => {
    return goalsData?.allGoals || [];
  }, [goalsData]);

  // Mutations to update task status and create/delete completions
  const [updateTask] = useUpdateTaskMutation();
  const [createCompletion] = useCreateCompletionMutation();
  const [deleteCompletion] = useDeleteCompletionMutation();

  // Initialize responses state from existing data or create new structure
  const [responses, setResponses] = useState(() => {
    // Compute questions inline for initialization
    const initialQuestions = getQuestions(task);
    const initialState =
      existingData?.responses && Array.isArray(existingData.responses) && existingData.responses.length > 0
        ? existingData.responses
        : initialQuestions.map(q => ({
            questionId: q.id || `q-${q.order}`,
            questionText: q.question,
            answer: "",
            goalProgress: q.linkedGoalType ? [] : undefined,
          }));
    return initialState;
  });

  // Track if any field is focused to prevent external updates
  const focusedRef = useRef(false);
  const prevSavedDataRef = useRef(existingCompletion?.note);
  const isSavingRef = useRef(false);
  const responsesRef = useRef(responses);

  // Keep ref in sync with responses state
  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  // Sync with external changes when not focused and not saving
  useEffect(() => {
    if (prevSavedDataRef.current !== existingCompletion?.note && !focusedRef.current && !isSavingRef.current) {
      prevSavedDataRef.current = existingCompletion?.note;
      if (existingData?.responses && existingData.responses.length > 0) {
        // Defer setState to avoid synchronous setState in effect
        const timeoutId = setTimeout(() => {
          setResponses(existingData.responses);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [existingCompletion?.note, existingData]);

  // Build completion data structure
  const buildCompletionData = useCallback(currentResponses => {
    return {
      version: 1,
      completedAt: new Date().toISOString(),
      responses: currentResponses.map(r => ({
        questionId: r.questionId,
        questionText: r.questionText, // Preserve original question text
        answer: r.answer || "",
        goalProgress: r.goalProgress || undefined,
      })),
    };
  }, []);

  // Save function wrapper
  const saveReflection = useCallback(
    async currentResponses => {
      const completionData = buildCompletionData(currentResponses);
      const noteJson = JSON.stringify(completionData);
      if (noteJson !== prevSavedDataRef.current) {
        try {
          isSavingRef.current = true;
          // onSave signature: (taskId, note) - date is handled by the caller
          await onSave(task.id, noteJson);
          prevSavedDataRef.current = noteJson;
          // Keep isSavingRef true for a bit to prevent race condition with useEffect
          setTimeout(() => {
            isSavingRef.current = false;
          }, 100);
        } catch (error) {
          console.error("Failed to save reflection:", error);
          isSavingRef.current = false;
          // Reset to saved data on error
          if (existingData?.responses) {
            setResponses(existingData.responses);
          }
        }
      }
    },
    [task.id, onSave, buildCompletionData, existingData]
  );

  const { debouncedSave, immediateSave, cancelPending } = useDebouncedSave(saveReflection, 500);

  // Update response answer
  const handleAnswerChange = useCallback(
    (questionId, answer) => {
      setResponses(prev => {
        const updatedResponses = prev.map(r => (r.questionId === questionId ? { ...r, answer } : r));
        // Call debouncedSave directly with the updated responses
        debouncedSave(updatedResponses);
        return updatedResponses;
      });
    },
    [debouncedSave]
  );

  // Update goal progress for a question (status changes only - triggers API calls)
  const handleGoalProgressChange = useCallback(
    async (questionId, goalId, updates) => {
      // Persist all status changes to the actual goal task
      // This allows reflections to drive goal progress forward
      if (updates.status === "in_progress") {
        try {
          await updateTask({
            id: goalId,
            status: "in_progress",
            startedAt: new Date().toISOString(),
          }).unwrap();
        } catch (error) {
          console.error("Failed to update goal to in_progress:", error);
        }
      } else if (updates.status === "complete") {
        try {
          await updateTask({
            id: goalId,
            status: "complete",
          }).unwrap();

          // Create a completion record for today (so checkbox shows as checked in GoalsTab)
          // This mirrors the behavior in useStatusHandlers where status -> completion syncs
          const today = new Date();
          const todayStr = formatLocalDate(today);
          try {
            await createCompletion({
              taskId: goalId,
              date: todayStr,
              outcome: "completed",
            }).unwrap();
          } catch (error) {
            // Ignore if completion already exists
            if (!error?.data?.message?.includes("already exists")) {
              console.error("Failed to create completion:", error);
            }
          }
        } catch (error) {
          console.error("Failed to update goal status to complete:", error);
        }
      } else if (updates.status === "todo") {
        // Allow reverting to todo (removes in_progress state)
        // Find the goal to check its current status
        const goal = goals.find(g => g.id === goalId);
        const wasComplete = goal?.status === "complete";

        try {
          await updateTask({
            id: goalId,
            status: "todo",
            startedAt: null,
          }).unwrap();

          // If goal was previously complete, delete completion record for today
          // This syncs "Set to Todo" with unchecking the checkbox (reverse of status -> completion)
          if (wasComplete) {
            const today = new Date();
            const todayStr = formatLocalDate(today);
            try {
              await deleteCompletion({ taskId: goalId, date: todayStr }).unwrap();
            } catch (error) {
              // Ignore if no completion exists
              if (!error?.message?.includes("not found")) {
                console.error("Failed to delete completion when reverting to todo:", error);
              }
            }
          }
        } catch (error) {
          console.error("Failed to revert goal status to todo:", error);
        }
      }

      // Update local state and save to reflection completion
      setResponses(prev => {
        const updatedResponses = prev.map(r => {
          if (r.questionId !== questionId) return r;
          const goalProgress = r.goalProgress || [];
          const existingIndex = goalProgress.findIndex(gp => gp.goalId === goalId);
          const updatedGoalProgress =
            existingIndex >= 0
              ? goalProgress.map((gp, idx) => (idx === existingIndex ? { ...gp, ...updates } : gp))
              : [...goalProgress, { goalId, ...updates }];
          return { ...r, goalProgress: updatedGoalProgress };
        });
        // Call debouncedSave directly with the updated responses
        debouncedSave(updatedResponses);
        return updatedResponses;
      });
    },
    [debouncedSave, updateTask, createCompletion, deleteCompletion, goals]
  );

  // Update progress note only (no API calls, just local state + debounced save)
  const handleProgressNoteChange = useCallback(
    (questionId, goalId, goalTitle, currentStatus, progressNote) => {
      setResponses(prev => {
        const updatedResponses = prev.map(r => {
          if (r.questionId !== questionId) return r;
          const goalProgress = r.goalProgress || [];
          const existingIndex = goalProgress.findIndex(gp => gp.goalId === goalId);
          const updatedGoalProgress =
            existingIndex >= 0
              ? goalProgress.map((gp, idx) =>
                  idx === existingIndex
                    ? {
                        ...gp,
                        progressNote,
                      }
                    : gp
                )
              : [
                  ...goalProgress,
                  {
                    goalId,
                    goalTitle,
                    status: currentStatus,
                    progressNote,
                  },
                ];
          return { ...r, goalProgress: updatedGoalProgress };
        });
        // Call debouncedSave directly with the updated responses
        debouncedSave(updatedResponses);
        return updatedResponses;
      });
    },
    [debouncedSave]
  );

  // Clear goal progress entry from a reflection (for cleaning up legacy data)
  const handleClearGoalProgress = useCallback(
    (questionId, goalId) => {
      setResponses(prev => {
        const updatedResponses = prev.map(r => {
          if (r.questionId !== questionId) return r;
          const goalProgress = r.goalProgress || [];
          const filteredGoalProgress = goalProgress.filter(gp => gp.goalId !== goalId);
          return { ...r, goalProgress: filteredGoalProgress.length > 0 ? filteredGoalProgress : undefined };
        });
        // Call debouncedSave directly with the updated responses
        debouncedSave(updatedResponses);
        return updatedResponses;
      });
    },
    [debouncedSave]
  );

  // Memoize filtered goals by type to avoid recalculating on every render
  // For NEW reflections: exclude completed goals
  // For PAST reflections: include all goals that were tracked + any incomplete goals
  const yearlyGoals = useMemo(() => {
    const baseFilter = g => g.goalYear === currentYear && !g.parentId && (!g.goalMonths || g.goalMonths.length === 0);

    // If this is a past reflection with saved data, include goals that were tracked
    if (existingData?.responses) {
      const trackedGoalIds = new Set();
      existingData.responses.forEach(r => {
        if (r.goalProgress) {
          r.goalProgress.forEach(gp => trackedGoalIds.add(gp.goalId));
        }
      });

      return goals.filter(g => baseFilter(g) && (g.status !== "complete" || trackedGoalIds.has(g.id)));
    }

    // For new reflections, only show incomplete goals
    return goals.filter(g => baseFilter(g) && g.status !== "complete");
  }, [goals, currentYear, existingData]);

  const monthlyGoals = useMemo(() => {
    const currentMonth = reflectionDate.month() + 1;
    const baseFilter = g =>
      g.goalYear === currentYear && g.goalMonths && Array.isArray(g.goalMonths) && g.goalMonths.includes(currentMonth);

    // If this is a past reflection with saved data, include goals that were tracked
    if (existingData?.responses) {
      const trackedGoalIds = new Set();
      existingData.responses.forEach(r => {
        if (r.goalProgress) {
          r.goalProgress.forEach(gp => trackedGoalIds.add(gp.goalId));
        }
      });

      return goals.filter(g => baseFilter(g) && (g.status !== "complete" || trackedGoalIds.has(g.id)));
    }

    // For new reflections, only show incomplete goals
    return goals.filter(g => baseFilter(g) && g.status !== "complete");
  }, [goals, currentYear, reflectionDate, existingData]);

  // Get relevant goals for a question based on linkedGoalType
  const getRelevantGoals = useCallback(
    linkedGoalType => {
      if (!linkedGoalType) return [];

      if (linkedGoalType === "yearly") {
        return yearlyGoals;
      }
      if (linkedGoalType === "monthly") {
        return monthlyGoals;
      }
      return [];
    },
    [yearlyGoals, monthlyGoals]
  );

  // Get goal progress entry for a question and goal
  const getGoalProgress = useCallback(
    (questionId, goalId) => {
      const response = responses.find(r => r.questionId === questionId);
      if (!response?.goalProgress) return null;
      return response.goalProgress.find(gp => gp.goalId === goalId);
    },
    [responses]
  );

  if (questions.length === 0) {
    return (
      <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1, bgcolor: "background.paper" }}>
        <Typography variant="body2" color="text.secondary">
          No questions configured for this reflection. Please edit the task to add questions.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: compact ? 0 : 1,
        borderColor: "divider",
        borderRadius: compact ? 0 : 1,
        bgcolor: compact ? "transparent" : "background.paper",
        p: compact ? 0 : 2,
      }}
    >
      <Stack spacing={compact ? 2 : 3}>
        {questions.map(question => {
          const questionId = question.id || `q-${question.order}`;
          const response = responses.find(r => r.questionId === questionId);
          const relevantGoals = question.linkedGoalType ? getRelevantGoals(question.linkedGoalType) : [];

          // Check if this is a goal creation question
          if (question.allowGoalCreation) {
            return (
              <Box key={questionId}>
                <GoalCreationQuestion question={question} reflectionDate={date} compact={compact} />
              </Box>
            );
          }

          // Hide entire question on first of year if it's linked to goals (no goals to track yet)
          if (question.linkedGoalType && isFirstOfYear) {
            return null;
          }

          return (
            <Box key={question.id || `q-${question.order}`}>
              <Typography variant={compact ? "body2" : "body1"} fontWeight={500} sx={{ mb: 1, color: "text.primary" }}>
                {question.question}
              </Typography>

              {/* Text answer input - only show when question is not linked to goals */}
              {!question.linkedGoalType && (
                <TextField
                  value={response?.answer || ""}
                  onChange={e => {
                    focusedRef.current = true;
                    handleAnswerChange(question.id || `q-${question.order}`, e.target.value);
                  }}
                  onBlur={e => {
                    focusedRef.current = false;
                    const currentAnswer = e.target.value;
                    const questionId = question.id || `q-${question.order}`;

                    setResponses(prev => {
                      const updatedResponses = prev.map(r =>
                        r.questionId === questionId ? { ...r, answer: currentAnswer } : r
                      );
                      // Call immediateSave directly with the updated responses
                      immediateSave(updatedResponses);
                      return updatedResponses;
                    });
                  }}
                  onFocus={() => {
                    focusedRef.current = true;
                  }}
                  placeholder="Enter your response..."
                  size="small"
                  multiline
                  variant="filled"
                  fullWidth
                  minRows={compact ? 2 : 3}
                />
              )}

              {/* Goal progress section - hide on first of year (no goals to track yet) */}
              {question.linkedGoalType && relevantGoals.length > 0 && !isFirstOfYear && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Track progress on related goals:
                  </Typography>
                  <Stack spacing={1.5}>
                    {relevantGoals.map(goal => {
                      const goalProgress = getGoalProgress(question.id || `q-${question.order}`, goal.id);
                      // Use the stored status from this reflection's progress, or default to goal's current status
                      // This preserves the historical status at the time of this reflection
                      const currentStatus = goalProgress?.status || goal.status || "todo";
                      const progressNote = goalProgress?.progressNote || "";

                      return (
                        <Box
                          key={goal.id}
                          id={`goal-progress-${goal.id}`}
                          sx={{
                            p: 1.5,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            bgcolor: "background.default",
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 120 }}>
                                {goal.title}
                              </Typography>
                              <Chip
                                label={
                                  currentStatus === "complete"
                                    ? "Complete"
                                    : currentStatus === "in_progress"
                                      ? "In Progress"
                                      : "Todo"
                                }
                                size="small"
                                color={
                                  currentStatus === "complete"
                                    ? "success"
                                    : currentStatus === "in_progress"
                                      ? "primary"
                                      : "default"
                                }
                                sx={{ height: 20, fontSize: "0.625rem" }}
                              />
                              {/* Clear button - only show if there's existing goalProgress data */}
                              {goalProgress && (
                                <Tooltip title="Remove this goal from this reflection">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const capturedQuestionId = question.id || `q-${question.order}`;
                                      const capturedGoalId = goal.id;
                                      handleClearGoalProgress(capturedQuestionId, capturedGoalId);
                                    }}
                                    sx={{ ml: 0.5, p: 0.5 }}
                                  >
                                    <Close fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>

                            {/* Status selector */}
                            <FormControl size="small" fullWidth>
                              <InputLabel>Update Status</InputLabel>
                              <Select
                                value={currentStatus}
                                onChange={e => {
                                  const newStatus = e.target.value;
                                  const capturedGoalId = goal.id; // Explicitly capture goal.id
                                  const capturedQuestionId = question.id || `q-${question.order}`;

                                  focusedRef.current = true;
                                  handleGoalProgressChange(capturedQuestionId, capturedGoalId, {
                                    goalId: capturedGoalId,
                                    goalTitle: goal.title,
                                    status: newStatus,
                                    progressNote,
                                  });
                                }}
                                label="Update Status"
                              >
                                <MenuItem value="todo">Todo</MenuItem>
                                <MenuItem value="in_progress">In Progress</MenuItem>
                                <MenuItem value="complete">Complete</MenuItem>
                              </Select>
                            </FormControl>

                            {/* Progress note */}
                            <TextField
                              value={progressNote}
                              onChange={e => {
                                focusedRef.current = true;
                                handleProgressNoteChange(
                                  question.id || `q-${question.order}`,
                                  goal.id,
                                  goal.title,
                                  currentStatus,
                                  e.target.value
                                );
                              }}
                              onBlur={() => {
                                focusedRef.current = false;
                                // Cancel any pending debounced save and immediately save on blur
                                // Use setTimeout to ensure this happens outside of render phase
                                setTimeout(() => {
                                  cancelPending();
                                  immediateSave(responsesRef.current);
                                }, 0);
                              }}
                              onFocus={() => {
                                focusedRef.current = true;
                              }}
                              placeholder="Add progress note..."
                              size="small"
                              multiline
                              variant="outlined"
                              fullWidth
                              minRows={2}
                            />
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

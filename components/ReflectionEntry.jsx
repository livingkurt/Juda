"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Box, Typography, TextField, Stack, Chip, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
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
  const currentYear = dayjs(date).year();

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
    const qs = getQuestions(task);
    console.log("ReflectionEntry: Computing questions", {
      taskId: task.id,
      hasReflectionData: Boolean(task.reflectionData),
      questionsCount: qs.length,
      questions: qs,
    });
    return qs;
  }, [task, getQuestions]);

  // Get all goals for filtering
  const { data: allTasks = [] } = useGetTasksQuery();
  const goals = useMemo(() => {
    return allTasks.filter(t => t.completionType === "goal");
  }, [allTasks]);

  // Initialize responses state from existing data or create new structure
  const [responses, setResponses] = useState(() => {
    // Compute questions inline for initialization
    const initialQuestions = getQuestions(task);
    console.log("ReflectionEntry: Initializing state", {
      taskId: task.id,
      taskTitle: task.title,
      hasExistingData: Boolean(existingData),
      existingResponses: existingData?.responses,
      initialQuestionsLength: initialQuestions.length,
      initialQuestions,
    });
    const initialState =
      existingData?.responses && Array.isArray(existingData.responses) && existingData.responses.length > 0
        ? existingData.responses
        : initialQuestions.map(q => ({
            questionId: q.id || `q-${q.order}`,
            questionText: q.question,
            answer: "",
            goalProgress: q.linkedGoalType ? [] : undefined,
          }));
    console.log("ReflectionEntry: Initial state computed", {
      taskId: task.id,
      taskTitle: task.title,
      initialState,
    });
    return initialState;
  });

  // Track if any field is focused to prevent external updates
  const focusedRef = useRef(false);
  const prevSavedDataRef = useRef(existingCompletion?.note);
  const isSavingRef = useRef(false);

  // Sync with external changes when not focused and not saving
  useEffect(() => {
    if (prevSavedDataRef.current !== existingCompletion?.note && !focusedRef.current && !isSavingRef.current) {
      console.log("⚠️ ReflectionEntry: RESETTING STATE from external change", {
        taskId: task.id,
        taskTitle: task.title,
        focused: focusedRef.current,
        saving: isSavingRef.current,
        prevNote: prevSavedDataRef.current?.substring(0, 100),
        newNote: existingCompletion?.note?.substring(0, 100),
        newResponses: existingData?.responses,
      });
      prevSavedDataRef.current = existingCompletion?.note;
      if (existingData?.responses) {
        // Defer setState to avoid synchronous setState in effect
        const timeoutId = setTimeout(() => {
          console.log("⚠️ ReflectionEntry: Actually resetting state now", existingData.responses);
          setResponses(existingData.responses);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [existingCompletion?.note, existingData, task.id, task.title]);

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
      console.log("saveReflection called", {
        taskId: task.id,
        taskTitle: task.title,
        currentResponses,
        noteJson: noteJson.substring(0, 100),
        prevSaved: prevSavedDataRef.current?.substring(0, 100),
        willSave: noteJson !== prevSavedDataRef.current,
      });
      if (noteJson !== prevSavedDataRef.current) {
        try {
          isSavingRef.current = true;
          console.log("💾 saveReflection: Starting save, isSavingRef = true");
          // onSave signature: (taskId, note) - date is handled by the caller
          await onSave(task.id, noteJson);
          prevSavedDataRef.current = noteJson;
          console.log("💾 saveReflection: Save completed, keeping isSavingRef = true for 100ms");
          // Keep isSavingRef true for a bit to prevent race condition with useEffect
          setTimeout(() => {
            isSavingRef.current = false;
            console.log("💾 saveReflection: isSavingRef = false now");
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
    [task.id, task.title, onSave, buildCompletionData, existingData]
  );

  const { debouncedSave, immediateSave } = useDebouncedSave(saveReflection, 500);

  // Update response answer
  const handleAnswerChange = useCallback(
    (questionId, answer) => {
      console.log("handleAnswerChange called", { questionId, answer, taskId: task.id });
      // Update state and capture the new value
      let updatedResponses;
      setResponses(prev => {
        console.log("handleAnswerChange: prev state", prev);
        updatedResponses = prev.map(r => (r.questionId === questionId ? { ...r, answer } : r));
        console.log("handleAnswerChange: new state", updatedResponses);
        return updatedResponses;
      });

      // Save separately (not inside setResponses)
      setTimeout(() => {
        if (updatedResponses) {
          console.log("handleAnswerChange: triggering debounced save", updatedResponses);
          debouncedSave(updatedResponses);
        }
      }, 0);
    },
    [debouncedSave, task.id]
  );

  // Update goal progress for a question
  const handleGoalProgressChange = useCallback(
    (questionId, goalId, updates) => {
      // Update state and capture the new value
      let updatedResponses;
      setResponses(prev => {
        updatedResponses = prev.map(r => {
          if (r.questionId !== questionId) return r;
          const goalProgress = r.goalProgress || [];
          const existingIndex = goalProgress.findIndex(gp => gp.goalId === goalId);
          const updatedGoalProgress =
            existingIndex >= 0
              ? goalProgress.map((gp, idx) => (idx === existingIndex ? { ...gp, ...updates } : gp))
              : [...goalProgress, { goalId, ...updates }];
          return { ...r, goalProgress: updatedGoalProgress };
        });
        return updatedResponses;
      });

      // Save separately (not inside setResponses)
      setTimeout(() => {
        if (updatedResponses) {
          debouncedSave(updatedResponses);
        }
      }, 0);
    },
    [debouncedSave]
  );

  // Get relevant goals for a question based on linkedGoalType
  const getRelevantGoals = useCallback(
    linkedGoalType => {
      if (!linkedGoalType) return [];
      if (linkedGoalType === "yearly") {
        return goals.filter(
          g => g.goalYear === currentYear && !g.parentId && (!g.goalMonths || g.goalMonths.length === 0)
        );
      }
      if (linkedGoalType === "monthly") {
        const currentMonth = dayjs(date).month() + 1;
        return goals.filter(
          g => g.goalYear === currentYear && (g.goalMonths?.includes(currentMonth) || g.parentId) // Monthly goals or sub-goals
        );
      }
      return [];
    },
    [goals, currentYear, date]
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
          const response = responses.find(r => r.questionId === (question.id || `q-${question.order}`));
          const relevantGoals = question.linkedGoalType ? getRelevantGoals(question.linkedGoalType) : [];

          return (
            <Box key={question.id || `q-${question.order}`}>
              <Typography variant={compact ? "body2" : "body1"} fontWeight={500} sx={{ mb: 1, color: "text.primary" }}>
                {question.question}
              </Typography>

              {/* Text answer input */}
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

                  // Update state and capture the new value
                  let updatedResponses;
                  setResponses(prev => {
                    updatedResponses = prev.map(r =>
                      r.questionId === questionId ? { ...r, answer: currentAnswer } : r
                    );
                    return updatedResponses;
                  });

                  // Save separately (not inside setResponses)
                  setTimeout(() => {
                    if (updatedResponses) {
                      immediateSave(updatedResponses);
                    }
                  }, 0);
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
                sx={{ mb: relevantGoals.length > 0 ? 2 : 0 }}
              />

              {/* Goal progress section */}
              {question.linkedGoalType && relevantGoals.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Track progress on related goals:
                  </Typography>
                  <Stack spacing={1.5}>
                    {relevantGoals.map(goal => {
                      const goalProgress = getGoalProgress(question.id || `q-${question.order}`, goal.id);
                      const currentStatus = goalProgress?.status || goal.status || "todo";
                      const progressNote = goalProgress?.progressNote || "";

                      return (
                        <Box
                          key={goal.id}
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
                            </Stack>

                            {/* Status selector */}
                            <FormControl size="small" fullWidth>
                              <InputLabel>Update Status</InputLabel>
                              <Select
                                value={currentStatus}
                                onChange={e => {
                                  focusedRef.current = true;
                                  handleGoalProgressChange(question.id || `q-${question.order}`, goal.id, {
                                    goalId: goal.id,
                                    goalTitle: goal.title,
                                    status: e.target.value,
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
                                handleGoalProgressChange(question.id || `q-${question.order}`, goal.id, {
                                  goalId: goal.id,
                                  goalTitle: goal.title,
                                  status: currentStatus,
                                  progressNote: e.target.value,
                                });
                              }}
                              onBlur={e => {
                                focusedRef.current = false;
                                const currentProgressNote = e.target.value;
                                const questionId = question.id || `q-${question.order}`;

                                // Update state and capture the new value
                                let updatedResponses;
                                setResponses(prev => {
                                  updatedResponses = prev.map(r => {
                                    if (r.questionId !== questionId) return r;
                                    const goalProgress = r.goalProgress || [];
                                    const existingIndex = goalProgress.findIndex(gp => gp.goalId === goal.id);
                                    const updatedGoalProgress =
                                      existingIndex >= 0
                                        ? goalProgress.map((gp, idx) =>
                                            idx === existingIndex
                                              ? {
                                                  ...gp,
                                                  progressNote: currentProgressNote,
                                                }
                                              : gp
                                          )
                                        : [
                                            ...goalProgress,
                                            {
                                              goalId: goal.id,
                                              goalTitle: goal.title,
                                              status: currentStatus,
                                              progressNote: currentProgressNote,
                                            },
                                          ];
                                    return { ...r, goalProgress: updatedGoalProgress };
                                  });
                                  return updatedResponses;
                                });

                                // Save separately (not inside setResponses)
                                setTimeout(() => {
                                  if (updatedResponses) {
                                    immediateSave(updatedResponses);
                                  }
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

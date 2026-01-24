"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Box, Typography, TextField, Stack, Divider, IconButton, Collapse } from "@mui/material";
import { ExpandMore, ChevronRight, MoreVert } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useGetReflectionQuestionsQuery } from "@/lib/store/api/reflectionQuestionsApi";
import { useGetReflectionGoalsQuery } from "@/lib/store/api/reflectionGoalsApi";
import { useGetTasksQuery } from "@/lib/store/api/tasksApi";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { TaskContextMenu } from "./TaskContextMenu";

export const ReflectionEntry = ({ task, date, completionDate, completion, isCurrentYear, onSave }) => {
  const theme = useTheme();
  const { data: questionRecords = [] } = useGetReflectionQuestionsQuery({ taskId: task.id, date });
  const { data: allTasks = [] } = useGetTasksQuery();
  const { data: reflectionGoalsData } = useGetReflectionGoalsQuery(task.id);

  const activeQuestions = questionRecords[0];
  const [answers, setAnswers] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const prevAnswersRef = useRef(completion?.reflectionAnswers || {});
  const userToggledRef = useRef(false);

  const hasAnswers =
    completion?.reflectionAnswers &&
    Object.keys(completion.reflectionAnswers).filter(k => k !== "goalProgress").length > 0;

  // Determine default expansion based on whether there are answers
  const defaultExpanded = useMemo(() => {
    return Boolean(hasAnswers);
  }, [hasAnswers]);

  // Update expansion state when defaultExpanded changes (but only if user hasn't manually toggled)
  useEffect(() => {
    if (!userToggledRef.current) {
      const timeoutId = setTimeout(() => {
        setExpanded(defaultExpanded);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [defaultExpanded]);

  useEffect(() => {
    const nextAnswers = completion?.reflectionAnswers || {};
    if (prevAnswersRef.current === nextAnswers) return;
    prevAnswersRef.current = nextAnswers;
    const timeoutId = setTimeout(() => {
      setAnswers(nextAnswers);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [completion]);

  const linkedGoalIds = reflectionGoalsData?.goalTaskIds || [];
  const activeGoals = allTasks.filter(t => linkedGoalIds.includes(t.id));

  const saveAnswers = async nextAnswers => {
    if (!isCurrentYear) return;
    await onSave(task.id, completionDate || date, { reflectionAnswers: nextAnswers });
  };

  const { debouncedSave } = useDebouncedSave(saveAnswers, 500);

  const handleAnswerChange = (questionId, value) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    debouncedSave(updated);
  };

  const handleGoalAnswerChange = (goalId, value) => {
    const goalProgress = { ...(answers.goalProgress || {}), [goalId]: value };
    const updated = { ...answers, goalProgress };
    setAnswers(updated);
    debouncedSave(updated);
  };

  const handleToggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    userToggledRef.current = true;
  };

  const handleMenuOpen = e => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
    setMenuAnchor(null);
  };

  // Determine task properties for context menu
  const isRecurring = task.recurrence && task.recurrence.type !== "none";
  const isWorkoutTask = task.completionType === "workout";
  const outcome = completion?.outcome || null;
  const isSubtask = Boolean(task.parentId);

  if (!activeQuestions) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: { xs: 3, md: 3 },
          opacity: isCurrentYear ? 1 : 0.7,
          position: "relative",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography
            variant={theme.breakpoints.down("md") ? "body1" : "h6"}
            sx={{
              fontWeight: 500,
              color: isCurrentYear ? "text.primary" : "text.secondary",
              flex: 1,
            }}
          >
            {task.title}
          </Typography>
          <IconButton
            onClick={handleMenuOpen}
            onMouseDown={e => e.stopPropagation()}
            size="small"
            aria-label="Task options"
            sx={{
              minWidth: { xs: "24px", md: "32px" },
              height: { xs: "24px", md: "32px" },
              p: { xs: 0, md: 1 },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No questions configured for this reflection. Edit the reflection task to add questions.
        </Typography>
        <TaskContextMenu
          task={task}
          date={date}
          isRecurring={isRecurring}
          isWorkoutTask={isWorkoutTask}
          outcome={outcome}
          isSubtask={isSubtask}
          onClose={handleMenuClose}
          anchorEl={menuAnchor}
          open={menuOpen}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: { xs: 3, md: 3 },
        opacity: isCurrentYear ? 1 : 0.7,
        position: "relative",
      }}
    >
      <Stack spacing={0}>
        {/* Header with title, expand/collapse, and menu */}
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton
            onClick={e => {
              e.stopPropagation();
              handleToggleExpand();
            }}
            onMouseDown={e => e.stopPropagation()}
            size="small"
            aria-label="Toggle expand"
            sx={{
              minWidth: { xs: "24px", md: "32px" },
              height: { xs: "24px", md: "32px" },
              p: { xs: 0, md: 1 },
            }}
          >
            {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
          <Typography
            variant={theme.breakpoints.down("md") ? "body1" : "h6"}
            sx={{
              fontWeight: 500,
              color: isCurrentYear ? "text.primary" : "text.secondary",
              flex: 1,
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
            onClick={handleToggleExpand}
          >
            {task.title}
          </Typography>
          <IconButton
            onClick={handleMenuOpen}
            onMouseDown={e => e.stopPropagation()}
            size="small"
            aria-label="Task options"
            sx={{
              minWidth: { xs: "24px", md: "32px" },
              height: { xs: "24px", md: "32px" },
              p: { xs: 0, md: 1 },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Stack>

        {/* Collapsible content */}
        <Collapse in={expanded}>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {(activeQuestions.questions || []).map(question => (
              <TextField
                key={question.id}
                fullWidth
                multiline
                minRows={2}
                maxRows={10}
                label={question.text}
                value={answers[question.id] || ""}
                onChange={e => handleAnswerChange(question.id, e.target.value)}
                disabled={!isCurrentYear}
                variant="filled"
                size="small"
              />
            ))}

            {activeQuestions.includeGoalReflection && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                    🏆 {activeQuestions.goalReflectionQuestion || "Goals Progress"}
                  </Typography>
                  {activeGoals.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No linked goals yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {activeGoals.map(goal => (
                        <Box key={goal.id} sx={{ p: 1, borderRadius: 1, bgcolor: "background.default" }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                            {goal.title}
                          </Typography>
                          {(goal.subtasks || []).length > 0 && (
                            <Box sx={{ ml: 2, mb: 1 }}>
                              {goal.subtasks.map(subtask => (
                                <Typography
                                  key={subtask.id}
                                  variant="caption"
                                  sx={{ display: "block", color: "text.secondary" }}
                                >
                                  • {subtask.title}
                                </Typography>
                              ))}
                            </Box>
                          )}
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={8}
                            label="Progress"
                            value={answers.goalProgress?.[goal.id] || ""}
                            onChange={e => handleGoalAnswerChange(goal.id, e.target.value)}
                            disabled={!isCurrentYear}
                            variant="filled"
                            size="small"
                          />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </Collapse>
      </Stack>

      <TaskContextMenu
        task={task}
        date={date}
        isRecurring={isRecurring}
        isWorkoutTask={isWorkoutTask}
        outcome={outcome}
        isSubtask={isSubtask}
        onClose={handleMenuClose}
        anchorEl={menuAnchor}
        open={menuOpen}
      />
    </Box>
  );
};

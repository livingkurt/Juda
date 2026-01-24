"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { Add, Delete, DragIndicator } from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const createQuestion = (text = "", order = 0) => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  order,
});

export const ReflectionQuestionsEditor = ({
  open,
  onClose,
  currentQuestions = [],
  includeGoalReflection = false,
  goalReflectionQuestion = "",
  onSave,
}) => {
  const [questions, setQuestions] = useState([]);
  const [includeGoals, setIncludeGoals] = useState(false);
  const [goalQuestion, setGoalQuestion] = useState("");

  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      if (currentQuestions.length > 0) {
        setQuestions(currentQuestions.map((q, idx) => ({ ...q, order: idx })));
      } else {
        setQuestions([createQuestion("", 0)]);
      }
      setIncludeGoals(includeGoalReflection);
      setGoalQuestion(goalReflectionQuestion || "How did you progress on your goals?");
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [open, currentQuestions, includeGoalReflection, goalReflectionQuestion]);

  const handleAddQuestion = () => {
    setQuestions(prev => [...prev, createQuestion("", prev.length)]);
  };

  const handleRemoveQuestion = id => {
    setQuestions(prev => prev.filter(q => q.id !== id).map((q, idx) => ({ ...q, order: idx })));
  };

  const handleQuestionChange = (id, text) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, text } : q)));
  };

  const handleDragEnd = result => {
    if (!result.destination) return;
    const items = Array.from(questions);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setQuestions(items.map((q, idx) => ({ ...q, order: idx })));
  };

  const handleSave = () => {
    const cleaned = questions.filter(q => q.text.trim());
    if (cleaned.length === 0) return;
    onSave({
      questions: cleaned.map((q, idx) => ({ ...q, order: idx })),
      includeGoalReflection: includeGoals,
      goalReflectionQuestion: includeGoals ? goalQuestion : null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Reflection Questions</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Updating questions creates a new version starting today.
          </Typography>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="reflection-questions">
              {provided => (
                <Stack spacing={2} ref={provided.innerRef} {...provided.droppableProps}>
                  {questions.map((question, index) => (
                    <Draggable key={question.id} draggableId={question.id} index={index}>
                      {providedDrag => (
                        <Box
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <Box {...providedDrag.dragHandleProps}>
                            <DragIndicator sx={{ color: "text.secondary", cursor: "grab" }} />
                          </Box>
                          <TextField
                            fullWidth
                            size="small"
                            label={`Question ${index + 1}`}
                            value={question.text}
                            onChange={e => handleQuestionChange(question.id, e.target.value)}
                            placeholder="Enter your question..."
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveQuestion(question.id)}
                            disabled={questions.length === 1}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Stack>
              )}
            </Droppable>
          </DragDropContext>

          <Button startIcon={<Add />} onClick={handleAddQuestion} variant="outlined" size="small">
            Add Question
          </Button>

          <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <FormControlLabel
              control={<Checkbox checked={includeGoals} onChange={e => setIncludeGoals(e.target.checked)} />}
              label="Include goal reflection"
            />
            {includeGoals && (
              <TextField
                fullWidth
                size="small"
                label="Goal reflection question"
                value={goalQuestion}
                onChange={e => setGoalQuestion(e.target.value)}
                placeholder="How did you progress on your goals?"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={questions.every(q => !q.text.trim())}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

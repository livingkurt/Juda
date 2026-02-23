"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, TextField, Stack, IconButton, Collapse, Autocomplete } from "@mui/material";
import { Add, ExpandMore, ChevronRight, MoreVert } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { TaskContextMenu } from "./TaskContextMenu";
import { ReflectionEntry } from "./ReflectionEntry";
import { clearJournalScrollTarget } from "@/lib/store/slices/uiSlice";
import dayjs from "dayjs";

export const JournalDayEntry = ({ task, date, completion, isCurrentYear, onSave, viewType = "day" }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const isReflectionTask = task.completionType === "reflection";
  const isSelectionTask = task.completionType === "selection";

  // Get scroll target from Redux
  const scrollToTaskId = useSelector(state => state.ui.journalScrollToTaskId);
  const scrollToGoalId = useSelector(state => state.ui.journalScrollToGoalId);

  // Initialize state from props - state will reset when key changes (completion note changes)
  const currentNote = completion?.note || "";
  // For selection tasks, parse selectedOptions array; for others, use note
  const selectionValuesFromCompletion = useMemo(() => {
    if (isSelectionTask && completion?.selectedOptions && Array.isArray(completion.selectedOptions)) {
      return completion.selectedOptions;
    }
    if (isSelectionTask && currentNote && currentNote.trim()) {
      // Backward compatibility: if note exists but no selectedOptions, treat as single selection
      return [currentNote.trim()];
    }
    return [];
  }, [isSelectionTask, completion?.selectedOptions, currentNote]);

  const [noteInput, setNoteInput] = useState(currentNote);
  const [prevCurrentNote, setPrevCurrentNote] = useState(currentNote);
  const [selectedValues, setSelectedValues] = useState(selectionValuesFromCompletion);
  const [prevSelectedOptions, setPrevSelectedOptions] = useState(completion?.selectedOptions);
  const [showTextarea, setShowTextarea] = useState(Boolean(currentNote));
  const [isFocused, setIsFocused] = useState(false);
  // For selection tasks, check if there are selected values; for others, check note
  const hasEntry = isSelectionTask ? selectedValues.length > 0 : currentNote && currentNote.trim().length > 0;

  // Get selection options from task
  const selectionOptions = useMemo(() => {
    if (!isSelectionTask || !task.selectionData?.options) return [];
    return task.selectionData.options.filter(opt => opt && opt.trim() !== "");
  }, [isSelectionTask, task.selectionData]);

  // Check task type by tags
  const taskType = useMemo(() => {
    const tagNames = (task.tags || []).map(t => (t.name || "").toLowerCase());
    if (tagNames.includes("daily journal")) return "daily";
    if (tagNames.includes("weekly reflection")) return "weekly";
    if (tagNames.includes("monthly reflection")) return "monthly";
    if (tagNames.includes("yearly reflection")) return "yearly";
    return "other";
  }, [task.tags]);

  // Determine default expansion based on view type and task type
  const defaultExpanded = useMemo(() => {
    if (viewType === "day") {
      // Day view: expand daily journals if they have entries
      return taskType === "daily" && hasEntry;
    }
    if (viewType === "week") {
      // Week view: expand weekly reflections if they have entries
      return taskType === "weekly" && hasEntry;
    }
    if (viewType === "month") {
      // Month view: expand monthly reflections if they have entries
      return taskType === "monthly" && hasEntry;
    }
    if (viewType === "year") {
      // Year view: expand yearly reflections if they have entries
      return taskType === "yearly" && hasEntry;
    }
    return false;
  }, [viewType, taskType, hasEntry]);

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [prevDefaultExpanded, setPrevDefaultExpanded] = useState(defaultExpanded);
  const [userToggled, setUserToggled] = useState(false);
  const [prevScrollToTaskId, setPrevScrollToTaskId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Update expansion state when defaultExpanded changes (but only if user hasn't manually toggled)
  // Use "adjusting state during render" pattern
  if (prevDefaultExpanded !== defaultExpanded && !userToggled) {
    setPrevDefaultExpanded(defaultExpanded);
    setExpanded(defaultExpanded);
  }

  // Handle scroll target expansion during render
  if (scrollToTaskId === task.id && scrollToGoalId && prevScrollToTaskId !== scrollToTaskId) {
    setPrevScrollToTaskId(scrollToTaskId);
    setExpanded(true);
    setUserToggled(true);
  }

  // Handle scroll target - scroll to goal after expansion
  // This effect only handles DOM manipulation (scrolling), not state updates
  useEffect(() => {
    if (scrollToTaskId === task.id && scrollToGoalId && expanded) {
      // Wait for expansion animation and ReflectionEntry to render, then scroll
      const scrollTimeout = setTimeout(() => {
        const goalElement = document.getElementById(`goal-progress-${scrollToGoalId}`);
        if (goalElement) {
          goalElement.scrollIntoView({ behavior: "smooth", block: "center" });
          // Clear the scroll target after scrolling
          dispatch(clearJournalScrollTarget());
        }
      }, 500); // Longer delay to ensure Collapse animation completes

      return () => {
        clearTimeout(scrollTimeout);
      };
    }
  }, [scrollToTaskId, scrollToGoalId, task.id, dispatch, expanded]);

  // Save function wrapper with error handling
  const saveNote = useCallback(
    async value => {
      if (isSelectionTask) {
        // For selection tasks, value is an array
        const valuesArray = Array.isArray(value) ? value : [];
        const currentArray = selectionValuesFromCompletion;
        // Only save if changed
        if (JSON.stringify(valuesArray) !== JSON.stringify(currentArray)) {
          try {
            await onSave(task.id, date, valuesArray);
          } catch (error) {
            console.error("Failed to save journal entry:", error);
            // Reset to original values on error
            setSelectedValues(selectionValuesFromCompletion);
          }
        }
      } else {
        // For text tasks, value is a string
        const valueStr = typeof value === "string" ? value : value || "";
        if (isCurrentYear && valueStr.trim() && valueStr.trim() !== (completion?.note || "")) {
          try {
            await onSave(task.id, date, valueStr.trim());
          } catch (error) {
            console.error("Failed to save journal entry:", error);
            // Reset to original note on error
            setNoteInput(completion?.note || "");
          }
        } else if (isCurrentYear && !valueStr && completion?.note) {
          // Clear selection
          try {
            await onSave(task.id, date, "");
          } catch (error) {
            console.error("Failed to save journal entry:", error);
            setNoteInput(completion?.note || "");
          }
        }
      }
    },
    [isCurrentYear, isSelectionTask, task.id, date, completion?.note, onSave, selectionValuesFromCompletion]
  );

  const { debouncedSave, immediateSave } = useDebouncedSave(saveNote, 300);

  // Sync with saved data when it changes externally (not during typing)
  // Use "adjusting state during render" pattern
  if (isSelectionTask) {
    const currentSelectedOptions = completion?.selectedOptions || [];
    if (JSON.stringify(prevSelectedOptions) !== JSON.stringify(currentSelectedOptions) && !isFocused) {
      setPrevSelectedOptions(currentSelectedOptions);
      setSelectedValues(selectionValuesFromCompletion);
    }
  } else {
    if (prevCurrentNote !== currentNote && !isFocused) {
      setPrevCurrentNote(currentNote);
      setNoteInput(currentNote);
    }
  }

  const handleChange = e => {
    const newValue = e.target.value;
    setNoteInput(newValue);
    // Ensure expanded when typing
    if (!expanded) {
      setExpanded(true);
    }
    debouncedSave(newValue);
  };

  const handleSelectionChange = (event, newValues) => {
    const valuesArray = Array.isArray(newValues) ? newValues : [];
    setSelectedValues(valuesArray);
    immediateSave(valuesArray);
  };

  const handleBlur = async () => {
    // Clear focus tracking on intentional blur
    setIsFocused(false);

    // Save immediately on blur if there are changes
    if (isSelectionTask) {
      await immediateSave(selectedValues);
      setPrevSelectedOptions(completion?.selectedOptions);
      // Reset to saved values if cleared
      if (selectedValues.length === 0 && completion?.selectedOptions && completion.selectedOptions.length > 0) {
        setSelectedValues(selectionValuesFromCompletion);
      }
    } else {
      await immediateSave(noteInput);
      // Update state to track current note
      setPrevCurrentNote(currentNote);

      // Reset to saved note if cleared
      if (!noteInput.trim() && completion?.note) {
        setNoteInput(completion?.note);
      }
    }
  };

  const handleAddEntry = () => {
    if (!isSelectionTask) {
      setShowTextarea(true);
    }
    setExpanded(true);
    // Delay focus to allow collapsible animation to complete
    // Use longer delay on mobile to prevent scroll jumping
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    setTimeout(
      () => {
        if (isSelectionTask && autocompleteRef.current) {
          setIsFocused(true);
          autocompleteRef.current.focus();
          // Smooth scroll into view after focus
          if (isMobile) {
            autocompleteRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else if (textareaRef.current) {
          setIsFocused(true);
          textareaRef.current.focus({ preventScroll: true });
          // Smooth scroll into view after focus
          if (isMobile) {
            textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      },
      isMobile ? 300 : 10
    );
  };

  const handleToggleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    setUserToggled(true);
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

  // Check if task existed in this year (simplified - assumes task exists if it's recurring or created before year end)
  const taskExistedThisYear = true; // For now, assume all journal tasks exist in all years

  if (!taskExistedThisYear) {
    return null; // Don't show if task didn't exist this year
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
        {/* Header with title and expand/collapse button */}
        <Stack direction="row" spacing={2} alignItems="center">
          {isCurrentYear && !hasEntry && !isSelectionTask ? (
            <IconButton
              onClick={e => {
                e.stopPropagation();
                handleAddEntry();
              }}
              onMouseDown={e => e.stopPropagation()}
              size="small"
              aria-label="Add Entry"
              sx={{
                minWidth: { xs: "24px", md: "32px" },
                height: { xs: "24px", md: "32px" },
                p: { xs: 0, md: 1 },
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          ) : (
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
          )}
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
          {isReflectionTask ? (
            // Render ReflectionEntry for reflection tasks
            <Box sx={{ mt: 2 }}>
              <ReflectionEntry
                task={task}
                date={date}
                existingCompletion={completion}
                onSave={async (taskId, noteJson) => {
                  // onSave signature from JournalTab: (taskId, date, note)
                  const dateStr = typeof date === "string" ? date : dayjs(date).format("YYYY-MM-DD");
                  await onSave(taskId, dateStr, noteJson);
                }}
                compact={true}
              />
            </Box>
          ) : isSelectionTask ? (
            // Render multi-select Autocomplete for selection tasks
            isCurrentYear ? (
              <Box sx={{ mt: 2 }}>
                <Autocomplete
                  multiple
                  options={selectionOptions}
                  value={selectedValues}
                  onChange={handleSelectionChange}
                  onFocus={() => {
                    setIsFocused(true);
                    if (!expanded) {
                      setExpanded(true);
                    }
                  }}
                  onBlur={handleBlur}
                  size="small"
                  renderInput={params => (
                    <TextField
                      {...params}
                      variant="filled"
                      placeholder="Select options..."
                      inputRef={autocompleteRef}
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    />
                  )}
                  onKeyDown={e => {
                    e.stopPropagation();
                  }}
                  fullWidth
                />
              </Box>
            ) : (
              <>
                {hasEntry ? (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      color: "text.secondary",
                      mt: 2,
                      fontSize: { xs: "0.75rem", md: "0.875rem" },
                    }}
                  >
                    {selectedValues.length > 0 ? selectedValues.join(", ") : completion?.note || ""}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", mt: 2 }}>
                    No entry for this day
                  </Typography>
                )}
              </>
            )
          ) : isCurrentYear ? (
            <>
              {showTextarea ? (
                <TextField
                  inputRef={textareaRef}
                  value={noteInput}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={() => {
                    // Track that textarea is focused
                    setIsFocused(true);
                    // Ensure expanded when focused
                    if (!expanded) {
                      setExpanded(true);
                    }
                  }}
                  sx={{ mt: 2 }}
                  placeholder="Enter your journal entry..."
                  size="small"
                  multiline
                  variant="filled"
                  fullWidth
                />
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                  No entry for this day
                </Typography>
              )}
            </>
          ) : (
            <>
              {hasEntry ? (
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    color: "text.secondary",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {completion.note}
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                  No entry for this day
                </Typography>
              )}
            </>
          )}
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

"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Box, Typography, TextField, Stack, IconButton, Collapse } from "@mui/material";
import { Add, ExpandMore, ChevronRight } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";

export const JournalDayEntry = ({ task, date, completion, isCurrentYear, onSave }) => {
  const theme = useTheme();
  // Initialize state from props - state will reset when key changes (completion note changes)
  const currentNote = completion?.note || "";
  const [noteInput, setNoteInput] = useState(currentNote);
  const [showTextarea, setShowTextarea] = useState(Boolean(currentNote));
  const hasEntry = currentNote && currentNote.trim().length > 0;

  // Check if this is a Daily Journal (not a reflection type)
  const isDailyJournal = useMemo(() => {
    const tagNames = (task.tags || []).map(t => (t.name || "").toLowerCase());
    return tagNames.includes("daily journal");
  }, [task.tags]);

  // Expanded by default only for Daily Journal if there's an entry, collapsed for all reflection types
  const [expanded, setExpanded] = useState(isDailyJournal && hasEntry);
  // Track if user manually expanded it - prevents auto-collapse on blur/re-render
  const [userExpanded, setUserExpanded] = useState(false);
  const textareaRef = useRef(null);
  // Track if textarea is focused to restore focus after re-renders
  const wasFocusedRef = useRef(false);

  // Save function wrapper with error handling
  const saveNote = useCallback(
    async value => {
      if (isCurrentYear && value.trim() && value.trim() !== (completion?.note || "")) {
        try {
          await onSave(task.id, date, value.trim());
        } catch (error) {
          console.error("Failed to save journal entry:", error);
          // Reset to original note on error
          setNoteInput(completion?.note || "");
        }
      }
    },
    [isCurrentYear, task.id, date, completion?.note, onSave]
  );

  const { debouncedSave, immediateSave, isSaving, justSaved } = useDebouncedSave(saveNote, 500);

  // Restore focus after re-renders caused by autosave state changes
  useEffect(() => {
    // Only restore focus if:
    // 1. The textarea was previously focused
    // 2. We're not currently saving (to avoid interrupting user)
    // 3. The textarea ref exists
    // 4. The textarea is not currently focused (lost focus due to re-render)
    if (wasFocusedRef.current && !isSaving && textareaRef.current && document.activeElement !== textareaRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (textareaRef.current && wasFocusedRef.current) {
          textareaRef.current.focus({ preventScroll: true });
        }
      });
    }
  }, [justSaved, isSaving]);

  const handleChange = e => {
    const newValue = e.target.value;
    setNoteInput(newValue);
    // Mark as user-expanded when they start typing
    if (!userExpanded && newValue.trim()) {
      setUserExpanded(true);
      setExpanded(true);
    }
    debouncedSave(newValue);
  };

  const handleBlur = async () => {
    // Clear focus tracking on intentional blur
    wasFocusedRef.current = false;

    // Save immediately on blur if there are changes
    await immediateSave(noteInput);

    // Reset to saved note if cleared
    if (!noteInput.trim() && completion?.note) {
      setNoteInput(completion?.note);
    }
  };

  const handleAddEntry = () => {
    setShowTextarea(true);
    setExpanded(true);
    setUserExpanded(true); // Mark as user-expanded so it won't auto-collapse
    // Delay focus to allow collapsible animation to complete
    // Use longer delay on mobile to prevent scroll jumping
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    setTimeout(
      () => {
        if (textareaRef.current) {
          wasFocusedRef.current = true;
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
    // If collapsing, clear the user-expanded flag so it can auto-expand again if needed
    if (!newExpanded) {
      setUserExpanded(false);
    } else {
      // If expanding, mark as user-expanded
      setUserExpanded(true);
    }
  };

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
        p: { xs: 3, md: 4 },
        mb: { xs: 3, md: 4 },
        opacity: isCurrentYear ? 1 : 0.7,
        pb: 0.5,
        position: "relative",
      }}
    >
      <Stack spacing={{ xs: 2, md: 3 }}>
        {/* Header with title and expand/collapse button */}
        <Stack direction="row" spacing={2} alignItems="center">
          {isCurrentYear && !hasEntry ? (
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
        </Stack>

        {/* Collapsible content */}
        <Collapse in={expanded}>
          {isCurrentYear ? (
            <>
              {showTextarea ? (
                <TextField
                  inputRef={textareaRef}
                  value={noteInput}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={() => {
                    // Track that textarea is focused
                    wasFocusedRef.current = true;
                    // Mark as user-expanded when focused
                    if (!userExpanded) {
                      setUserExpanded(true);
                      setExpanded(true);
                    }
                  }}
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
    </Box>
  );
};

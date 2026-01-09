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
  const [expanded, setExpanded] = useState(() => isDailyJournal && hasEntry);
  const textareaRef = useRef(null);
  // Track if textarea is focused
  const isFocusedRef = useRef(false);
  // Track previous saved note to detect external changes
  const prevSavedNoteRef = useRef(currentNote);

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

  const { debouncedSave, immediateSave } = useDebouncedSave(saveNote, 500);

  // Sync with savedNote when it changes externally (not during typing)
  useEffect(() => {
    if (prevSavedNoteRef.current !== currentNote && !isFocusedRef.current) {
      prevSavedNoteRef.current = currentNote;
      // Defer update to avoid synchronous setState
      const timeoutId = setTimeout(() => {
        setNoteInput(currentNote);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [currentNote]);

  const handleChange = e => {
    const newValue = e.target.value;
    setNoteInput(newValue);
    // Ensure expanded when typing
    if (!expanded) {
      setExpanded(true);
    }
    debouncedSave(newValue);
  };

  const handleBlur = async () => {
    // Clear focus tracking on intentional blur
    isFocusedRef.current = false;

    // Save immediately on blur if there are changes
    await immediateSave(noteInput);

    // Update ref to current note
    prevSavedNoteRef.current = currentNote;

    // Reset to saved note if cleared
    if (!noteInput.trim() && completion?.note) {
      setNoteInput(completion?.note);
    }
  };

  const handleAddEntry = () => {
    setShowTextarea(true);
    setExpanded(true);
    // Delay focus to allow collapsible animation to complete
    // Use longer delay on mobile to prevent scroll jumping
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    setTimeout(
      () => {
        if (textareaRef.current) {
          isFocusedRef.current = true;
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
        p: { xs: 3, md: 3 },
        opacity: isCurrentYear ? 1 : 0.7,
        position: "relative",
      }}
    >
      <Stack spacing={0}>
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
                    isFocusedRef.current = true;
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
    </Box>
  );
};

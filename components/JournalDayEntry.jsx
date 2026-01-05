"use client";

import { useState, useRef, useMemo } from "react";
import { Box, Typography, TextField, Stack, IconButton, Collapse } from "@mui/material";
import { Add, ExpandMore, ChevronRight } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

export const JournalDayEntry = ({ task, date, year: _year, completion, isCurrentYear, onSave }) => {
  const theme = useTheme();
  // Initialize state from props - component will remount when completion changes (via key prop)
  const [noteInput, setNoteInput] = useState(completion?.note || "");
  const [showTextarea, setShowTextarea] = useState(Boolean(completion?.note));
  const hasEntry = completion?.note && completion.note.trim().length > 0;

  // Check if this is a Daily Journal (not a reflection type)
  const isDailyJournal = useMemo(() => {
    const tagNames = (task.tags || []).map(t => (t.name || "").toLowerCase());
    return tagNames.includes("daily journal");
  }, [task.tags]);

  // Expanded by default only for Daily Journal if there's an entry, collapsed for all reflection types
  const [expanded, setExpanded] = useState(isDailyJournal && hasEntry);
  const textareaRef = useRef(null);

  const handleBlur = async () => {
    if (isCurrentYear && noteInput.trim() && noteInput.trim() !== (completion?.note || "")) {
      try {
        await onSave(task.id, date, noteInput.trim());
      } catch (error) {
        console.error("Failed to save journal entry:", error);
        // Reset to original note on error
        setNoteInput(completion?.note || "");
        // You could also show a toast notification here if you have a toast system
      }
    } else if (!noteInput.trim() && completion?.note) {
      // Reset to saved note if cleared
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
        textareaRef.current?.focus({ preventScroll: true });
        // Smooth scroll into view after focus
        if (isMobile) {
          textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      isMobile ? 300 : 10
    );
  };

  const handleToggleExpand = () => {
    setExpanded(prev => !prev);
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
                  onChange={e => setNoteInput(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Enter your journal entry..."
                  size="small"
                  multiline
                  rows={4}
                  variant="filled"
                  fullWidth
                  sx={{
                    "& .MuiFilledInput-root": {
                      bgcolor: "action.hover",
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      "&.Mui-focused": {
                        bgcolor: "background.paper",
                      },
                    },
                    minHeight: { xs: "120px", md: "80px" },
                    maxHeight: { xs: "400px", md: "600px" },
                    scrollMarginTop: "100px",
                  }}
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
                  sx={{
                    color: "text.secondary",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
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

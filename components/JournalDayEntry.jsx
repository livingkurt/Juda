"use client";

import { useState, useRef, useMemo } from "react";
import { Box, Text, Textarea, Stack, Group, ActionIcon, Collapse } from "@mantine/core";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const JournalDayEntry = ({ task, date, year: _year, completion, isCurrentYear, onSave }) => {
  const { mode } = useSemanticColors();
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

  const handleBlur = () => {
    if (isCurrentYear && noteInput.trim() && noteInput.trim() !== (completion?.note || "")) {
      onSave(task.id, date, noteInput.trim());
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

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const dimmedText = mode.text.muted;

  // Check if task existed in this year (simplified - assumes task exists if it's recurring or created before year end)
  const taskExistedThisYear = true; // For now, assume all journal tasks exist in all years

  if (!taskExistedThisYear) {
    return null; // Don't show if task didn't exist this year
  }

  return (
    <Box
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        borderWidth: "1px",
        borderColor: borderColor,
        borderStyle: "solid",
        background: bgColor,
        padding: 16,
        marginBottom: 16,
        opacity: isCurrentYear ? 1 : 0.7,
        paddingBottom: 2,
      }}
    >
      <Stack align="stretch" gap={[8, 12]}>
        {/* Header with title and expand/collapse button */}
        <Group gap={8} align="center">
          {isCurrentYear && !hasEntry ? (
            <ActionIcon
              onClick={e => {
                e.stopPropagation();
                handleAddEntry();
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size={["xs", "sm"]}
              variant="subtle"
              aria-label="Add Entry"
              style={{ minWidth: 24, height: 24, padding: 0 }}
            >
              <Plus size={14} stroke="currentColor" />
            </ActionIcon>
          ) : (
            <ActionIcon
              onClick={e => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size={["xs", "sm"]}
              variant="subtle"
              aria-label="Toggle expand"
              style={{ minWidth: 24, height: 24, padding: 0 }}
            >
              {expanded ? (
                <ChevronDown size={14} stroke="currentColor" />
              ) : (
                <ChevronRight size={14} stroke="currentColor" />
              )}
            </ActionIcon>
          )}
          <Text
            size={["md", "lg"]}
            fw={500}
            c={isCurrentYear ? textColor : dimmedText}
            style={{ flex: 1, cursor: "pointer" }}
            onClick={handleToggleExpand}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = "0.8";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {task.title}
          </Text>
        </Group>

        {/* Collapsible content */}
        <Collapse in={expanded}>
          {isCurrentYear ? (
            <>
              {showTextarea ? (
                <Textarea
                  ref={textareaRef}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Enter your journal entry..."
                  size="sm"
                  variant="filled"
                  resize="vertical"
                  styles={{
                    input: {
                      lineHeight: 1.6,
                      minHeight: 120,
                      maxHeight: 400,
                      backgroundColor: mode.bg.muted,
                      color: textColor,
                      scrollMarginTop: "100px",
                      "@media (min-width: 768px)": {
                        lineHeight: 1.4,
                        minHeight: 80,
                        maxHeight: 600,
                      },
                      "&:focus": {
                        backgroundColor: mode.bg.surface,
                        borderColor: mode.border.focus,
                      },
                    },
                  }}
                />
              ) : (
                <Text size="xs" c={dimmedText} style={{ fontStyle: "italic" }}>
                  No entry for this day
                </Text>
              )}
            </>
          ) : (
            <>
              {hasEntry ? (
                <Text size={["xs", "sm"]} c={dimmedText} style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {completion.note}
                </Text>
              ) : (
                <Text size="xs" c={dimmedText} style={{ fontStyle: "italic" }}>
                  No entry for this day
                </Text>
              )}
            </>
          )}
        </Collapse>
      </Stack>
    </Box>
  );
};

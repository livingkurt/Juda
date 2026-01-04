"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Text, Textarea, VStack, HStack, IconButton } from "@chakra-ui/react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Collapse } from "./Collapse";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const JournalDayEntry = ({
  task,
  date,
  year: _year,
  completion,
  isCurrentYear,
  journalType = "daily", // "yearly" | "monthly" | "weekly" | "daily"
  onSave,
}) => {
  const { mode } = useSemanticColors();
  // Initialize state from props - component will remount when completion changes (via key prop)
  const [noteInput, setNoteInput] = useState(completion?.note || "");
  const [showTextarea, setShowTextarea] = useState(Boolean(completion?.note));
  const hasEntry = completion?.note && completion.note.trim().length > 0;
  // Expanded by default if there's an entry, collapsed if not
  const [expanded, setExpanded] = useState(hasEntry);
  const textareaRef = useRef(null);

  // Auto-expand textarea on mount and when content changes - show all text
  useEffect(() => {
    if (textareaRef.current && showTextarea) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [noteInput, showTextarea]);

  // Auto-expand textarea - show all text
  const handleInput = e => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

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
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleToggleExpand = () => {
    setExpanded(prev => !prev);
  };

  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const dimmedText = mode.text.muted;

  // Optional: Color accent based on journal type
  const getAccentColor = type => {
    switch (type) {
      case "yearly":
        return "yellow.500";
      case "monthly":
        return "blue.500";
      case "weekly":
        return "purple.500";
      case "daily":
      default:
        return "transparent";
    }
  };

  const accentColor = getAccentColor(journalType);
  const showAccent = journalType !== "daily";

  // Check if task existed in this year (simplified - assumes task exists if it's recurring or created before year end)
  const taskExistedThisYear = true; // For now, assume all journal tasks exist in all years

  if (!taskExistedThisYear) {
    return null; // Don't show if task didn't exist this year
  }

  return (
    <Box
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth={showAccent ? "4px" : "1px"}
      borderLeftColor={showAccent ? accentColor : borderColor}
      bg={bgColor}
      p={{ base: 3, md: 4 }}
      mb={{ base: 3, md: 4 }}
      opacity={isCurrentYear ? 1 : 0.7}
      pb={{ base: 0.5, md: 0.5 }}
    >
      <VStack align="stretch" spacing={{ base: 2, md: 3 }}>
        {/* Header with title and expand/collapse button */}
        <HStack spacing={2} cursor="pointer" onClick={handleToggleExpand} _hover={{ opacity: 0.8 }} align="center">
          {isCurrentYear && !hasEntry ? (
            <IconButton
              onClick={e => {
                e.stopPropagation();
                handleAddEntry();
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size={{ base: "xs", md: "sm" }}
              variant="ghost"
              aria-label="Add Entry"
              minW={{ base: "24px", md: "32px" }}
              h={{ base: "24px", md: "32px" }}
              p={{ base: 0, md: 1 }}
            >
              <Box as="span" color="currentColor">
                <Plus size={14} stroke="currentColor" />
              </Box>
            </IconButton>
          ) : (
            <IconButton
              onClick={e => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              onMouseDown={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              size={{ base: "xs", md: "sm" }}
              variant="ghost"
              aria-label="Toggle expand"
              minW={{ base: "24px", md: "32px" }}
              h={{ base: "24px", md: "32px" }}
              p={{ base: 0, md: 1 }}
            >
              <Box as="span" color="currentColor">
                {expanded ? (
                  <ChevronDown size={14} stroke="currentColor" />
                ) : (
                  <ChevronRight size={14} stroke="currentColor" />
                )}
              </Box>
            </IconButton>
          )}
          <Text
            fontSize={{ base: "md", md: "lg" }}
            fontWeight="medium"
            color={isCurrentYear ? textColor : dimmedText}
            flex={1}
          >
            {task.title}
          </Text>
        </HStack>

        {/* Collapsible content */}
        <Collapse in={expanded}>
          {isCurrentYear ? (
            <>
              {showTextarea ? (
                <Textarea
                  ref={textareaRef}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onInput={handleInput}
                  onBlur={handleBlur}
                  placeholder="Enter your journal entry..."
                  size="sm"
                  lineHeight={{ base: "1.6", md: "1.4" }}
                  variant="filled"
                  resize="none"
                  overflow="visible"
                  rows={1}
                  bg={mode.bg.muted}
                  color={textColor}
                  _focus={{
                    bg: mode.bg.surface,
                    borderColor: mode.border.focus,
                  }}
                />
              ) : (
                <Text fontSize="xs" color={dimmedText} fontStyle="italic">
                  No entry for this day
                </Text>
              )}
            </>
          ) : (
            <>
              {hasEntry ? (
                <Text fontSize={{ base: "xs", md: "sm" }} color={dimmedText} whiteSpace="pre-wrap" lineHeight="1.6">
                  {completion.note}
                </Text>
              ) : (
                <Text fontSize="xs" color={dimmedText} fontStyle="italic">
                  No entry for this day
                </Text>
              )}
            </>
          )}
        </Collapse>
      </VStack>
    </Box>
  );
};

"use client";

import { useState, useRef, useMemo } from "react";
import { Box, Text, Textarea, VStack, HStack, IconButton, Collapsible } from "@chakra-ui/react";
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
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      borderLeftWidth={"1px"}
      borderLeftColor={borderColor}
      bg={bgColor}
      p={{ base: 3, md: 4 }}
      mb={{ base: 3, md: 4 }}
      opacity={isCurrentYear ? 1 : 0.7}
      pb={{ base: 0.5, md: 0.5 }}
    >
      <VStack align="stretch" spacing={{ base: 2, md: 3 }}>
        {/* Header with title and expand/collapse button */}
        <HStack spacing={2} align="center">
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
            cursor="pointer"
            onClick={handleToggleExpand}
            _hover={{ opacity: 0.8 }}
          >
            {task.title}
          </Text>
        </HStack>

        {/* Collapsible content */}
        <Collapsible.Root open={expanded}>
          <Collapsible.Content>
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
                    lineHeight={{ base: "1.6", md: "1.4" }}
                    variant="filled"
                    resize="vertical"
                    minH={{ base: "120px", md: "80px" }}
                    maxH={{ base: "400px", md: "600px" }}
                    bg={mode.bg.muted}
                    color={textColor}
                    scrollMarginTop="100px"
                    css={{
                      fieldSizing: "content",
                      // Prevent scroll jumping on mobile
                      "@media (max-width: 768px)": {
                        fieldSizing: "initial",
                      },
                    }}
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
          </Collapsible.Content>
        </Collapsible.Root>
      </VStack>
    </Box>
  );
};

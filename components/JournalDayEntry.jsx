"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Text, Textarea, Button, VStack } from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export const JournalDayEntry = ({ task, date, year, completion, isCurrentYear, onSave, onDelete }) => {
  const { mode } = useSemanticColors();
  const [noteInput, setNoteInput] = useState(completion?.note || "");
  const [showTextarea, setShowTextarea] = useState(!!completion?.note);
  const textareaRef = useRef(null);

  // Sync with external completion data
  useEffect(() => {
    setNoteInput(completion?.note || "");
    setShowTextarea(!!completion?.note);
  }, [completion?.note]);

  // Auto-expand textarea on mount and when content changes
  useEffect(() => {
    if (textareaRef.current && showTextarea) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [noteInput, showTextarea]);

  // Auto-expand textarea
  const handleInput = e => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleDelete = () => {
    if (completion) {
      onDelete(task.id, date);
    }
  };

  const hasEntry = completion?.note && completion.note.trim().length > 0;
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;
  const textColor = mode.text.primary;
  const mutedText = mode.text.secondary;
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
      bg={bgColor}
      p={4}
      mb={4}
      opacity={isCurrentYear ? 1 : 0.7}
    >
      <VStack align="stretch" spacing={3}>
        <Text fontSize="sm" fontWeight="medium" color={isCurrentYear ? textColor : dimmedText}>
          {task.title}
        </Text>

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
                variant="filled"
                minH="40px"
                maxH="200px"
                resize="none"
                overflow="hidden"
                rows={1}
                bg={mode.bg.muted}
                color={textColor}
                _focus={{
                  bg: mode.bg.surface,
                  borderColor: mode.border.focus,
                }}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus size={14} />}
                onClick={handleAddEntry}
                alignSelf="flex-start"
              >
                Add Entry
              </Button>
            )}
          </>
        ) : (
          <>
            {hasEntry ? (
              <Text fontSize="sm" color={dimmedText} whiteSpace="pre-wrap">
                {completion.note}
              </Text>
            ) : (
              <Text fontSize="xs" color={dimmedText} fontStyle="italic">
                No entry for this day
              </Text>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
};


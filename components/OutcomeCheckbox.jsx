"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Checkbox, HStack, Text, Menu, Portal } from "@chakra-ui/react";
import { Check, X, Circle } from "lucide-react";
import { useSemanticColors } from "@/hooks/useSemanticColors";

/**
 * OutcomeCheckbox - Reusable multi-state checkbox component
 *
 * Behavior:
 * - First click: Marks as completed
 * - Click when completed: Opens menu with "Not Completed" and "Uncheck" options
 * - Click when not completed: Opens menu with "Completed" and "Uncheck" options
 *
 * States:
 * - null/unchecked: Empty checkbox
 * - "completed": Checked with checkmark
 * - "not_completed": Checkbox with X
 *
 * @param {string|null} outcome - Current outcome: null, "completed", or "not_completed"
 * @param {Function} onOutcomeChange - Callback when outcome changes: (newOutcome) => void
 * @param {boolean} isChecked - Whether checkbox appears checked (for completed state)
 * @param {boolean} disabled - Whether checkbox is disabled
 * @param {string} size - Checkbox size: "sm", "md", "lg"
 */
export const OutcomeCheckbox = ({ outcome, onOutcomeChange, isChecked = false, disabled = false, size = "md" }) => {
  const { mode } = useSemanticColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuJustOpenedRef = useRef(false);
  const previousOutcomeRef = useRef(outcome);

  // Determine if we should show the menu (when task has an outcome)
  const shouldShowMenu = outcome !== null;

  // Close menu when outcome changes, but not when menu first opens
  useEffect(() => {
    // If menu just opened, don't close it
    if (menuJustOpenedRef.current) {
      menuJustOpenedRef.current = false;
      return;
    }

    // Only close if outcome actually changed from a previous value
    if (menuOpen && previousOutcomeRef.current !== null && previousOutcomeRef.current !== outcome) {
      const timer = setTimeout(() => {
        setMenuOpen(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    // Update ref
    if (outcome !== null || previousOutcomeRef.current !== null) {
      previousOutcomeRef.current = outcome;
    }
  }, [outcome, menuOpen]);

  const handleCheckboxChange = () => {
    // If menu should show, don't toggle - menu will be opened by onClick
    if (shouldShowMenu) {
      return;
    }
    // First click - mark as completed
    onOutcomeChange("completed");
  };

  const handleClick = e => {
    e.stopPropagation();
    // If has outcome, open menu instead of toggling
    if (shouldShowMenu) {
      e.preventDefault();
      e.stopPropagation();
      menuJustOpenedRef.current = true;
      setMenuOpen(true);
    }
  };

  const handleMouseDown = e => {
    e.stopPropagation();
    // Prevent default checkbox behavior when we want to show menu
    if (shouldShowMenu) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Box position="relative">
      <Menu.Root
        open={menuOpen}
        onOpenChange={({ open }) => setMenuOpen(open)}
        isLazy
        placement="right-start"
        closeOnSelect
        closeOnInteractOutside
      >
        <Menu.Trigger asChild>
          <Box
            as="span"
            display="inline-block"
            border="none"
            outline="none"
            boxShadow="none"
            bg="transparent"
            p={0}
            m={0}
            _focus={{ border: "none", outline: "none", boxShadow: "none" }}
            _focusVisible={{ border: "none", outline: "none", boxShadow: "none" }}
          >
            <Checkbox.Root
              checked={outcome === "completed" || (outcome === null && isChecked)}
              size={size}
              disabled={disabled}
              onCheckedChange={handleCheckboxChange}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onPointerDown={e => e.stopPropagation()}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control
                bg={outcome === "not_completed" ? "white" : undefined}
                boxShadow="none"
                outline="none"
                _focus={{ boxShadow: "none", outline: "none" }}
                _focusVisible={{ boxShadow: "none", outline: "none" }}
              >
                {outcome === "completed" ? (
                  <Checkbox.Indicator>
                    <Check size={14} />
                  </Checkbox.Indicator>
                ) : outcome === "not_completed" ? (
                  <Box as="span" display="flex" alignItems="center" justifyContent="center" w="100%" h="100%">
                    <Box as="span" color={mode.text.muted}>
                      <X size={18} stroke="currentColor" style={{ strokeWidth: 3 }} />
                    </Box>
                  </Box>
                ) : null}
              </Checkbox.Control>
            </Checkbox.Root>
          </Box>
        </Menu.Trigger>
        {shouldShowMenu && (
          <Portal>
            <Menu.Positioner style={{ zIndex: 99999 }}>
              <Menu.Content>
                {/* Only show Uncheck if task has an outcome */}
                {outcome !== null && (
                  <>
                    <Menu.Item
                      onClick={e => {
                        e.stopPropagation();
                        onOutcomeChange(null);
                      }}
                    >
                      <HStack>
                        <Circle size={14} />
                        <Text>Uncheck</Text>
                      </HStack>
                    </Menu.Item>
                    <Menu.Separator />
                  </>
                )}
                {/* Only show Completed if not already completed */}
                {outcome !== "completed" && (
                  <Menu.Item
                    onClick={e => {
                      e.stopPropagation();
                      onOutcomeChange("completed");
                    }}
                  >
                    <HStack>
                      <Check size={14} />
                      <Text>Completed</Text>
                    </HStack>
                  </Menu.Item>
                )}
                {/* Only show Not Completed if not already not completed */}
                {outcome !== "not_completed" && (
                  <Menu.Item
                    onClick={e => {
                      e.stopPropagation();
                      onOutcomeChange("not_completed");
                    }}
                  >
                    <HStack>
                      <X size={14} />
                      <Text>Not Completed</Text>
                    </HStack>
                  </Menu.Item>
                )}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        )}
      </Menu.Root>
    </Box>
  );
};

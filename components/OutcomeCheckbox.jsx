"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Checkbox, Stack, Typography, Menu, MenuItem, Divider } from "@mui/material";
import { Check, Close, RadioButtonUnchecked } from "@mui/icons-material";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
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
        setAnchorEl(null);
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
      setAnchorEl(e.currentTarget);
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

  const handleMenuClose = () => {
    setMenuOpen(false);
    setAnchorEl(null);
  };

  const checkboxSize = size === "sm" ? "small" : size === "lg" ? "medium" : "medium";

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <Checkbox
        checked={outcome !== null || isChecked}
        size={checkboxSize}
        disabled={disabled}
        onChange={handleCheckboxChange}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onPointerDown={e => e.stopPropagation()}
        checkedIcon={
          outcome === "completed" ? (
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "2px",
                border: "2px solid #a0aec0",
                m: 0.5,
                bgcolor: "#a0aec0",
              }}
            >
              <Check sx={{ color: "black", fontSize: "14px", mb: 0.5 }} />
            </Box>
          ) : outcome === "not_completed" ? (
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "2px",
                border: "2px solid #a0aec0",
                m: 0.5,
                bgcolor: "#a0aec0",
              }}
            >
              <Close sx={{ color: "black", fontSize: "14px", mb: 0.5 }} />
            </Box>
          ) : undefined
        }
      />
      {shouldShowMenu && (
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          sx={{ zIndex: 99999 }}
        >
          {/* Only show Uncheck if task has an outcome */}
          {outcome !== null && [
            <MenuItem
              key="uncheck"
              onClick={e => {
                e.stopPropagation();
                onOutcomeChange(null);
                handleMenuClose();
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <RadioButtonUnchecked fontSize="small" />
                <Typography variant="body2">Uncheck</Typography>
              </Stack>
            </MenuItem>,
            <Divider key="divider-uncheck" />,
          ]}
          {/* Only show Completed if not already completed */}
          {outcome !== "completed" && (
            <MenuItem
              onClick={e => {
                e.stopPropagation();
                onOutcomeChange("completed");
                handleMenuClose();
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Check fontSize="small" />
                <Typography variant="body2">Completed</Typography>
              </Stack>
            </MenuItem>
          )}
          {/* Only show Not Completed if not already not completed */}
          {outcome !== "not_completed" && (
            <MenuItem
              onClick={e => {
                e.stopPropagation();
                onOutcomeChange("not_completed");
                handleMenuClose();
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Close fontSize="small" />
                <Typography variant="body2">Not Completed</Typography>
              </Stack>
            </MenuItem>
          )}
        </Menu>
      )}
    </Box>
  );
};

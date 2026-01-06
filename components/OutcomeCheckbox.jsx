"use client";

import { useState, useRef, useEffect } from "react";
import { Box, Checkbox, Stack, Typography, Menu, MenuItem, Divider } from "@mui/material";
import { Check, Close, RadioButtonUnchecked, SkipNext } from "@mui/icons-material";

/**
 * Get size configuration based on size prop
 * @param {string} size - Size prop: "sm", "md", "lg", "xl"
 * @returns {Object} Size configuration object
 */
const getSizeConfig = size => {
  switch (size) {
    case "sm":
      return {
        muiSize: "small",
        containerSize: 20,
        iconBoxSize: 18,
        iconFontSize: "12px",
        borderRadius: "2px",
      };
    case "lg":
      return {
        muiSize: "large",
        containerSize: 34,
        iconBoxSize: 28,
        iconFontSize: "20px",
        borderRadius: "4px",
      };
    case "xl":
      return {
        muiSize: "large",
        containerSize: 40,
        iconBoxSize: 36,
        iconFontSize: "22px",
        borderRadius: "5px",
      };
    case "md":
    default:
      return {
        muiSize: "medium",
        containerSize: 24,
        iconBoxSize: 20,
        iconFontSize: "14px",
        borderRadius: "3px",
      };
  }
};

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
 * - "rolled_over": Checkbox with skip icon
 *
 * @param {string|null} outcome - Current outcome: null, "completed", "not_completed", or "rolled_over"
 * @param {Function} onOutcomeChange - Callback when outcome changes: (newOutcome) => void
 * @param {boolean} isChecked - Whether checkbox appears checked (for completed state)
 * @param {boolean} disabled - Whether checkbox is disabled
 * @param {string} size - Checkbox size: "sm", "md", "lg", "xl" (default: "md")
 * @param {boolean} isRecurring - Whether the task is recurring (for showing rollover option)
 * @param {Date} viewDate - The date being viewed (for rollover)
 * @param {Function} onRollover - Callback when rollover is requested: (taskId, date) => void
 * @param {string} taskId - Task ID (for rollover)
 */
export const OutcomeCheckbox = ({
  outcome,
  onOutcomeChange,
  isChecked = false,
  disabled = false,
  size = "md",
  isRecurring = false,
  viewDate,
  onRollover,
  taskId,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuJustOpenedRef = useRef(false);
  const previousOutcomeRef = useRef(outcome);

  const sizeConfig = getSizeConfig(size);

  // Determine if we should show the menu (when task has an outcome OR is recurring and can be rolled over)
  const shouldShowMenu = outcome !== null || (isRecurring && onRollover && taskId && viewDate);

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
    if (onOutcomeChange) {
      onOutcomeChange("completed");
    }
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

  const renderUncheckedIcon = () => {
    return (
      <Box
        sx={{
          width: sizeConfig.iconBoxSize,
          height: sizeConfig.iconBoxSize,
          borderRadius: sizeConfig.borderRadius,
          border: "3px solid #a0aec0",
          bgcolor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  };

  const renderCheckedIcon = () => {
    if (outcome === "completed") {
      return (
        <Box
          sx={{
            width: sizeConfig.iconBoxSize,
            height: sizeConfig.iconBoxSize,
            borderRadius: sizeConfig.borderRadius,
            border: "2px solid #a0aec0",
            bgcolor: "#a0aec0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check sx={{ color: "black", fontSize: sizeConfig.iconFontSize }} />
        </Box>
      );
    }

    if (outcome === "not_completed") {
      return (
        <Box
          sx={{
            width: sizeConfig.iconBoxSize,
            height: sizeConfig.iconBoxSize,
            borderRadius: sizeConfig.borderRadius,
            border: "2px solid #a0aec0",
            bgcolor: "#a0aec0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Close sx={{ color: "black", fontSize: sizeConfig.iconFontSize }} />
        </Box>
      );
    }

    if (outcome === "rolled_over") {
      return (
        <Box
          sx={{
            width: sizeConfig.iconBoxSize,
            height: sizeConfig.iconBoxSize,
            borderRadius: sizeConfig.borderRadius,
            border: "2px solid #a0aec0",
            bgcolor: "#a0aec0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SkipNext sx={{ color: "black", fontSize: sizeConfig.iconFontSize }} />
        </Box>
      );
    }

    return undefined;
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        width: sizeConfig.containerSize,
        height: sizeConfig.containerSize,
      }}
    >
      <Checkbox
        checked={outcome !== null || isChecked}
        size={sizeConfig.muiSize}
        disabled={disabled}
        onChange={handleCheckboxChange}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onPointerDown={e => e.stopPropagation()}
        sx={{
          padding: 0,
          width: sizeConfig.containerSize,
          height: sizeConfig.containerSize,
          fontSize: sizeConfig.iconFontSize,
          borderRadius: sizeConfig.borderRadius,
        }}
        icon={renderUncheckedIcon()}
        checkedIcon={renderCheckedIcon()}
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
                if (onOutcomeChange) {
                  onOutcomeChange(null);
                }
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
          {outcome !== "completed" &&
            onOutcomeChange && [
              <MenuItem
                key="completed"
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
              </MenuItem>,
            ]}
          {/* Only show Not Completed if not already not completed */}
          {outcome !== "not_completed" &&
            onOutcomeChange && [
              <MenuItem
                key="not-completed"
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
              </MenuItem>,
            ]}
          {/* Show Roll Over option for recurring tasks that aren't already rolled over */}
          {isRecurring &&
            outcome !== "rolled_over" &&
            onRollover &&
            taskId &&
            viewDate && [
              (outcome !== null || (onOutcomeChange && outcome !== "completed" && outcome !== "not_completed")) && (
                <Divider key="divider-rollover" />
              ),
              <MenuItem
                key="rollover"
                onClick={e => {
                  e.stopPropagation();
                  onRollover(taskId, viewDate);
                  handleMenuClose();
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <SkipNext fontSize="small" />
                  <Typography variant="body2">Roll Over to Tomorrow</Typography>
                </Stack>
              </MenuItem>,
            ]}
        </Menu>
      )}
    </Box>
  );
};

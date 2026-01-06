"use client";

import { Box, CircularProgress, Fade } from "@mui/material";
import { Check } from "@mui/icons-material";

/**
 * Reusable autosave badge component that shows saving state
 *
 * @param {Object} props
 * @param {boolean} props.isSaving - Whether a save is in progress
 * @param {boolean} props.justSaved - Whether save just completed (shows "Saved")
 * @param {string} props.position - Position: "top-right", "top-left", "bottom-right", "bottom-left" (default: "top-right")
 * @param {number} props.size - Size of badge: "sm" | "md" (default: "sm")
 */
export const AutosaveBadge = ({ isSaving, justSaved, position = "top-right", size = "sm" }) => {
  const show = isSaving || justSaved;

  const positionStyles = {
    "top-right": { top: 8, right: 8 },
    "top-left": { top: 8, left: 8 },
    "bottom-right": { bottom: 8, right: 8 },
    "bottom-left": { bottom: 8, left: 8 },
  };

  const sizeStyles = {
    sm: {
      fontSize: "0.75rem",
      padding: "4px 8px",
      minHeight: 24,
    },
    md: {
      fontSize: "0.875rem",
      padding: "6px 12px",
      minHeight: 28,
    },
  };

  return (
    <Fade in={show} timeout={200}>
      <Box
        sx={{
          position: "absolute",
          ...positionStyles[position],
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          bgcolor: justSaved ? "success.main" : "action.selected",
          color: justSaved ? "success.contrastText" : "text.secondary",
          borderRadius: 1,
          px: size === "sm" ? 1 : 1.5,
          py: 0.5,
          fontSize: sizeStyles[size].fontSize,
          minHeight: sizeStyles[size].minHeight,
          zIndex: 1000,
          boxShadow: 1,
          transition: "background-color 0.2s, color 0.2s",
        }}
      >
        {isSaving ? (
          <>
            <CircularProgress size={size === "sm" ? 12 : 14} sx={{ color: "inherit" }} />
            <Box component="span">Saving...</Box>
          </>
        ) : justSaved ? (
          <>
            <Check sx={{ fontSize: size === "sm" ? 14 : 16 }} />
            <Box component="span">Saved</Box>
          </>
        ) : null}
      </Box>
    </Fade>
  );
};

export default AutosaveBadge;

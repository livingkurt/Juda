"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import { Palette, Close, RestartAlt } from "@mui/icons-material";
import { useTheme } from "@/hooks/useTheme";
import { useColorMode } from "@/hooks/useColorMode";

/**
 * Color property groups for the editor
 */
const COLOR_GROUPS = [
  {
    label: "Background",
    keys: [
      { key: "bgCanvas", label: "Canvas" },
      { key: "bgSurface", label: "Surface" },
      { key: "bgElevated", label: "Elevated" },
    ],
  },
  {
    label: "Primary",
    keys: [
      { key: "primary", label: "Primary" },
      { key: "primaryHover", label: "Primary Hover" },
      { key: "primaryActive", label: "Primary Active" },
      { key: "accent", label: "Accent" },
      { key: "accentHover", label: "Accent Hover" },
    ],
  },
  {
    label: "Buttons",
    keys: [
      { key: "buttonPrimary", label: "Primary" },
      { key: "buttonPrimaryHover", label: "Hover" },
      { key: "buttonPrimaryActive", label: "Active" },
    ],
  },
  {
    label: "Icons",
    keys: [
      { key: "iconPrimary", label: "Primary" },
      { key: "iconSecondary", label: "Secondary" },
      { key: "iconAccent", label: "Accent" },
    ],
  },
  {
    label: "UI",
    keys: [
      { key: "link", label: "Link" },
      { key: "linkHover", label: "Link Hover" },
      { key: "focus", label: "Focus" },
      { key: "selection", label: "Selection" },
      { key: "selectionBorder", label: "Selection Border" },
    ],
  },
  {
    label: "Calendar",
    keys: [
      { key: "calendarToday", label: "Today" },
      { key: "calendarSelected", label: "Selected" },
    ],
  },
  {
    label: "Drag & Drop",
    keys: [
      { key: "dndDropTarget", label: "Drop Target" },
      { key: "dndDropTargetBorder", label: "Drop Border" },
    ],
  },
];

/**
 * Single color swatch with native color picker
 */
function ColorSwatch({ colorKey, label, value, onChange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
      <Box
        component="label"
        sx={{
          position: "relative",
          width: 28,
          height: 28,
          borderRadius: 1,
          bgcolor: value,
          border: "2px solid",
          borderColor: "divider",
          cursor: "pointer",
          flexShrink: 0,
          overflow: "hidden",
          "&:hover": { borderColor: "text.primary" },
        }}
      >
        <input
          type="color"
          value={value}
          onChange={e => onChange(colorKey, e.target.value)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            border: "none",
            padding: 0,
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary", minWidth: 0, flex: 1 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{ fontSize: "0.65rem", color: "text.disabled", fontFamily: "monospace", flexShrink: 0 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Custom theme editor modal
 * Replaces the old ThemeSelector dropdown
 */
export function ThemeSelector() {
  const { theme, customColors, updateCustomColor, resetCustomColors, loadPresetColors, themes } = useTheme();
  const { mode: colorMode } = useColorMode();
  const [open, setOpen] = useState(false);

  const mode = colorMode || "dark";
  const baseColors = theme.colors[mode];

  // Get effective color: customColors override, then base theme
  const getColor = key => customColors[key] || baseColors[key] || "#000000";

  const hasCustomizations = Object.keys(customColors).length > 0;

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        size="small"
        aria-label="Customize theme"
        sx={{
          minWidth: { xs: "28px", md: "40px" },
          height: { xs: "28px", md: "40px" },
          p: { xs: 0, md: 2 },
        }}
      >
        <Palette fontSize="small" />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: "85vh",
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Theme Colors
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Preset buttons */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Start from a preset:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
              {themes.map(preset => (
                <Chip
                  key={preset.id}
                  label={preset.name}
                  size="small"
                  variant="outlined"
                  onClick={() => loadPresetColors(preset.id)}
                  icon={
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: preset.colors[mode].primary,
                        ml: "4px !important",
                      }}
                    />
                  }
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Color groups */}
          {COLOR_GROUPS.map(group => (
            <Box key={group.label} sx={{ mb: 2.5 }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  mb: 0.5,
                  display: "block",
                }}
              >
                {group.label}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 0.5,
                }}
              >
                {group.keys.map(({ key, label }) => (
                  <ColorSwatch
                    key={key}
                    colorKey={key}
                    label={label}
                    value={getColor(key)}
                    onChange={updateCustomColor}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Button
            onClick={resetCustomColors}
            startIcon={<RestartAlt />}
            color="warning"
            size="small"
            disabled={!hasCustomizations}
          >
            Reset to Default
          </Button>
          <Button onClick={() => setOpen(false)} variant="contained" size="small">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

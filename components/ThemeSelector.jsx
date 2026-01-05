"use client";

import { useState } from "react";
import { Box, Stack, Typography, IconButton, Menu, MenuItem } from "@mui/material";
import { Palette, Check } from "@mui/icons-material";
import { useTheme } from "@/hooks/useTheme";
import { useColorMode } from "@/hooks/useColorMode";

/**
 * Theme selector dropdown component
 * Allows users to choose from available color themes
 */
export function ThemeSelector() {
  const { themeId, setTheme, themes } = useTheme();
  const { mode: colorMode } = useColorMode(); // Used in theme.colors[colorMode]
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = themeId => {
    setTheme(themeId);
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-label="Select theme"
        sx={{
          minWidth: { xs: "28px", md: "40px" },
          height: { xs: "28px", md: "40px" },
          p: { xs: 0, md: 2 },
        }}
      >
        <Palette fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {themes.map(theme => {
          const isSelected = themeId === theme.id;
          const themeColors = theme.colors[colorMode];

          return (
            <MenuItem
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              selected={isSelected}
              sx={{
                bgcolor: isSelected ? "action.selected" : "transparent",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {/* Color swatch preview */}
                  <Stack direction="row" spacing={0.5}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 0.5,
                        bgcolor: themeColors.primary,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 0.5,
                        bgcolor: themeColors.accent,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Stack>
                  <Typography variant="body2">{theme.name}</Typography>
                </Stack>
                {isSelected && (
                  <Box component="span" sx={{ color: "text.primary" }}>
                    <Check fontSize="small" />
                  </Box>
                )}
              </Stack>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

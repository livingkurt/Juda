"use client";

import { Box, Stack, Typography, IconButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { LightMode, WbTwilight, DarkMode, Logout, Label, Refresh } from "@mui/icons-material";
import { useColorMode } from "@/hooks/useColorMode";
import { useAuth } from "@/hooks/useAuth";
import { useDialogState } from "@/hooks/useDialogState";
import { ThemeSelector } from "@/components/ThemeSelector";
import { getGreeting } from "@/lib/utils";

export function AppHeader() {
  const theme = useTheme();
  const { mode: colorMode, toggleColorMode } = useColorMode();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { logout } = useAuth();
  const dialogState = useDialogState();

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon === "Sun" ? LightMode : greeting.icon === "Sunset" ? WbTwilight : DarkMode;

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Stack direction="row" alignItems="center" spacing={{ xs: 2, md: 3 }}>
        <Box component="span" sx={{ color: "primary.main" }}>
          <GreetingIcon fontSize="medium" sx={{ color: "currentColor" }} />
        </Box>
        <Box>
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight={600}>
            {greeting.text}
          </Typography>
          <Typography variant={isMobile ? "caption" : "body2"} color="text.secondary">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center">
        <IconButton
          onClick={() => dialogState.setTagEditorOpen(true)}
          size={isMobile ? "small" : "medium"}
          aria-label="Manage tags"
        >
          <Label fontSize="small" sx={{ color: "currentColor" }} />
        </IconButton>
        <ThemeSelector />
        <IconButton
          onClick={toggleColorMode}
          size={isMobile ? "small" : "medium"}
          aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {colorMode === "dark" ? (
            <LightMode fontSize="small" sx={{ color: "currentColor" }} />
          ) : (
            <DarkMode fontSize="small" sx={{ color: "currentColor" }} />
          )}
        </IconButton>
        <IconButton
          onClick={() => window.location.reload()}
          size={isMobile ? "small" : "medium"}
          aria-label="Refresh page"
        >
          <Refresh fontSize="small" sx={{ color: "currentColor" }} />
        </IconButton>
        <IconButton onClick={logout} size={isMobile ? "small" : "medium"} aria-label="Logout" color="error">
          <Logout fontSize="small" sx={{ color: "currentColor" }} />
        </IconButton>
      </Stack>
    </Stack>
  );
}

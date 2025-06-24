"use client";

import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import { theme } from "../theme/theme";

export default function ClientThemeProvider({ children }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

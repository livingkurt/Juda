"use client";

import { Inter } from "next/font/google";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Provider as ReduxProvider } from "react-redux";
import { useEffect, useState } from "react";
import theme from "@/theme/theme";
import store from "@/store/store";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  // Add this to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider store={store}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* Only render the children after the component has mounted */}
            {mounted ? children : null}
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}

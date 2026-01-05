"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function AuthPage() {
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      {view === "login" && (
        <LoginForm onSwitchToRegister={() => setView("register")} onForgotPassword={() => setView("forgot")} />
      )}
      {view === "register" && <RegisterForm onSwitchToLogin={() => setView("login")} />}
      {view === "forgot" && <ForgotPasswordForm onBackToLogin={() => setView("login")} />}
    </Box>
  );
}

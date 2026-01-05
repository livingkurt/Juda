"use client";

import { useState } from "react";
import { Flex } from "@mantine/core";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function AuthPage() {
  const { mode } = useSemanticColors();
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"

  return (
    <Flex
      style={{
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: mode.bg.canvas,
        padding: 16,
      }}
    >
      {view === "login" ? (
        <LoginForm onSwitchToRegister={() => setView("register")} onForgotPassword={() => setView("forgot")} />
      ) : view === "register" ? (
        <RegisterForm onSwitchToLogin={() => setView("login")} />
      ) : (
        <ForgotPasswordForm onBackToLogin={() => setView("login")} />
      )}
    </Flex>
  );
}

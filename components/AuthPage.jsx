"use client";

import { useState } from "react";
import { Flex } from "@chakra-ui/react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function AuthPage() {
  const { mode } = useSemanticColors();
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"

  return (
    <Flex minH="100vh" align="center" justify="center" bg={mode.bg.canvas} p={4}>
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

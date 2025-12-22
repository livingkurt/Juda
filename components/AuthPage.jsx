"use client";

import { useState } from "react";
import { Flex } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export function AuthPage() {
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"
  const bgColor = useColorModeValue("gray.50", "gray.900");

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bgColor} p={4}>
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

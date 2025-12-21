"use client";

import { useState } from "react";
import { Flex, useColorModeValue } from "@chakra-ui/react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const bgColor = useColorModeValue("gray.50", "gray.900");

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bgColor} p={4}>
      {isLogin ? (
        <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </Flex>
  );
}

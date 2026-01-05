"use client";

import { useState } from "react";
import { Box, Button, TextInput, Stack, Text, Alert, Anchor } from "@mantine/core";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function LoginForm({ onSwitchToRegister, onForgotPassword }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { mode, interactive } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      bg={bgColor}
      p={32}
      style={{
        borderRadius: "0.5rem",
        border: `1px solid ${borderColor}`,
        width: "100%",
        maxWidth: "400px",
      }}
    >
      <Stack gap="md">
        <Box mb={8}>
          <Image src="/icon.png" alt="Juda Logo" width={80} height={80} priority style={{ borderRadius: "50%" }} />
        </Box>
        <Text size="2xl" fw={700}>
          Welcome Back
        </Text>

        {error && (
          <Alert color="red" radius="md">
            {error}
          </Alert>
        )}

        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Email{" "}
            <Text component="span" c="red.5">
              *
            </Text>
          </Text>
          <TextInput
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            styles={{
              input: {
                borderColor: borderColor,
                "&:focus": {
                  borderColor: interactive.primary,
                  boxShadow: `0 0 0 1px ${interactive.primary}`,
                },
              },
            }}
          />
        </Box>

        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Password{" "}
            <Text component="span" c="red.5">
              *
            </Text>
          </Text>
          <TextInput
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            styles={{
              input: {
                borderColor: borderColor,
                "&:focus": {
                  borderColor: interactive.primary,
                  boxShadow: `0 0 0 1px ${interactive.primary}`,
                },
              },
            }}
          />
        </Box>

        <Button type="submit" color="blue" w="100%" loading={loading}>
          Sign In
        </Button>

        <Button variant="subtle" onClick={onForgotPassword} size="sm" color="blue">
          Forgot Password?
        </Button>

        <Text size="sm">
          Don&apos;t have an account?{" "}
          <Anchor c="blue.5" onClick={onSwitchToRegister} style={{ cursor: "pointer" }}>
            Sign up
          </Anchor>
        </Text>
      </Stack>
    </Box>
  );
}

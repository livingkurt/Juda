"use client";

import { useState } from "react";
import { Box, Button, TextInput, Stack, Text, Alert, Anchor } from "@mantine/core";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function RegisterForm({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { mode, interactive } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
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
          <Image src="/icon.png" alt="Juda Logo" width={80} height={80} priority />
        </Box>
        <Text size="2xl" fw={700}>
          Create Account
        </Text>

        {error && (
          <Alert color="red" radius="md">
            {error}
          </Alert>
        )}

        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Name (optional)
          </Text>
          <TextInput
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
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

        <Box w="100%">
          <Text size="sm" fw={500} mb={4}>
            Confirm Password{" "}
            <Text component="span" c="red.5">
              *
            </Text>
          </Text>
          <TextInput
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
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
          Create Account
        </Button>

        <Text size="sm">
          Already have an account?{" "}
          <Anchor c="blue.5" onClick={onSwitchToLogin} style={{ cursor: "pointer" }}>
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </Box>
  );
}

"use client";

import { useState } from "react";
import { Box, Button, TextInput, Stack, Text, Alert } from "@mantine/core";
import Image from "next/image";
import { useSemanticColors } from "@/hooks/useSemanticColors";

export function ForgotPasswordForm({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mode, interactive } = useSemanticColors();
  const bgColor = mode.bg.surface;
  const borderColor = mode.border.default;

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
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
          Reset Password
        </Text>

        {success && (
          <Alert color="green" radius="md">
            Password updated successfully! Redirecting to login...
          </Alert>
        )}

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
            New Password{" "}
            <Text component="span" c="red.5">
              *
            </Text>
          </Text>
          <TextInput
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
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
            Confirm New Password{" "}
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

        <Button type="submit" color="blue" w="100%" loading={loading} disabled={success}>
          Update Password
        </Button>

        <Button variant="subtle" onClick={onBackToLogin} size="sm">
          Back to Login
        </Button>
      </Stack>
    </Box>
  );
}

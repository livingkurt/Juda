"use client";

import { useState } from "react";
import { Box, Button, Input, VStack, Text, Alert } from "@chakra-ui/react";
import Image from "next/image";

export function ForgotPasswordForm({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const bgColor = { _light: "white", _dark: "gray.800" };
  const borderColor = { _light: "gray.200", _dark: "gray.600" };

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
      as="form"
      onSubmit={handleSubmit}
      bg={bgColor}
      p={8}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      w="full"
      maxW="400px"
    >
      <VStack spacing={4}>
        <Box mb={2}>
          <Image src="/icon.png" alt="Juda Logo" width={80} height={80} priority />
        </Box>
        <Text fontSize="2xl" fontWeight="bold">
          Reset Password
        </Text>

        {success && (
          <Alert.Root status="success" borderRadius="md">
            <Alert.Title>Password updated successfully! Redirecting to login...</Alert.Title>
          </Alert.Root>
        )}

        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        <Box w="full">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Email{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            borderColor={borderColor}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            required
          />
        </Box>

        <Box w="full">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            New Password{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            borderColor={borderColor}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            required
          />
        </Box>

        <Box w="full">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Confirm New Password{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            borderColor={borderColor}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            required
          />
        </Box>

        <Button type="submit" colorPalette="blue" w="full" isLoading={loading} isDisabled={success}>
          Update Password
        </Button>

        <Button variant="link" onClick={onBackToLogin} size="sm">
          Back to Login
        </Button>
      </VStack>
    </Box>
  );
}

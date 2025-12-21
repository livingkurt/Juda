"use client";

import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";

export function ForgotPasswordForm({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

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
        <Text fontSize="2xl" fontWeight="bold">
          Reset Password
        </Text>

        {success && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            Password updated successfully! Redirecting to login...
          </Alert>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <FormControl isRequired>
          <FormLabel>Email</FormLabel>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>New Password</FormLabel>
          <Input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormControl>

        <FormControl isRequired>
          <FormLabel>Confirm New Password</FormLabel>
          <Input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormControl>

        <Button type="submit" colorScheme="blue" w="full" isLoading={loading} isDisabled={success}>
          Update Password
        </Button>

        <Button variant="link" onClick={onBackToLogin} size="sm">
          Back to Login
        </Button>
      </VStack>
    </Box>
  );
}


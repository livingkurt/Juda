"use client";

import { useState } from "react";
import { Box, Button, Input, VStack, Text, Alert, Link } from "@chakra-ui/react";
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

  const { mode } = useSemanticColors();
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
          Create Account
        </Text>

        {error && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        <Box w="full">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Name (optional)
          </Text>
          <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            borderColor={borderColor}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
          />
        </Box>

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
            Password{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
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
            Confirm Password{" "}
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

        <Button type="submit" colorPalette="blue" w="full" isLoading={loading}>
          Create Account
        </Button>

        <Text fontSize="sm">
          Already have an account?{" "}
          <Link color="blue.500" onClick={onSwitchToLogin} cursor="pointer">
            Sign in
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}

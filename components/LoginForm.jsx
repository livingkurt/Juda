"use client";

import { useState } from "react";
import { Box, Button, Input, VStack, Text, Alert, Link } from "@chakra-ui/react";
import { useColorModeValue } from "@/hooks/useColorModeValue";
import { useAuth } from "@/contexts/AuthContext";

export function LoginForm({ onSwitchToRegister, onForgotPassword }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

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
          Welcome Back
        </Text>

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
            required
          />
        </Box>

        <Button type="submit" colorScheme="blue" w="full" isLoading={loading}>
          Sign In
        </Button>

        <Button variant="link" onClick={onForgotPassword} size="sm" colorScheme="blue">
          Forgot Password?
        </Button>

        <Text fontSize="sm">
          Don&apos;t have an account?{" "}
          <Link color="blue.500" onClick={onSwitchToRegister} cursor="pointer">
            Sign up
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}

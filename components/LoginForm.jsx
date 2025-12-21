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
  Link,
  useColorModeValue,
} from "@chakra-ui/react";
import { useAuth } from "@/contexts/AuthContext";

export function LoginForm({ onSwitchToRegister }) {
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
          <FormLabel>Password</FormLabel>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </FormControl>

        <Button type="submit" colorScheme="blue" w="full" isLoading={loading}>
          Sign In
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

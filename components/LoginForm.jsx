"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";

export function LoginForm({ onSwitchToRegister, onForgotPassword }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={4} sx={{ p: 4, width: "100%", maxWidth: 400, borderRadius: 2 }}>
      <Stack spacing={3}>
        <Box textAlign="center">
          <Box component="img" src="/apple-icon.png" alt="Logo" width={100} height={100} borderRadius={10}></Box>
        </Box>
        <Box textAlign="center">
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box textAlign="right">
              <Link component="button" type="button" variant="body2" onClick={onForgotPassword}>
                Forgot password?
              </Link>
            </Box>
            <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading}>
              {isLoading ? <CircularProgress size={20} /> : "Sign In"}
            </Button>
          </Stack>
        </form>

        <Typography variant="body2" textAlign="center" color="text.secondary">
          Don&apos;t have an account?{" "}
          <Link component="button" onClick={onSwitchToRegister}>
            Sign up
          </Link>
        </Typography>
      </Stack>
    </Paper>
  );
}

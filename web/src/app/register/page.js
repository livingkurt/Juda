"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useAuth } from "@/hooks/useAuth";

const RegisterCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  width: "100%",
  padding: theme.spacing(3),
}));

const FormField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export default function RegisterPage() {
  const { register, loading, error } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    wake_time: "08:00",
  });
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear password error when either password field changes
    if (name === "password" || name === "confirmPassword") {
      setPasswordError("");
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      timezone: formData.timezone,
      wake_time: formData.wake_time,
    };

    await register(userData);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
        backgroundColor: "background.default",
      }}
    >
      <RegisterCard>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Create Account
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Sign up for your Personal Assistant
          </Typography>

          <form noValidate onSubmit={handleSubmit}>
            <FormField
              label="Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              autoComplete="name"
              error={!!error}
            />
            <FormField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              autoComplete="email"
              error={!!error}
            />
            <FormField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              autoComplete="new-password"
              error={!!passwordError || !!error}
            />
            <FormField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              autoComplete="new-password"
              error={!!passwordError || !!error}
              helperText={passwordError || error}
            />
            <FormField
              label="Timezone"
              type="text"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
            />
            <FormField
              label="Wake Time"
              type="time"
              name="wake_time"
              value={formData.wake_time}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                step: 300, // 5 min
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              Already have an account?{" "}
              <Link href="/login" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </RegisterCard>
    </Box>
  );
}

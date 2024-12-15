import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { setUser, setError, setLoading } from "../store/authSlice";
import { setSnackbar } from "../store/uiSlice";
import apiService from "../services/api";

const LoginCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  width: "100%",
  padding: theme.spacing(3),
}));

const FormField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector(state => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const response = await apiService.login(formData);

      dispatch(setUser(response.data.user));
      dispatch(
        setSnackbar({
          open: true,
          message: "Welcome back!",
          severity: "success",
        })
      );

      navigate("/");
    } catch (error) {
      const errorMessage =
        error.message === "Invalid email or password"
          ? { password: error.message }
          : { submit: error.message };

      setFormErrors(errorMessage);
      dispatch(setError(error.message));
      dispatch(
        setSnackbar({
          open: true,
          message: error.message,
          severity: "error",
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: 2,
        backgroundColor: "background.default",
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
      }}
    >
      <LoginCard>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Sign in to continue to Juda
          </Typography>

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
              autoComplete="email"
              error={!!formErrors.email}
              helperText={formErrors.email}
            />
            <FormField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              fullWidth
              required
              autoComplete="current-password"
              error={!!formErrors.password}
              helperText={formErrors.password}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Sign In"}
            </Button>
          </form>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{ color: "inherit", textDecoration: "underline" }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </LoginCard>
    </Box>
  );
}

export default Login;

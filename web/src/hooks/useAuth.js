import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  setUser,
  setLoading,
  setError,
  clearError,
  logout,
} from "@/store/slices/authSlice";
import { setSnackbar } from "@/store/slices/uiSlice";
import apiService from "@/services/api";

export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated, loading, error } = useSelector(
    state => state.auth
  );

  useEffect(() => {
    // Check if user is already authenticated
    const token = Cookies.get("token");
    if (token && !isAuthenticated) {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      dispatch(setLoading(true));
      const response = await apiService.getCurrentUser();
      dispatch(setUser(response.data.user));
    } catch (error) {
      console.error("Auth check failed:", error);
      handleLogout();
    }
  };

  const handleLogin = async (email, password) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await apiService.login(email, password);
      Cookies.set("token", response.data.token, { expires: 1 }); // Expires in 1 day
      dispatch(setUser(response.data.user));

      dispatch(
        setSnackbar({
          open: true,
          message: "Successfully logged in",
          severity: "success",
        })
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      dispatch(setError(error.message));
      dispatch(
        setSnackbar({
          open: true,
          message: error.message,
          severity: "error",
        })
      );
    }
  };

  const handleRegister = async userData => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const response = await apiService.register(userData);
      Cookies.set("token", response.data.token, { expires: 1 }); // Expires in 1 day
      dispatch(setUser(response.data.user));

      dispatch(
        setSnackbar({
          open: true,
          message: "Successfully registered",
          severity: "success",
        })
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      dispatch(setError(error.message));
      dispatch(
        setSnackbar({
          open: true,
          message: error.message,
          severity: "error",
        })
      );
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      Cookies.remove("token");
      dispatch(logout());
      router.push("/login");
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}

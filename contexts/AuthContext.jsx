"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Ref to track if refresh is in progress
  const refreshingRef = useRef(false);
  // Ref for refresh interval
  const refreshIntervalRef = useRef(null);

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (refreshingRef.current) return null;

    refreshingRef.current = true;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        setAccessToken(null);
        return null;
      }

      const data = await response.json();
      setUser(data.user);
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      setUser(null);
      setAccessToken(null);
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await refreshAccessToken();
      setInitialized(true);
      setLoading(false);
    };

    initAuth();
  }, [refreshAccessToken]);

  // Set up automatic token refresh (every 13 minutes to refresh before 15min expiry)
  useEffect(() => {
    if (!accessToken) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Refresh token every 13 minutes
    refreshIntervalRef.current = setInterval(
      () => {
        refreshAccessToken();
      },
      13 * 60 * 1000
    );

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [accessToken, refreshAccessToken]);

  // Helper function to migrate localStorage to DB
  const migrateLocalStoragePreferences = useCallback(async token => {
    if (typeof window === "undefined") return;

    try {
      const viewPrefs = localStorage.getItem("juda-view-preferences");
      const colorMode = localStorage.getItem("chakra-ui-color-mode");

      if (viewPrefs || colorMode) {
        const prefs = viewPrefs ? JSON.parse(viewPrefs) : {};
        if (colorMode) prefs.colorMode = colorMode;

        // Save to database
        await fetch("/api/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(prefs),
        });

        // Clear localStorage after migration
        localStorage.removeItem("juda-view-preferences");
        // Note: Keep chakra-ui-color-mode for initial page load performance
      }
    } catch (error) {
      console.error("Error migrating preferences:", error);
    }
  }, []);

  // Login function
  const login = useCallback(
    async (email, password) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      setUser(data.user);
      setAccessToken(data.accessToken);

      // Migrate localStorage preferences to database
      await migrateLocalStoragePreferences(data.accessToken);

      return data.user;
    },
    [migrateLocalStoragePreferences]
  );

  // Register function
  const register = useCallback(
    async (email, password, name) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      const data = await response.json();
      setUser(data.user);
      setAccessToken(data.accessToken);

      // Migrate localStorage preferences to database
      await migrateLocalStoragePreferences(data.accessToken);

      return data.user;
    },
    [migrateLocalStoragePreferences]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Get current access token (with auto-refresh if needed)
  const getAccessToken = useCallback(async () => {
    if (accessToken) {
      return accessToken;
    }
    return refreshAccessToken();
  }, [accessToken, refreshAccessToken]);

  const value = {
    user,
    accessToken,
    loading,
    initialized,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    getAccessToken,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

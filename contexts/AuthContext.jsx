"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AuthContext } from "./AuthContextDefinition";
import { injectAuthFunctions } from "@/lib/store/api/baseApi";

export function AuthProvider({ children }) {
  // Use a unified state object to prevent race conditions and flashes
  const [authState, setAuthState] = useState({
    user: null,
    accessToken: null,
    loading: true,
    initialized: false,
  });

  // Ref to track if refresh is in progress
  const refreshingRef = useRef(false);
  // Ref for refresh interval
  const refreshIntervalRef = useRef(null);
  // Ref to always have the latest token available (for callbacks that might have stale closures)
  const accessTokenRef = useRef(null);

  // Keep the ref in sync with state
  useEffect(() => {
    accessTokenRef.current = authState.accessToken;
  }, [authState.accessToken]);

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
        accessTokenRef.current = null;
        setAuthState(prev => ({
          ...prev,
          user: null,
          accessToken: null,
        }));
        return null;
      }

      const data = await response.json();
      // Update ref IMMEDIATELY
      accessTokenRef.current = data.accessToken;
      setAuthState(prev => ({
        ...prev,
        user: data.user,
        accessToken: data.accessToken,
      }));
      return data.accessToken;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      accessTokenRef.current = null;
      setAuthState(prev => ({
        ...prev,
        user: null,
        accessToken: null,
      }));
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          // Update ref IMMEDIATELY
          accessTokenRef.current = data.accessToken;
          // SET EVERYTHING AT ONCE
          setAuthState({
            user: data.user,
            accessToken: data.accessToken,
            loading: false,
            initialized: true,
          });
        } else {
          accessTokenRef.current = null;
          setAuthState({
            user: null,
            accessToken: null,
            loading: false,
            initialized: true,
          });
        }
      } catch (error) {
        console.error("Auth init error:", error);
        accessTokenRef.current = null;
        setAuthState({
          user: null,
          accessToken: null,
          loading: false,
          initialized: true,
        });
      }
    };

    initAuth();
  }, []);

  // Set up automatic token refresh (every 13 minutes to refresh before 15min expiry)
  useEffect(() => {
    if (!authState.accessToken) {
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
  }, [authState.accessToken, refreshAccessToken]);

  // Helper function to migrate localStorage to DB
  const migrateLocalStoragePreferences = useCallback(async token => {
    if (typeof window === "undefined") return;

    try {
      const viewPrefs = localStorage.getItem("juda-view-preferences");

      if (viewPrefs) {
        const prefs = viewPrefs ? JSON.parse(viewPrefs) : {};

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

      // Update ref IMMEDIATELY before state (so it's available for any queries that fire)
      accessTokenRef.current = data.accessToken;

      setAuthState({
        user: data.user,
        accessToken: data.accessToken,
        loading: false,
        initialized: true,
      });

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

      // Update ref IMMEDIATELY before state (so it's available for any queries that fire)
      accessTokenRef.current = data.accessToken;

      setAuthState({
        user: data.user,
        accessToken: data.accessToken,
        loading: false,
        initialized: true,
      });

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
      accessTokenRef.current = null;
      setAuthState({
        user: null,
        accessToken: null,
        loading: false,
        initialized: true,
      });
    }
  }, []);

  // Get current access token (with auto-refresh if needed)
  // Uses ref to always get the latest token, avoiding stale closure issues
  const getAccessToken = useCallback(async () => {
    // Use ref to always get the current token (avoids stale closure)
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }
    return refreshAccessToken();
  }, [refreshAccessToken]);

  const value = {
    ...authState,
    isAuthenticated: Boolean(authState.user),
    login,
    register,
    logout,
    getAccessToken,
    refreshAccessToken,
  };

  // Inject auth functions into Redux base API
  useEffect(() => {
    injectAuthFunctions({
      getAccessToken,
      refreshAccessToken,
      logout,
    });
  }, [getAccessToken, refreshAccessToken, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

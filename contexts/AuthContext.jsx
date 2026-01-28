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
  // Ref to store the pending refresh promise (so multiple callers can await the same refresh)
  const refreshPromiseRef = useRef(null);
  // Ref for refresh interval
  const refreshIntervalRef = useRef(null);
  // Ref to always have the latest token available (for callbacks that might have stale closures)
  const accessTokenRef = useRef(null);
  // Ref to track retry attempts
  const retryCountRef = useRef(0);

  // Keep the ref in sync with state
  useEffect(() => {
    accessTokenRef.current = authState.accessToken;
  }, [authState.accessToken]);

  // Refresh access token with retry logic
  const refreshAccessToken = useCallback(async (retryCount = 0) => {
    // If already refreshing, return the existing promise (prevents concurrent refreshes)
    if (refreshingRef.current && retryCount === 0 && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshingRef.current = true;

    // Create a promise that will be shared by concurrent callers
    const refreshPromise = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          // 401 means no valid refresh token - don't retry, just fail
          if (response.status === 401) {
            // Clear persistence flag - user needs to log in again
            if (typeof window !== "undefined") {
              localStorage.removeItem("juda-auth-persist");
            }
            accessTokenRef.current = null;
            setAuthState(prev => ({
              ...prev,
              user: null,
              accessToken: null,
            }));
            return null;
          }

          // Retry on server errors (500+) - these are transient issues
          if (response.status >= 500 && retryCount < 3) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
            await new Promise(resolve => setTimeout(resolve, delay));
            refreshingRef.current = false;
            return refreshAccessToken(retryCount + 1);
          }

          // Other errors - don't retry
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

        // Mark user as logged in in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("juda-auth-persist", "true");
        }

        // Reset retry count on success
        retryCountRef.current = 0;

        setAuthState(prev => ({
          ...prev,
          user: data.user,
          accessToken: data.accessToken,
        }));
        return data.accessToken;
      } catch (error) {
        console.error("Failed to refresh token:", error);

        // Retry on network errors (not auth errors)
        if (retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          refreshingRef.current = false;
          return refreshAccessToken(retryCount + 1);
        }

        // Network error after retries - clear state
        if (typeof window !== "undefined") {
          localStorage.removeItem("juda-auth-persist");
        }

        accessTokenRef.current = null;
        setAuthState(prev => ({
          ...prev,
          user: null,
          accessToken: null,
        }));
        return null;
      } finally {
        refreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    // Store the promise so concurrent callers can await it
    refreshPromiseRef.current = refreshPromise;

    return refreshPromise;
  }, []);

  // Initialize auth state on mount with retry logic
  useEffect(() => {
    const initAuth = async (attempt = 0) => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          // Update ref IMMEDIATELY
          accessTokenRef.current = data.accessToken;

          // Mark as logged in
          if (typeof window !== "undefined") {
            localStorage.setItem("juda-auth-persist", "true");
          }

          // Reset retry count
          retryCountRef.current = 0;

          // SET EVERYTHING AT ONCE
          setAuthState({
            user: data.user,
            accessToken: data.accessToken,
            loading: false,
            initialized: true,
          });
        } else {
          // 401 means no refresh token - don't retry, just fail
          if (response.status === 401) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("juda-auth-persist");
            }
            accessTokenRef.current = null;
            setAuthState({
              user: null,
              accessToken: null,
              loading: false,
              initialized: true,
            });
            return;
          }

          // Retry on server errors (500+) - transient issues
          if (response.status >= 500 && attempt < 3) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            return initAuth(attempt + 1);
          }

          // Other errors or exhausted retries - fail
          if (typeof window !== "undefined") {
            localStorage.removeItem("juda-auth-persist");
          }
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

        // Retry on network errors (not auth errors)
        if (attempt < 3) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return initAuth(attempt + 1);
        }

        // Network error after retries - clear state
        if (typeof window !== "undefined") {
          localStorage.removeItem("juda-auth-persist");
        }
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

      // Mark user as logged in in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("juda-auth-persist", "true");
      }

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

      // Mark user as logged in in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("juda-auth-persist", "true");
      }

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
      // Clear localStorage persistence flag
      if (typeof window !== "undefined") {
        localStorage.removeItem("juda-auth-persist");
      }
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
      isInitialized: () => authState.initialized,
    });
  }, [getAccessToken, refreshAccessToken, logout, authState.initialized]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

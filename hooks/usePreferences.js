"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_PREFERENCES, mergeWithDefaults } from "@/lib/defaultPreferences";

export function usePreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const authFetch = useAuthFetch();
  const { isAuthenticated } = useAuth();

  // Debounce timer ref for saving
  const saveTimerRef = useRef(null);
  // Track pending updates
  const pendingUpdatesRef = useRef({});

  // Fetch preferences from server
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      // Not logged in - try to load from localStorage for backwards compatibility
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("juda-view-preferences");
          const colorMode = localStorage.getItem("chakra-ui-color-mode");

          if (saved) {
            const parsed = JSON.parse(saved);
            const merged = mergeWithDefaults({
              ...parsed,
              colorMode: colorMode || "dark",
            });
            setPreferences(merged);
          }
        } catch (error) {
          console.error("Error loading localStorage preferences:", error);
        }
      }
      setLoading(false);
      setInitialized(true);
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch("/api/preferences");

      if (response.ok) {
        const data = await response.json();
        setPreferences(mergeWithDefaults(data));
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [authFetch, isAuthenticated]);

  // Load preferences on mount and when auth state changes
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Save preferences to server (debounced)
  const savePreferences = useCallback(
    async updates => {
      if (!isAuthenticated) {
        // Not logged in - save to localStorage for backwards compatibility
        if (typeof window !== "undefined") {
          try {
            const { colorMode, ...viewPrefs } = { ...preferences, ...updates };
            localStorage.setItem("juda-view-preferences", JSON.stringify(viewPrefs));
            if (colorMode) {
              localStorage.setItem("chakra-ui-color-mode", colorMode);
            }
          } catch (error) {
            console.error("Error saving to localStorage:", error);
          }
        }
        return;
      }

      // Accumulate pending updates
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...updates,
      };

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Debounce save by 500ms
      saveTimerRef.current = setTimeout(async () => {
        const updatesToSave = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};

        try {
          await authFetch("/api/preferences", {
            method: "PUT",
            body: JSON.stringify(updatesToSave),
          });
        } catch (error) {
          console.error("Error saving preferences:", error);
        }
      }, 500);
    },
    [authFetch, isAuthenticated, preferences]
  );

  // Update a single preference
  const updatePreference = useCallback(
    (key, value) => {
      setPreferences(prev => {
        const newPrefs = { ...prev, [key]: value };
        savePreferences({ [key]: value });
        return newPrefs;
      });
    },
    [savePreferences]
  );

  // Update nested preference (e.g., calendarZoom.day)
  const updateNestedPreference = useCallback(
    (parentKey, childKey, value) => {
      setPreferences(prev => {
        const newNested = {
          ...prev[parentKey],
          [childKey]: value,
        };
        const newPrefs = { ...prev, [parentKey]: newNested };
        savePreferences({ [parentKey]: newNested });
        return newPrefs;
      });
    },
    [savePreferences]
  );

  // Bulk update preferences
  const updatePreferences = useCallback(
    updates => {
      setPreferences(prev => {
        const newPrefs = { ...prev, ...updates };
        savePreferences(updates);
        return newPrefs;
      });
    },
    [savePreferences]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    preferences,
    loading,
    initialized,
    updatePreference,
    updateNestedPreference,
    updatePreferences,
    refetch: fetchPreferences,
  };
}

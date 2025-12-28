"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthFetch } from "./useAuthFetch.js";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_PREFERENCES, mergeWithDefaults } from "@/lib/defaultPreferences";

export function usePreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const authFetch = useAuthFetch();
  const { isAuthenticated, initialized: authInitialized } = useAuth();

  // Debounce timer ref for saving
  const saveTimerRef = useRef(null);
  // Track pending updates
  const pendingUpdatesRef = useRef({});

  // Fetch preferences from server
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/preferences");

      if (response.ok) {
        const data = await response.json();
        const mergedPrefs = mergeWithDefaults(data);
        setPreferences(mergedPrefs);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [authFetch]);

  // Only fetch preferences AFTER auth is initialized and user is authenticated
  useEffect(() => {
    if (authInitialized && isAuthenticated) {
      fetchPreferences();
    } else if (authInitialized && !isAuthenticated) {
      // Auth is initialized but user is not authenticated - mark as initialized with defaults
      setLoading(false);
      setInitialized(true);
    }
  }, [authInitialized, isAuthenticated, fetchPreferences]);

  // Save preferences to server (debounced)
  const savePreferences = useCallback(
    async updates => {
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
    [authFetch]
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

"use client";

import { useCallback, useRef } from "react";
import { useGetPreferencesQuery, useUpdatePreferencesMutation } from "@/lib/store/api/preferencesApi";
import { PreferencesContext } from "./PreferencesContextDefinition";
import { DEFAULT_PREFERENCES, mergeWithDefaults } from "@/lib/defaultPreferences";
import { useAuth } from "@/hooks/useAuth";

export function PreferencesProvider({ children }) {
  const { isAuthenticated, initialized: authInitialized } = useAuth();

  // Only fetch preferences if authenticated
  const {
    data: rawPreferences,
    isLoading: loading,
    isFetching,
  } = useGetPreferencesQuery(undefined, {
    skip: !isAuthenticated || !authInitialized,
  });

  const [updatePreferencesMutation] = useUpdatePreferencesMutation();

  // Merge with defaults
  const preferences = rawPreferences ? mergeWithDefaults(rawPreferences) : DEFAULT_PREFERENCES;
  const initialized = authInitialized && (!isAuthenticated || !loading);

  // Debounce timer ref for saving
  const saveTimerRef = useRef(null);
  // Track pending updates
  const pendingUpdatesRef = useRef({});

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
          await updatePreferencesMutation(updatesToSave).unwrap();
        } catch (error) {
          // RTK Query errors can be complex objects - log them properly
          console.error("Error saving preferences:", {
            message: error?.message || "Unknown error",
            status: error?.status,
            data: error?.data,
            error: error,
          });
        }
      }, 500);
    },
    [updatePreferencesMutation]
  );

  // Update a single preference
  const updatePreference = useCallback(
    (key, value) => {
      savePreferences({ [key]: value });
    },
    [savePreferences]
  );

  // Update nested preference (e.g., calendarZoom.day)
  const updateNestedPreference = useCallback(
    (parentKey, childKey, value) => {
      const newNested = {
        ...preferences[parentKey],
        [childKey]: value,
      };
      savePreferences({ [parentKey]: newNested });
    },
    [preferences, savePreferences]
  );

  // Bulk update preferences
  const updatePreferences = useCallback(
    updates => {
      savePreferences(updates);
    },
    [savePreferences]
  );

  const value = {
    preferences,
    loading: loading || isFetching,
    initialized,
    updatePreference,
    updateNestedPreference,
    updatePreferences,
    refetch: () => {}, // RTK Query handles refetching automatically
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

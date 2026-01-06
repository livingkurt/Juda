"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { sseManager } from "@/lib/sse/sseManager";

// We'll use a custom base query that integrates with the existing AuthContext
// Store auth functions in a ref-like object so they're always current
const authFunctions = {
  getAccessToken: null,
  refreshAccessToken: null,
  logout: null,
};

// Function to inject auth functions from AuthContext
export const injectAuthFunctions = ({ getAccessToken, refreshAccessToken, logout }) => {
  authFunctions.getAccessToken = getAccessToken;
  authFunctions.refreshAccessToken = refreshAccessToken;
  authFunctions.logout = logout;
};

// Create the base query once
const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
  prepareHeaders: async headers => {
    // Get access token from auth context
    if (authFunctions.getAccessToken) {
      const token = await authFunctions.getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    headers.set("Content-Type", "application/json");

    // Include client ID for SSE exclusion
    const clientId = sseManager.getClientId();
    if (clientId) {
      headers.set("X-Client-ID", clientId);
    }

    return headers;
  },
});

// Custom base query with authentication
const baseQueryWithAuth = async (args, api, extraOptions) => {
  // Execute the query
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 - try to refresh token and retry
  // Only retry if we have a refresh token (otherwise it's a real auth failure)
  if (result.error && result.error.status === 401) {
    if (authFunctions.refreshAccessToken) {
      const newToken = await authFunctions.refreshAccessToken();

      // Only retry if we successfully got a new token
      // If refreshAccessToken returns null, it means there's no refresh token
      // and we should not retry (user needs to log in)
      if (newToken) {
        // Retry with new token
        result = await baseQuery(args, api, extraOptions);
      }
      // If newToken is null, don't retry - let the query fail
      // The AuthContext will handle showing login screen
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Task", "Section", "Tag", "Completion", "Folder", "SmartFolder", "Preferences", "WorkoutProgram"],
  endpoints: () => ({}),
});

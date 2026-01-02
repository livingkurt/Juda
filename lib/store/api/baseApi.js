import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/**
 * Custom base query that handles authentication and offline detection
 */
const baseQuery = fetchBaseQuery({
  baseUrl: typeof window !== "undefined" ? window.location.origin : "",
  credentials: "include",
  prepareHeaders: async headers => {
    // Get access token from auth context
    // Since we can't use hooks in RTK Query, we'll get it from a global store
    // or make a request to get it
    const token = await getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

/**
 * Get access token - tries to get from auth context or refreshes
 */
async function getAccessToken() {
  if (typeof window === "undefined") return null;

  // Try to get token from auth context via a custom event or global
  // For now, we'll refresh the token if needed
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return data.accessToken;
    }
  } catch (err) {
    console.error("Failed to get access token:", err);
  }

  return null;
}

/**
 * Base query with retry logic and offline handling
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // If unauthorized, try to refresh token and retry
  if (result.error && result.error.status === 401) {
    try {
      const refreshResult = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (refreshResult.ok) {
        const data = await refreshResult.json();
        // Retry the original query with new token
        result = await baseQuery(
          {
            ...args,
            headers: {
              ...args.headers,
              Authorization: `Bearer ${data.accessToken}`,
            },
          },
          api,
          extraOptions
        );
      } else {
        // Refresh failed, redirect to login
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
    }
  }

  // Handle offline errors
  if (result.error && !navigator.onLine) {
    return {
      error: {
        status: "OFFLINE",
        data: { message: "You are currently offline" },
      },
    };
  }

  return result;
};

/**
 * Base API slice with tag types for cache invalidation
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Task", "Tag", "Section", "TaskTag"],
  endpoints: () => ({}),
});

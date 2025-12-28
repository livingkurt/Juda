"use client";

import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

export function useAuthFetch() {
  const { getAccessToken, refreshAccessToken, logout } = useAuth();

  const authFetch = useCallback(
    async (url, options = {}) => {
      let token = await getAccessToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

      const makeRequest = async accessToken => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        return response;
      };

      let response = await makeRequest(token);

      // If unauthorized, try to refresh token and retry once
      if (response.status === 401) {
        const newToken = await refreshAccessToken();

        if (!newToken) {
          logout();
          throw new Error("Session expired");
        }

        response = await makeRequest(newToken);
      }

      return response;
    },
    [getAccessToken, refreshAccessToken, logout]
  );

  return authFetch;
}

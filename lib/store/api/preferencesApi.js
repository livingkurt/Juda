"use client";

import { baseApi } from "./baseApi.js";

export const preferencesApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getPreferences: builder.query({
      query: () => "/preferences",
      providesTags: ["Preferences"],
    }),

    updatePreferences: builder.mutation({
      query: updates => ({
        url: "/preferences",
        method: "PUT",
        body: updates,
      }),
      // Optimistic update for immediate UI response
      async onQueryStarted(updates, { dispatch, queryFulfilled, getState }) {
        // Check if we have valid query data before attempting optimistic update
        const state = getState();
        const currentData = preferencesApi.endpoints.getPreferences.select(undefined)(state);

        // Only do optimistic update if we have valid data (not array/null/undefined)
        let patchResult;
        if (currentData?.data && !Array.isArray(currentData.data) && typeof currentData.data === "object") {
          patchResult = dispatch(
            preferencesApi.util.updateQueryData("getPreferences", undefined, draft => {
              // Merge updates into draft, preserving userId
              Object.assign(draft, updates);
            })
          );
        }

        try {
          const { data } = await queryFulfilled;
          // Update with server response (includes userId)
          dispatch(
            preferencesApi.util.updateQueryData("getPreferences", undefined, draft => {
              // Handle case where draft might be an array (when auth isn't initialized)
              // or null/undefined (when query hasn't run yet)
              if (!draft || Array.isArray(draft)) {
                // If draft is invalid, replace it entirely with server data
                return data;
              }
              Object.assign(draft, data);
            })
          );
        } catch {
          if (patchResult) {
            patchResult.undo();
          }
        }
      },
      invalidatesTags: ["Preferences"],
    }),
  }),
});

export const { useGetPreferencesQuery, useUpdatePreferencesMutation } = preferencesApi;

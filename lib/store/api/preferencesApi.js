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
      async onQueryStarted(updates, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          preferencesApi.util.updateQueryData("getPreferences", undefined, draft => {
            // Merge updates into draft, preserving userId
            Object.assign(draft, updates);
          })
        );
        try {
          const { data } = await queryFulfilled;
          // Update with server response (includes userId)
          dispatch(
            preferencesApi.util.updateQueryData("getPreferences", undefined, draft => {
              Object.assign(draft, data);
            })
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Preferences"],
    }),
  }),
});

export const { useGetPreferencesQuery, useUpdatePreferencesMutation } = preferencesApi;

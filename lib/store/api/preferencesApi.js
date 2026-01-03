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
        body: JSON.stringify(updates),
      }),
      // Optimistic update for immediate UI response
      async onQueryStarted(updates, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          preferencesApi.util.updateQueryData("getPreferences", undefined, draft => {
            Object.assign(draft, updates);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ["Preferences"],
    }),
  }),
});

export const { useGetPreferencesQuery, useUpdatePreferencesMutation } = preferencesApi;

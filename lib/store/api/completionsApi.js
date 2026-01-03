"use client";

import { baseApi } from "./baseApi.js";

// Helper to normalize date to UTC midnight
const normalizeDate = date => {
  const d = date ? new Date(date) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

export const completionsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getCompletions: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.taskId) params.append("taskId", filters.taskId);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        return `/completions?${params}`;
      },
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Completion", id })), { type: "Completion", id: "LIST" }]
          : [{ type: "Completion", id: "LIST" }],
    }),

    createCompletion: builder.mutation({
      query: ({ taskId, date, outcome = "completed", note, time, startedAt, completedAt }) => ({
        url: "/completions",
        method: "POST",
        body: JSON.stringify({
          taskId,
          date: normalizeDate(date).toISOString(),
          outcome,
          note,
          time,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          completedAt: completedAt ? new Date(completedAt).toISOString() : null,
        }),
      }),
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),

    updateCompletion: builder.mutation({
      query: ({ taskId, date, ...patch }) => ({
        url: "/completions",
        method: "PUT",
        body: JSON.stringify({
          taskId,
          date: normalizeDate(date).toISOString(),
          ...patch,
        }),
      }),
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),

    deleteCompletion: builder.mutation({
      query: ({ taskId, date }) => ({
        url: `/completions?taskId=${taskId}&date=${normalizeDate(date).toISOString()}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),

    // Batch create completions
    batchCreateCompletions: builder.mutation({
      query: completions => ({
        url: "/completions/batch",
        method: "POST",
        body: JSON.stringify({
          completions: completions.map(c => ({
            ...c,
            date: normalizeDate(c.date).toISOString(),
          })),
        }),
      }),
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),

    // Batch delete completions
    batchDeleteCompletions: builder.mutation({
      query: completions => ({
        url: "/completions/batch",
        method: "DELETE",
        body: JSON.stringify({
          completions: completions.map(c => ({
            ...c,
            date: normalizeDate(c.date).toISOString(),
          })),
        }),
      }),
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCompletionsQuery,
  useCreateCompletionMutation,
  useUpdateCompletionMutation,
  useDeleteCompletionMutation,
  useBatchCreateCompletionsMutation,
  useBatchDeleteCompletionsMutation,
} = completionsApi;

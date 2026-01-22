"use client";

import { baseApi } from "./baseApi.js";

// Helper to normalize date to UTC midnight
// Handles Date objects, ISO strings, and date strings (YYYY-MM-DD)
const normalizeDate = date => {
  if (!date) {
    // Use local date parts for "today"
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }

  // If it's already a date string in YYYY-MM-DD format, parse it as UTC
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  // If it's an ISO string (contains T or Z), it's already in UTC - use UTC parts
  if (typeof date === "string" && (date.includes("T") || date.includes("Z"))) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

  // For Date objects, use LOCAL date parts (the date the user sees)
  // This ensures Jan 7 local time becomes Jan 7 UTC midnight, not Jan 6
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
};

export const completionsApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: builder => ({
    getCompletions: builder.query({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.taskId) params.append("taskId", filters.taskId);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        return `/completions?${params}`;
      },
      transformResponse: response => {
        // Handle both old format (array) and new format (object with pagination)
        if (Array.isArray(response)) {
          return { completions: response, pagination: null };
        }
        return response;
      },
      providesTags: result => {
        const completions = result?.completions || result || [];
        const completionArray = Array.isArray(completions) ? completions : [];
        return [...completionArray.map(({ id }) => ({ type: "Completion", id })), { type: "Completion", id: "LIST" }];
      },
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
      invalidatesTags: [
        { type: "Completion", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks in case rollover task was deleted
      ],
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
      invalidatesTags: [
        { type: "Completion", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks in case rollover task was deleted
      ],
    }),

    deleteCompletion: builder.mutation({
      query: ({ taskId, date }) => ({
        url: `/completions?taskId=${taskId}&date=${normalizeDate(date).toISOString()}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Completion", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks in case rollover task was deleted
      ],
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
      invalidatesTags: [
        { type: "Completion", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks in case rollover task was deleted
      ],
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
      invalidatesTags: [
        { type: "Completion", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks in case rollover task was deleted
      ],
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

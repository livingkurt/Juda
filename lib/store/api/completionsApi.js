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
    getCompletionsByDateRange: builder.query({
      query: ({ startDate, endDate, limit = 10000 }) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        params.append("limit", String(limit));
        return `/completions?${params}`;
      },
      transformResponse: response => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.completions || [];
      },
      providesTags: (result, error, { startDate, endDate }) => [
        { type: "Completion", id: `RANGE-${startDate}-${endDate}` },
        { type: "Completion", id: "LIST" },
      ],
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
      // Optimistic update - update cache immediately without waiting for server
      async onQueryStarted(
        { taskId, date, outcome = "completed", note, time, startedAt, completedAt },
        { dispatch, queryFulfilled }
      ) {
        const normalizedDate = normalizeDate(date).toISOString();
        const optimisticCompletion = {
          id: `temp-${taskId}-${normalizedDate}-${Date.now()}`,
          taskId,
          date: normalizedDate,
          outcome,
          note: note || null,
          time: time || null,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          completedAt: completedAt ? new Date(completedAt).toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistically update getCompletions query
        const patchResult = dispatch(
          completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
            // Handle both array and paginated formats
            if (Array.isArray(draft)) {
              draft.push(optimisticCompletion);
            } else if (draft?.completions) {
              draft.completions.push(optimisticCompletion);
            }
          })
        );

        try {
          const { data: serverCompletion } = await queryFulfilled;
          // Replace optimistic data with server response
          dispatch(
            completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
              const completions = Array.isArray(draft) ? draft : draft?.completions || [];
              const index = completions.findIndex(c => c.id === optimisticCompletion.id);
              if (index !== -1) {
                completions[index] = serverCompletion;
              }
            })
          );
        } catch {
          // Rollback on error
          patchResult.undo();
        }
      },
      // Only invalidate completions, NOT tasks - this prevents full task refetch
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
      // Optimistic update
      async onQueryStarted({ taskId, date, ...patch }, { dispatch, queryFulfilled, getState }) {
        const normalizedDate = normalizeDate(date).toISOString();

        // Find existing completion to update optimistically
        let existingCompletion = null;
        const state = getState();
        const completionsCache = completionsApi.endpoints.getCompletions.select()(state);
        if (completionsCache?.data) {
          const completions = Array.isArray(completionsCache.data)
            ? completionsCache.data
            : completionsCache.data.completions || [];
          existingCompletion = completions.find(
            c => c.taskId === taskId && normalizeDate(c.date).toISOString() === normalizedDate
          );
        }

        if (existingCompletion) {
          const optimisticCompletion = {
            ...existingCompletion,
            ...patch,
            updatedAt: new Date().toISOString(),
          };

          const patchResult = dispatch(
            completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
              const completions = Array.isArray(draft) ? draft : draft?.completions || [];
              const index = completions.findIndex(
                c => c.taskId === taskId && normalizeDate(c.date).toISOString() === normalizedDate
              );
              if (index !== -1) {
                completions[index] = optimisticCompletion;
              }
            })
          );

          try {
            const { data: serverCompletion } = await queryFulfilled;
            // Replace with server response
            dispatch(
              completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
                const completions = Array.isArray(draft) ? draft : draft?.completions || [];
                const index = completions.findIndex(
                  c => c.taskId === taskId && normalizeDate(c.date).toISOString() === normalizedDate
                );
                if (index !== -1) {
                  completions[index] = serverCompletion;
                }
              })
            );
          } catch {
            patchResult.undo();
          }
        }
      },
      // Only invalidate completions, NOT tasks
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),

    deleteCompletion: builder.mutation({
      query: ({ taskId, date }) => ({
        url: `/completions?taskId=${taskId}&date=${normalizeDate(date).toISOString()}`,
        method: "DELETE",
      }),
      // Optimistic update
      async onQueryStarted({ taskId, date }, { dispatch, queryFulfilled }) {
        const normalizedDate = normalizeDate(date).toISOString();

        // Store the completion we're about to delete for rollback
        let deletedCompletion = null;

        const patchResult = dispatch(
          completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
            const completions = Array.isArray(draft) ? draft : draft?.completions || [];
            const index = completions.findIndex(
              c => c.taskId === taskId && normalizeDate(c.date).toISOString() === normalizedDate
            );
            if (index !== -1) {
              deletedCompletion = completions[index];
              completions.splice(index, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Rollback on error - restore the deleted completion
          if (deletedCompletion) {
            patchResult.undo();
          }
        }
      },
      // Only invalidate completions, NOT tasks
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
      // Optimistic update
      async onQueryStarted(completions, { dispatch, queryFulfilled }) {
        const optimisticCompletions = completions.map(c => ({
          id: `temp-${c.taskId}-${normalizeDate(c.date).toISOString()}-${Date.now()}-${Math.random()}`,
          taskId: c.taskId,
          date: normalizeDate(c.date).toISOString(),
          outcome: c.outcome || "completed",
          note: c.note || null,
          time: c.time || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        const patchResult = dispatch(
          completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
            const completionsArray = Array.isArray(draft) ? draft : draft?.completions || [];
            completionsArray.push(...optimisticCompletions);
          })
        );

        try {
          const { data: serverCompletions } = await queryFulfilled;
          // Replace optimistic data with server responses
          dispatch(
            completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
              const completionsArray = Array.isArray(draft) ? draft : draft?.completions || [];
              // Remove optimistic completions
              optimisticCompletions.forEach(opt => {
                const index = completionsArray.findIndex(c => c.id === opt.id);
                if (index !== -1) {
                  completionsArray.splice(index, 1);
                }
              });
              // Add server completions
              if (Array.isArray(serverCompletions)) {
                completionsArray.push(...serverCompletions);
              } else if (serverCompletions?.completions) {
                completionsArray.push(...serverCompletions.completions);
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
      // Only invalidate completions, NOT tasks
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
      // Optimistic update
      async onQueryStarted(completions, { dispatch, queryFulfilled }) {
        const normalizedCompletions = completions.map(c => ({
          taskId: c.taskId,
          date: normalizeDate(c.date).toISOString(),
        }));

        // Store deleted completions for rollback
        const deletedCompletions = [];

        const patchResult = dispatch(
          completionsApi.util.updateQueryData("getCompletions", undefined, draft => {
            const completionsArray = Array.isArray(draft) ? draft : draft?.completions || [];
            normalizedCompletions.forEach(nc => {
              const index = completionsArray.findIndex(
                c => c.taskId === nc.taskId && normalizeDate(c.date).toISOString() === nc.date
              );
              if (index !== -1) {
                deletedCompletions.push(completionsArray[index]);
                completionsArray.splice(index, 1);
              }
            });
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Rollback on error
          if (deletedCompletions.length > 0) {
            patchResult.undo();
          }
        }
      },
      // Only invalidate completions, NOT tasks
      invalidatesTags: [{ type: "Completion", id: "LIST" }],
    }),
  }),
});

export const {
  useGetCompletionsQuery,
  useGetCompletionsByDateRangeQuery,
  useCreateCompletionMutation,
  useUpdateCompletionMutation,
  useDeleteCompletionMutation,
  useBatchCreateCompletionsMutation,
  useBatchDeleteCompletionsMutation,
} = completionsApi;

"use client";

import { baseApi } from "./baseApi.js";

// Helper to normalize date to UTC midnight
const normalizeDate = date => {
  if (!date) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  }

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  if (typeof date === "string" && (date.includes("T") || date.includes("Z"))) {
    const d = new Date(date);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  }

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
      // DEFERRED OPTIMISTIC UPDATE - Don't block UI
      onQueryStarted(
        { taskId, date, outcome = "completed", note, time, startedAt, completedAt },
        { dispatch, queryFulfilled, getState }
      ) {
        console.warn("[completionsApi.createCompletion] onQueryStarted START", Date.now());

        // Defer the cache update to prevent blocking the UI
        queueMicrotask(() => {
          const normalizedDate = normalizeDate(date).toISOString();
          const newCompletion = {
            id: `temp-${taskId}-${normalizedDate}`,
            taskId,
            date: normalizedDate,
            outcome,
            note: note || null,
            time: time || null,
            startedAt: startedAt ? new Date(startedAt).toISOString() : null,
            completedAt: completedAt ? new Date(completedAt).toISOString() : null,
            createdAt: new Date().toISOString(),
          };

          // Find all cached queries and update them
          const patches = [];
          const cachedQueries = completionsApi.util.selectInvalidatedBy(getState(), [
            { type: "Completion", id: "LIST" },
          ]);
          console.warn("[completionsApi.createCompletion] Found cached queries:", cachedQueries.length, Date.now());

          for (const { endpointName, originalArgs } of cachedQueries) {
            if (endpointName !== "getCompletions") continue;

            const patch = dispatch(
              completionsApi.util.updateQueryData("getCompletions", originalArgs, draft => {
                if (!draft?.completions) return;
                // Remove existing if any
                const idx = draft.completions.findIndex(
                  c => c.taskId === taskId && new Date(c.date).toISOString() === normalizedDate
                );
                if (idx !== -1) draft.completions.splice(idx, 1);
                // Add new
                draft.completions.push(newCompletion);
              })
            );
            patches.push(patch);
          }

          console.warn("[completionsApi.createCompletion] onQueryStarted END", Date.now());

          // On error, undo all patches
          queryFulfilled.catch(() => patches.forEach(p => p.undo()));
        });
      },
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
      onQueryStarted({ taskId, date, ...patchData }, { dispatch, queryFulfilled, getState }) {
        const normalizedDate = normalizeDate(date).toISOString();
        const patches = [];
        const cachedQueries = completionsApi.util.selectInvalidatedBy(getState(), [{ type: "Completion", id: "LIST" }]);

        for (const { endpointName, originalArgs } of cachedQueries) {
          if (endpointName !== "getCompletions") continue;

          const patch = dispatch(
            completionsApi.util.updateQueryData("getCompletions", originalArgs, draft => {
              if (!draft?.completions) return;
              const completion = draft.completions.find(
                c => c.taskId === taskId && new Date(c.date).toISOString() === normalizedDate
              );
              if (completion) Object.assign(completion, patchData);
            })
          );
          patches.push(patch);
        }

        queryFulfilled.catch(() => patches.forEach(p => p.undo()));
      },
    }),

    deleteCompletion: builder.mutation({
      query: ({ taskId, date }) => ({
        url: `/completions?taskId=${taskId}&date=${normalizeDate(date).toISOString()}`,
        method: "DELETE",
      }),
      onQueryStarted({ taskId, date }, { dispatch, queryFulfilled, getState }) {
        const normalizedDate = normalizeDate(date).toISOString();
        const patches = [];
        const cachedQueries = completionsApi.util.selectInvalidatedBy(getState(), [{ type: "Completion", id: "LIST" }]);

        for (const { endpointName, originalArgs } of cachedQueries) {
          if (endpointName !== "getCompletions") continue;

          const patch = dispatch(
            completionsApi.util.updateQueryData("getCompletions", originalArgs, draft => {
              if (!draft?.completions) return;
              const idx = draft.completions.findIndex(
                c => c.taskId === taskId && new Date(c.date).toISOString() === normalizedDate
              );
              if (idx !== -1) draft.completions.splice(idx, 1);
            })
          );
          patches.push(patch);
        }

        queryFulfilled.catch(() => patches.forEach(p => p.undo()));
      },
    }),

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
      onQueryStarted(completions, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const cachedQueries = completionsApi.util.selectInvalidatedBy(getState(), [{ type: "Completion", id: "LIST" }]);

        for (const { endpointName, originalArgs } of cachedQueries) {
          if (endpointName !== "getCompletions") continue;

          const patch = dispatch(
            completionsApi.util.updateQueryData("getCompletions", originalArgs, draft => {
              if (!draft?.completions) return;

              for (const { taskId, date, outcome = "completed", note, time } of completions) {
                const normalizedDate = normalizeDate(date).toISOString();
                // Remove existing
                const idx = draft.completions.findIndex(
                  c => c.taskId === taskId && new Date(c.date).toISOString() === normalizedDate
                );
                if (idx !== -1) draft.completions.splice(idx, 1);
                // Add new
                draft.completions.push({
                  id: `temp-batch-${taskId}-${normalizedDate}`,
                  taskId,
                  date: normalizedDate,
                  outcome,
                  note: note || null,
                  time: time || null,
                  createdAt: new Date().toISOString(),
                });
              }
            })
          );
          patches.push(patch);
        }

        queryFulfilled.catch(() => patches.forEach(p => p.undo()));
      },
    }),

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
      onQueryStarted(completions, { dispatch, queryFulfilled, getState }) {
        const patches = [];
        const cachedQueries = completionsApi.util.selectInvalidatedBy(getState(), [{ type: "Completion", id: "LIST" }]);

        for (const { endpointName, originalArgs } of cachedQueries) {
          if (endpointName !== "getCompletions") continue;

          const patch = dispatch(
            completionsApi.util.updateQueryData("getCompletions", originalArgs, draft => {
              if (!draft?.completions) return;

              for (const { taskId, date } of completions) {
                const normalizedDate = normalizeDate(date).toISOString();
                const idx = draft.completions.findIndex(
                  c => c.taskId === taskId && new Date(c.date).toISOString() === normalizedDate
                );
                if (idx !== -1) draft.completions.splice(idx, 1);
              }
            })
          );
          patches.push(patch);
        }

        queryFulfilled.catch(() => patches.forEach(p => p.undo()));
      },
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

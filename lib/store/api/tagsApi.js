"use client";

import { baseApi } from "./baseApi.js";

export const tagsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getTags: builder.query({
      query: () => "/tags",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Tag", id })), { type: "Tag", id: "LIST" }]
          : [{ type: "Tag", id: "LIST" }],
    }),

    createTag: builder.mutation({
      query: ({ name, color }) => ({
        url: "/tags",
        method: "POST",
        body: JSON.stringify({ name, color }),
      }),
      invalidatesTags: [{ type: "Tag", id: "LIST" }],
    }),

    updateTag: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: "/tags",
        method: "PUT",
        body: JSON.stringify({ id, ...patch }),
      }),
      // Also invalidate tasks since they display tags
      invalidatesTags: (result, error, { id }) => [
        { type: "Tag", id },
        { type: "Task", id: "LIST" },
      ],
    }),

    deleteTag: builder.mutation({
      query: id => ({
        url: `/tags?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Tag", id: "LIST" },
        { type: "Task", id: "LIST" },
      ],
    }),

    // Batch update task tags
    updateTaskTags: builder.mutation({
      query: ({ taskId, tagIds }) => ({
        url: "/task-tags/batch",
        method: "POST",
        body: JSON.stringify({ taskId, tagIds }),
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "Task", id: taskId }],
    }),
  }),
});

export const {
  useGetTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useUpdateTaskTagsMutation,
} = tagsApi;

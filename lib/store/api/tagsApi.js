import { baseApi } from "./baseApi.js";

export const tagsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Get all tags
    getTags: builder.query({
      query: () => "/api/tags",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Tag", id })), { type: "Tag", id: "LIST" }]
          : [{ type: "Tag", id: "LIST" }],
    }),

    // Get tag by ID
    getTagById: builder.query({
      query: id => `/api/tags?id=${id}`,
      providesTags: (result, error, id) => [{ type: "Tag", id }],
    }),

    // Create tag
    createTag: builder.mutation({
      query: tagData => ({
        url: "/api/tags",
        method: "POST",
        body: tagData,
      }),
      invalidatesTags: [{ type: "Tag", id: "LIST" }],
      // Optimistic update
      async onQueryStarted(tagData, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tagsApi.util.updateQueryData("getTags", undefined, draft => {
            const newTag = {
              ...tagData,
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            draft.push(newTag);
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Replace optimistic tag with real one
          dispatch(
            tagsApi.util.updateQueryData("getTags", undefined, draft => {
              const index = draft.findIndex(t => t.id === patchResult.inversePatches[0].path[0]);
              if (index !== -1) {
                draft[index] = data;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Update tag
    updateTag: builder.mutation({
      query: ({ id, ...tagData }) => ({
        url: "/api/tags",
        method: "PUT",
        body: { id, ...tagData },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Tag", id },
        { type: "Tag", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks since they contain tags
      ],
      // Optimistic update
      async onQueryStarted({ id, ...tagData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tagsApi.util.updateQueryData("getTags", undefined, draft => {
            const tag = draft.find(t => t.id === id);
            if (tag) {
              Object.assign(tag, tagData, { updatedAt: new Date().toISOString() });
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with server response
          dispatch(
            tagsApi.util.updateQueryData("getTags", undefined, draft => {
              const index = draft.findIndex(t => t.id === id);
              if (index !== -1) {
                draft[index] = data;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Delete tag
    deleteTag: builder.mutation({
      query: id => ({
        url: `/api/tags?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Tag", id },
        { type: "Tag", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks since they contain tags
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tagsApi.util.updateQueryData("getTags", undefined, draft => {
            const index = draft.findIndex(t => t.id === id);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Batch update task tags
    batchUpdateTaskTags: builder.mutation({
      query: ({ taskId, tagIds }) => ({
        url: "/api/task-tags/batch",
        method: "POST",
        body: { taskId, tagIds },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Task", id: taskId },
        { type: "Task", id: "LIST" },
        { type: "Tag", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTagsQuery,
  useGetTagByIdQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useBatchUpdateTaskTagsMutation,
} = tagsApi;

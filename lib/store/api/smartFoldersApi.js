"use client";

import { baseApi } from "./baseApi.js";

export const smartFoldersApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getSmartFolders: builder.query({
      query: () => "/smart-folders",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "SmartFolder", id })), { type: "SmartFolder", id: "LIST" }]
          : [{ type: "SmartFolder", id: "LIST" }],
    }),

    createSmartFolder: builder.mutation({
      query: folderData => ({
        url: "/smart-folders",
        method: "POST",
        body: JSON.stringify(folderData),
      }),
      invalidatesTags: [{ type: "SmartFolder", id: "LIST" }],
    }),

    updateSmartFolder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: "/smart-folders",
        method: "PUT",
        body: JSON.stringify({ id, ...patch }),
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "SmartFolder", id }],
    }),

    deleteSmartFolder: builder.mutation({
      query: id => ({
        url: `/smart-folders?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "SmartFolder", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSmartFoldersQuery,
  useCreateSmartFolderMutation,
  useUpdateSmartFolderMutation,
  useDeleteSmartFolderMutation,
} = smartFoldersApi;

"use client";

import { baseApi } from "./baseApi.js";

export const foldersApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getFolders: builder.query({
      query: () => "/folders",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Folder", id })), { type: "Folder", id: "LIST" }]
          : [{ type: "Folder", id: "LIST" }],
    }),

    createFolder: builder.mutation({
      query: folderData => ({
        url: "/folders",
        method: "POST",
        body: JSON.stringify(folderData),
      }),
      invalidatesTags: [{ type: "Folder", id: "LIST" }],
    }),

    updateFolder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: "/folders",
        method: "PUT",
        body: JSON.stringify({ id, ...patch }),
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Folder", id }],
    }),

    deleteFolder: builder.mutation({
      query: id => ({
        url: `/folders?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Folder", id: "LIST" }],
    }),
  }),
});

export const { useGetFoldersQuery, useCreateFolderMutation, useUpdateFolderMutation, useDeleteFolderMutation } =
  foldersApi;

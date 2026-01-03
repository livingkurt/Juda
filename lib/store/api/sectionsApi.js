"use client";

import { baseApi } from "./baseApi.js";

export const sectionsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getSections: builder.query({
      query: () => "/sections",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Section", id })), { type: "Section", id: "LIST" }]
          : [{ type: "Section", id: "LIST" }],
    }),

    createSection: builder.mutation({
      query: sectionData => ({
        url: "/sections",
        method: "POST",
        body: JSON.stringify(sectionData),
      }),
      invalidatesTags: [{ type: "Section", id: "LIST" }],
    }),

    updateSection: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: "/sections",
        method: "PUT",
        body: JSON.stringify({ id, ...patch }),
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            const section = draft.find(s => s.id === id);
            if (section) Object.assign(section, patch);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Section", id }],
    }),

    deleteSection: builder.mutation({
      query: id => ({
        url: `/sections?id=${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            const index = draft.findIndex(s => s.id === id);
            if (index !== -1) draft.splice(index, 1);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: [{ type: "Section", id: "LIST" }],
    }),

    reorderSections: builder.mutation({
      query: sections => ({
        url: "/sections/reorder",
        method: "PUT",
        body: JSON.stringify({ sections }),
      }),
      async onQueryStarted(sections, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            sections.forEach((s, index) => {
              const section = draft.find(sec => sec.id === s.id);
              if (section) section.order = index;
            });
            draft.sort((a, b) => a.order - b.order);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: [{ type: "Section", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useReorderSectionsMutation,
} = sectionsApi;

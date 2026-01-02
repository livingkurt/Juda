import { baseApi } from "./baseApi.js";

export const sectionsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Get all sections
    getSections: builder.query({
      query: () => "/api/sections",
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Section", id })), { type: "Section", id: "LIST" }]
          : [{ type: "Section", id: "LIST" }],
    }),

    // Get section by ID
    getSectionById: builder.query({
      query: id => `/api/sections?id=${id}`,
      providesTags: (result, error, id) => [{ type: "Section", id }],
    }),

    // Create section
    createSection: builder.mutation({
      query: sectionData => ({
        url: "/api/sections",
        method: "POST",
        body: sectionData,
      }),
      invalidatesTags: [{ type: "Section", id: "LIST" }],
      // Optimistic update
      async onQueryStarted(sectionData, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            const newSection = {
              ...sectionData,
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            draft.push(newSection);
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Replace optimistic section with real one
          dispatch(
            sectionsApi.util.updateQueryData("getSections", undefined, draft => {
              const index = draft.findIndex(s => s.id === patchResult.inversePatches[0].path[0]);
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

    // Update section
    updateSection: builder.mutation({
      query: ({ id, ...sectionData }) => ({
        url: "/api/sections",
        method: "PUT",
        body: { id, ...sectionData },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Section", id },
        { type: "Section", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks since they reference sections
      ],
      // Optimistic update
      async onQueryStarted({ id, ...sectionData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            const section = draft.find(s => s.id === id);
            if (section) {
              Object.assign(section, sectionData, { updatedAt: new Date().toISOString() });
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with server response
          dispatch(
            sectionsApi.util.updateQueryData("getSections", undefined, draft => {
              const index = draft.findIndex(s => s.id === id);
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

    // Delete section
    deleteSection: builder.mutation({
      query: id => ({
        url: `/api/sections?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Section", id },
        { type: "Section", id: "LIST" },
        { type: "Task", id: "LIST" }, // Invalidate tasks since they reference sections
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            const index = draft.findIndex(s => s.id === id);
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

    // Reorder sections
    reorderSections: builder.mutation({
      query: ({ updates }) => ({
        url: "/api/sections/reorder",
        method: "PUT",
        body: { updates },
      }),
      invalidatesTags: [{ type: "Section", id: "LIST" }],
      // Optimistic update
      async onQueryStarted({ updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          sectionsApi.util.updateQueryData("getSections", undefined, draft => {
            updates.forEach(({ id, order }) => {
              const section = draft.find(s => s.id === id);
              if (section) {
                section.order = order;
                section.updatedAt = new Date().toISOString();
              }
            });
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetSectionsQuery,
  useGetSectionByIdQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useReorderSectionsMutation,
} = sectionsApi;

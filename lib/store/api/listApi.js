"use client";

import { baseApi } from "./baseApi.js";

export const listApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // List Tags (scoped to list only)
    getListTags: builder.query({
      query: () => "/list-tags",
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "ListTag", id: t.id })), { type: "ListTag", id: "LIST" }]
          : [{ type: "ListTag", id: "LIST" }],
    }),
    createListTag: builder.mutation({
      query: body => ({ url: "/list-tags", method: "POST", body: JSON.stringify(body) }),
      invalidatesTags: [{ type: "ListTag", id: "LIST" }],
    }),

    // List Items (Library)
    getListItems: builder.query({
      query: () => "/list-items",
      providesTags: result =>
        result
          ? [...result.map(item => ({ type: "ListItem", id: item.id })), { type: "ListItem", id: "LIST" }]
          : [{ type: "ListItem", id: "LIST" }],
    }),
    createListItem: builder.mutation({
      query: body => ({ url: "/list-items", method: "POST", body: JSON.stringify(body) }),
      invalidatesTags: [{ type: "ListItem", id: "LIST" }],
    }),
    updateListItem: builder.mutation({
      query: body => ({ url: "/list-items", method: "PUT", body: JSON.stringify(body) }),
      invalidatesTags: (result, error, body) => [{ type: "ListItem", id: body.id }, { type: "ListItem", id: "LIST" }],
    }),
    updateListItemTags: builder.mutation({
      query: ({ id, tagIds }) => ({ url: "/list-items", method: "PUT", body: JSON.stringify({ id, tagIds }) }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ListItem", id },
        { type: "ListItem", id: "LIST" },
      ],
    }),
    deleteListItem: builder.mutation({
      query: id => ({ url: `/list-items?id=${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "ListItem", id: "LIST" }, { type: "ListTemplate", id: "LIST" }],
    }),

    // List Templates
    getListTemplates: builder.query({
      query: () => "/list-templates",
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "ListTemplate", id: t.id })), { type: "ListTemplate", id: "LIST" }]
          : [{ type: "ListTemplate", id: "LIST" }],
    }),
    createListTemplate: builder.mutation({
      query: body => ({ url: "/list-templates", method: "POST", body: JSON.stringify(body) }),
      invalidatesTags: [{ type: "ListTemplate", id: "LIST" }],
    }),
    updateListTemplate: builder.mutation({
      query: body => ({ url: "/list-templates", method: "PUT", body: JSON.stringify(body) }),
      invalidatesTags: (result, error, body) => [
        { type: "ListTemplate", id: body.id },
        { type: "ListTemplate", id: "LIST" },
      ],
    }),
    deleteListTemplate: builder.mutation({
      query: id => ({ url: `/list-templates?id=${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "ListTemplate", id: "LIST" }],
    }),
    reorderListTemplates: builder.mutation({
      query: body => ({ url: "/list-templates/reorder", method: "PUT", body: JSON.stringify(body) }),
      invalidatesTags: [{ type: "ListTemplate", id: "LIST" }],
    }),

    // List Instances
    getListInstances: builder.query({
      query: () => "/list-instances",
      providesTags: result =>
        result
          ? [...result.map(i => ({ type: "ListInstance", id: i.id })), { type: "ListInstance", id: "LIST" }]
          : [{ type: "ListInstance", id: "LIST" }],
    }),
    createListInstance: builder.mutation({
      query: body => ({ url: "/list-instances", method: "POST", body: JSON.stringify(body) }),
      invalidatesTags: [{ type: "ListInstance", id: "LIST" }, { type: "Task", id: "LIST" }],
    }),
    updateListInstance: builder.mutation({
      query: body => ({ url: "/list-instances", method: "PUT", body: JSON.stringify(body) }),
      invalidatesTags: (result, error, body) => [
        { type: "ListInstance", id: body.id },
        { type: "ListInstance", id: "LIST" },
      ],
    }),
    deleteListInstance: builder.mutation({
      query: id => ({ url: `/list-instances?id=${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "ListInstance", id: "LIST" }, { type: "Task", id: "LIST" }],
    }),
    toggleListInstanceItems: builder.mutation({
      query: ({ instanceId, items }) => ({
        url: `/list-instances/${instanceId}/items`,
        method: "PUT",
        body: JSON.stringify({ items }),
      }),
      invalidatesTags: (result, error, { instanceId }) => [
        { type: "ListInstance", id: instanceId },
        { type: "ListInstance", id: "LIST" },
      ],
    }),
    addInstanceItems: builder.mutation({
      query: ({ instanceId, items, newItems }) => ({
        url: `/list-instances/${instanceId}/items`,
        method: "POST",
        body: JSON.stringify({ items, newItems }),
      }),
      invalidatesTags: (result, error, { instanceId }) => [
        { type: "ListInstance", id: instanceId },
        { type: "ListInstance", id: "LIST" },
      ],
    }),
    removeInstanceItems: builder.mutation({
      query: ({ instanceId, itemIds }) => ({
        url: `/list-instances/${instanceId}/items?itemIds=${itemIds.join(",")}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { instanceId }) => [
        { type: "ListInstance", id: instanceId },
        { type: "ListInstance", id: "LIST" },
      ],
    }),
    updateTemplateFromInstance: builder.mutation({
      query: ({ instanceId }) => ({
        url: `/list-instances/${instanceId}/update-template`,
        method: "POST",
        body: JSON.stringify({}),
      }),
      invalidatesTags: [
        { type: "ListTemplate", id: "LIST" },
        { type: "ListInstance", id: "LIST" },
      ],
    }),
    saveInstanceAsTemplate: builder.mutation({
      query: ({ instanceId, name, description }) => ({
        url: `/list-instances/${instanceId}/save-as-template`,
        method: "POST",
        body: JSON.stringify({ name, description }),
      }),
      invalidatesTags: [{ type: "ListTemplate", id: "LIST" }],
    }),

    // List Tasks (for Today/Backlog integration)
    getListTasks: builder.query({
      query: () => "/tasks/list",
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "LIST" }]
          : [{ type: "Task", id: "LIST" }],
    }),
  }),
});

export const {
  useGetListTagsQuery,
  useCreateListTagMutation,
  useGetListItemsQuery,
  useUpdateListItemTagsMutation,
  useCreateListItemMutation,
  useUpdateListItemMutation,
  useDeleteListItemMutation,
  useGetListTemplatesQuery,
  useCreateListTemplateMutation,
  useUpdateListTemplateMutation,
  useDeleteListTemplateMutation,
  useReorderListTemplatesMutation,
  useGetListInstancesQuery,
  useCreateListInstanceMutation,
  useUpdateListInstanceMutation,
  useDeleteListInstanceMutation,
  useToggleListInstanceItemsMutation,
  useAddInstanceItemsMutation,
  useRemoveInstanceItemsMutation,
  useUpdateTemplateFromInstanceMutation,
  useSaveInstanceAsTemplateMutation,
  useGetListTasksQuery,
} = listApi;

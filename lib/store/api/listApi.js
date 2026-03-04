"use client";

import { baseApi } from "./baseApi.js";

export const listApi = baseApi.injectEndpoints({
  endpoints: builder => ({
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
  useGetListItemsQuery,
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
  useGetListTasksQuery,
} = listApi;

"use client";

import { baseApi } from "./baseApi.js";

export const reflectionGoalsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getReflectionGoals: builder.query({
      query: reflectionTaskId => `/reflection-goals?reflectionTaskId=${reflectionTaskId}`,
      providesTags: (result, _error, reflectionTaskId) => [{ type: "ReflectionGoal", id: reflectionTaskId }],
    }),
    updateReflectionGoals: builder.mutation({
      query: body => ({
        url: "/reflection-goals",
        method: "PUT",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (result, _error, { reflectionTaskId }) => [{ type: "ReflectionGoal", id: reflectionTaskId }],
    }),
  }),
});

export const { useGetReflectionGoalsQuery, useUpdateReflectionGoalsMutation } = reflectionGoalsApi;

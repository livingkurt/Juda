"use client";

import { baseApi } from "./baseApi.js";

export const goalsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // GET all goals with subtasks
    getGoals: builder.query({
      query: ({ year, includeSubgoals = true } = {}) => {
        const params = new URLSearchParams();
        if (year) params.append("year", year);
        if (!includeSubgoals) params.append("includeSubgoals", "false");
        return `/goals?${params.toString()}`;
      },
      providesTags: result =>
        result
          ? [...result.allGoals.map(({ id }) => ({ type: "Task", id })), { type: "Task", id: "GOALS_LIST" }]
          : [{ type: "Task", id: "GOALS_LIST" }],
    }),
  }),
});

export const { useGetGoalsQuery } = goalsApi;

"use client";

import { baseApi } from "./baseApi.js";

export const workoutProgramsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getWorkoutProgram: builder.query({
      query: taskId => `/workout-programs?taskId=${taskId}`,
      providesTags: (result, error, taskId) => [{ type: "WorkoutProgram", id: taskId }],
    }),

    saveWorkoutProgram: builder.mutation({
      query: ({ taskId, ...programData }) => ({
        url: "/workout-programs",
        method: "POST",
        body: JSON.stringify({ taskId, ...programData }),
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: "WorkoutProgram", id: taskId }],
    }),

    deleteWorkoutProgram: builder.mutation({
      query: taskId => ({
        url: `/workout-programs?taskId=${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, taskId) => [{ type: "WorkoutProgram", id: taskId }],
    }),
  }),
});

export const { useGetWorkoutProgramQuery, useSaveWorkoutProgramMutation, useDeleteWorkoutProgramMutation } =
  workoutProgramsApi;

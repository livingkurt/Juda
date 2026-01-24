"use client";

import { baseApi } from "./baseApi.js";

export const reflectionQuestionsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getReflectionQuestions: builder.query({
      query: ({ taskId, date }) => {
        const params = new URLSearchParams();
        params.append("taskId", taskId);
        if (date) params.append("date", date);
        return `/reflection-questions?${params.toString()}`;
      },
      providesTags: (result, _error, { taskId }) => [{ type: "ReflectionQuestion", id: taskId }],
    }),
    createReflectionQuestions: builder.mutation({
      query: body => ({
        url: "/reflection-questions",
        method: "POST",
        body: JSON.stringify(body),
      }),
      invalidatesTags: (result, _error, { taskId }) => [{ type: "ReflectionQuestion", id: taskId }],
    }),
    updateReflectionQuestions: builder.mutation({
      query: body => ({
        url: "/reflection-questions",
        method: "PUT",
        body: JSON.stringify(body),
      }),
      invalidatesTags: result =>
        result?.taskId ? [{ type: "ReflectionQuestion", id: result.taskId }] : [{ type: "ReflectionQuestion" }],
    }),
    versionReflectionQuestions: builder.mutation({
      async queryFn(
        { taskId, currentId, newQuestions, includeGoalReflection, goalReflectionQuestion },
        _api,
        _extraOptions,
        baseQuery
      ) {
        try {
          const endDate = new Date().toISOString();
          await baseQuery({
            url: "/reflection-questions",
            method: "PUT",
            body: JSON.stringify({
              id: currentId,
              endDate,
            }),
          });

          const result = await baseQuery({
            url: "/reflection-questions",
            method: "POST",
            body: JSON.stringify({
              taskId,
              questions: newQuestions,
              includeGoalReflection: includeGoalReflection || false,
              goalReflectionQuestion: goalReflectionQuestion || null,
              startDate: endDate,
            }),
          });

          if (result.error) {
            return { error: result.error };
          }

          return { data: result.data };
        } catch (error) {
          return { error };
        }
      },
      invalidatesTags: (_result, _error, { taskId }) => [{ type: "ReflectionQuestion", id: taskId }],
    }),
  }),
});

export const {
  useGetReflectionQuestionsQuery,
  useCreateReflectionQuestionsMutation,
  useUpdateReflectionQuestionsMutation,
  useVersionReflectionQuestionsMutation,
} = reflectionQuestionsApi;

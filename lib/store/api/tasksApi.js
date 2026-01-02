import { baseApi } from "./baseApi.js";

/**
 * Transform task data to include tags array
 */
function transformTask(task) {
  if (!task) return task;

  return {
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || task.tags || [],
    subtasks: task.subtasks || [],
  };
}

/**
 * Transform array of tasks
 */
function transformTasks(tasks) {
  if (!Array.isArray(tasks)) return tasks;
  return tasks.map(transformTask);
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Get all tasks
    getTasks: builder.query({
      query: () => "/api/tasks",
      transformResponse: response => {
        const tasks = Array.isArray(response) ? response : [response];
        return transformTasks(tasks);
      },
      providesTags: result =>
        result
          ? [...result.map(({ id }) => ({ type: "Task", id })), { type: "Task", id: "LIST" }]
          : [{ type: "Task", id: "LIST" }],
    }),

    // Get single task by ID
    getTaskById: builder.query({
      query: id => `/api/tasks?id=${id}`,
      transformResponse: transformTask,
      providesTags: (result, error, id) => [{ type: "Task", id }],
    }),

    // Create task
    createTask: builder.mutation({
      query: taskData => ({
        url: "/api/tasks",
        method: "POST",
        body: taskData,
      }),
      transformResponse: transformTask,
      invalidatesTags: [{ type: "Task", id: "LIST" }],
      // Optimistic update
      async onQueryStarted(taskData, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const newTask = {
              ...taskData,
              id: `temp-${Date.now()}`,
              tags: [],
              subtasks: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            draft.push(newTask);
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Replace optimistic task with real one
          dispatch(
            tasksApi.util.updateQueryData("getTasks", undefined, draft => {
              const index = draft.findIndex(t => t.id === patchResult.inversePatches[0].path[0]);
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

    // Update task
    updateTask: builder.mutation({
      query: ({ id, ...taskData }) => ({
        url: "/api/tasks",
        method: "PUT",
        body: { id, ...taskData },
      }),
      transformResponse: transformTask,
      invalidatesTags: (result, error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
      ],
      // Optimistic update
      async onQueryStarted({ id, ...taskData }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const task = draft.find(t => t.id === id);
            if (task) {
              Object.assign(task, taskData, { updatedAt: new Date().toISOString() });
            }
          })
        );

        try {
          const { data } = await queryFulfilled;
          // Update with server response
          dispatch(
            tasksApi.util.updateQueryData("getTasks", undefined, draft => {
              const index = draft.findIndex(t => t.id === id);
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

    // Delete task
    deleteTask: builder.mutation({
      query: id => ({
        url: `/api/tasks?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
      ],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const index = draft.findIndex(t => t.id === id);
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

    // Reorder task
    reorderTask: builder.mutation({
      query: ({ taskId, sourceSectionId, targetSectionId, newOrder }) => ({
        url: "/api/tasks/reorder",
        method: "PUT",
        body: { taskId, sourceSectionId, targetSectionId, newOrder },
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
      // Optimistic update
      async onQueryStarted({ taskId, targetSectionId, newOrder }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const task = draft.find(t => t.id === taskId);
            if (task) {
              task.sectionId = targetSectionId;
              task.order = newOrder;
              task.updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
          // Refetch to get correct order
          dispatch(tasksApi.endpoints.getTasks.initiate());
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Batch update tasks
    batchUpdateTasks: builder.mutation({
      query: ({ taskIds, updates }) => ({
        url: "/api/tasks/batch-update",
        method: "POST",
        body: { taskIds, updates },
      }),
      invalidatesTags: result =>
        result?.tasks
          ? [...result.tasks.map(({ id }) => ({ type: "Task", id })), { type: "Task", id: "LIST" }]
          : [{ type: "Task", id: "LIST" }],
    }),

    // Batch reorder tasks
    batchReorderTasks: builder.mutation({
      query: ({ updates }) => ({
        url: "/api/tasks/batch-reorder",
        method: "PUT",
        body: { updates },
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // Batch save tasks (for subtasks)
    batchSaveTasks: builder.mutation({
      query: ({ tasks: tasksToSave }) => ({
        url: "/api/tasks/batch-save",
        method: "POST",
        body: { tasks: tasksToSave },
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // Batch delete tasks
    batchDeleteTasks: builder.mutation({
      query: ({ taskIds }) => ({
        url: "/api/tasks/batch-save",
        method: "DELETE",
        body: { taskIds },
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
  useBatchUpdateTasksMutation,
  useBatchReorderTasksMutation,
  useBatchSaveTasksMutation,
  useBatchDeleteTasksMutation,
} = tasksApi;

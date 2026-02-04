"use client";

import { baseApi } from "./baseApi.js";

// Helper to organize tasks with subtasks
const organizeTasksWithSubtasks = tasks => {
  const tasksMap = new Map(tasks.map(t => [t.id, { ...t, subtasks: [] }]));
  const rootTasks = [];

  tasks.forEach(task => {
    const taskWithSubtasks = tasksMap.get(task.id);
    if (task.parentId && tasksMap.has(task.parentId)) {
      // This is a subtask - add it to its parent
      tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
    } else {
      // This is a root task
      rootTasks.push(taskWithSubtasks);
    }
  });

  return rootTasks;
};

// Helper to recursively update a task in the tree
const updateTaskInTree = (tasks, taskId, updates) => {
  // Special case: if parentId is being set to null, we need to promote the subtask to root level
  if (updates.parentId === null) {
    let promotedTask = null;

    // First, find and remove the task from wherever it is (including subtasks)
    const removeAndCapture = taskList => {
      return taskList
        .map(t => {
          if (t.id === taskId) {
            // Found it! Capture it and mark for removal
            promotedTask = { ...t, ...updates, subtasks: t.subtasks || [] };
            return null; // Mark for removal
          }
          if (t.subtasks && t.subtasks.length > 0) {
            const updatedSubtasks = removeAndCapture(t.subtasks);
            return { ...t, subtasks: updatedSubtasks.filter(st => st !== null) };
          }
          return t;
        })
        .filter(t => t !== null);
    };

    const updatedTasks = removeAndCapture(tasks);

    // If we found and captured the task, add it to root level
    if (promotedTask) {
      return [...updatedTasks, promotedTask];
    }

    return updatedTasks;
  }

  // Normal update case
  return tasks.map(t => {
    if (t.id === taskId) {
      return { ...t, ...updates };
    }
    if (t.subtasks && t.subtasks.length > 0) {
      return { ...t, subtasks: updateTaskInTree(t.subtasks, taskId, updates) };
    }
    return t;
  });
};

// Helper to recursively remove a task from the tree
const removeTaskFromTree = (tasks, taskId) => {
  const filtered = tasks.filter(t => t.id !== taskId);
  return filtered.map(t => {
    if (t.subtasks && t.subtasks.length > 0) {
      return { ...t, subtasks: removeTaskFromTree(t.subtasks, taskId) };
    }
    return t;
  });
};

export const tasksApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // GET all tasks (legacy - still used by some components)
    getTasks: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append("page", String(params.page));
        if (params.limit) searchParams.append("limit", String(params.limit));
        if (params.all) searchParams.append("all", "true");
        if (params.date) searchParams.append("date", params.date);
        if (params.view) searchParams.append("view", params.view);
        if (params.offset) searchParams.append("offset", String(params.offset));
        const queryString = searchParams.toString();
        return `/tasks${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: response => {
        const tasksArray = Array.isArray(response) ? response : response.tasks || [];
        return organizeTasksWithSubtasks(tasksArray);
      },
      providesTags: result =>
        result
          ? [...result.flatMap(t => [{ type: "Task", id: t.id }]), { type: "Task", id: "LIST" }]
          : [{ type: "Task", id: "LIST" }],
    }),

    // GET tasks for a specific date (Today view)
    // Much faster than loading all tasks - only returns tasks for that date
    getTasksForDate: builder.query({
      query: date => `/tasks/today?date=${date}`,
      // Tasks are already organized with subtasks from the API
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "TODAY" }]
          : [{ type: "Task", id: "TODAY" }],
    }),

    // GET backlog tasks only
    // Much faster - only returns tasks without sections/dates
    getBacklogTasks: builder.query({
      query: () => `/tasks/backlog`,
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "BACKLOG" }]
          : [{ type: "Task", id: "BACKLOG" }],
    }),

    // GET note tasks only (NotesTab)
    getNoteTasks: builder.query({
      query: () => `/tasks/notes`,
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "NOTES" }]
          : [{ type: "Task", id: "NOTES" }],
    }),

    // GET workout tasks only (WorkoutTab)
    getWorkoutTasks: builder.query({
      query: () => `/tasks/workout`,
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "WORKOUT" }]
          : [{ type: "Task", id: "WORKOUT" }],
    }),

    // GET recurring tasks only (JournalTab, HistoryTab)
    getRecurringTasks: builder.query({
      query: () => `/tasks/recurring`,
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "RECURRING" }]
          : [{ type: "Task", id: "RECURRING" }],
    }),

    // GET calendar tasks for a date range
    getCalendarTasks: builder.query({
      query: ({ start, end }) => `/tasks/calendar?start=${start}&end=${end}`,
      providesTags: result =>
        result
          ? [...result.map(t => ({ type: "Task", id: t.id })), { type: "Task", id: "CALENDAR" }]
          : [{ type: "Task", id: "CALENDAR" }],
    }),

    getTasksPaginated: builder.query({
      query: ({ page = 1, limit = 100 } = {}) => {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("limit", String(limit));
        return `/tasks?${params.toString()}`;
      },
      transformResponse: response => {
        const tasksArray = response?.tasks || [];
        return {
          tasks: organizeTasksWithSubtasks(tasksArray),
          pagination: response?.pagination || null,
        };
      },
      providesTags: result =>
        result?.tasks
          ? [...result.tasks.flatMap(t => [{ type: "Task", id: t.id }]), { type: "Task", id: "LIST" }]
          : [{ type: "Task", id: "LIST" }],
    }),

    // CREATE task
    createTask: builder.mutation({
      query: taskData => ({
        url: "/tasks",
        method: "POST",
        body: JSON.stringify(taskData),
      }),
      invalidatesTags: (result, error, taskData) => {
        const tags = [
          { type: "Task", id: "LIST" }, // Legacy query
          { type: "Task", id: "BACKLOG" }, // Backlog view
          { type: "Task", id: "TODAY" }, // Today view
          { type: "Task", id: "CALENDAR" }, // Calendar view
        ];
        // Also invalidate goals list if creating a goal
        if (taskData.completionType === "goal") {
          tags.push({ type: "Task", id: "GOALS_LIST" });
          // Invalidate specific year if goalYear is provided
          if (taskData.goalYear) {
            tags.push({ type: "Task", id: `YEAR_${taskData.goalYear}` });
          }
        }
        return tags;
      },
    }),

    // UPDATE task
    updateTask: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: "/tasks",
        method: "PUT",
        body: JSON.stringify({ id, ...patch }),
      }),
      // Optimistic update - useDeferredValue handles deferred rendering
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled, getState }) {
        // Update legacy getTasks cache
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const updated = updateTaskInTree(draft, id, patch);
            draft.splice(0, draft.length, ...updated);
          })
        );

        // Collect all patch results for rollback
        const patchResults = [patchResult];

        // Find the task being updated from backlog cache
        let taskFromBacklog = null;
        const backlogState = tasksApi.endpoints.getBacklogTasks.select(undefined)(getState());
        if (backlogState?.data) {
          taskFromBacklog = backlogState.data.find(t => t.id === id);
        }

        // Update backlog cache - remove task if it's being scheduled
        if (patch.recurrence || patch.time) {
          const backlogPatch = dispatch(
            tasksApi.util.updateQueryData("getBacklogTasks", undefined, draft => {
              const index = draft.findIndex(t => t.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            })
          );
          patchResults.push(backlogPatch);
        }

        // If task has a recurrence with startDate, add it to the today cache for that date
        if (taskFromBacklog && patch.recurrence?.startDate) {
          // Extract date from startDate (format: YYYY-MM-DDTHH:MM:SS.SSSZ)
          const dateStr = patch.recurrence.startDate.split("T")[0];

          // Update the today cache for that specific date
          const todayPatch = dispatch(
            tasksApi.util.updateQueryData("getTasksForDate", dateStr, draft => {
              // Add the updated task to the today list
              const updatedTask = { ...taskFromBacklog, ...patch };
              draft.push(updatedTask);
            })
          );
          patchResults.push(todayPatch);
        }

        try {
          const { data: updatedTask } = await queryFulfilled;

          // Update legacy getTasks with server response
          dispatch(
            tasksApi.util.updateQueryData("getTasks", undefined, draft => {
              // Flatten the tree to get all tasks
              const flattenTasks = taskList => {
                const result = [];
                taskList.forEach(task => {
                  const { subtasks, ...taskWithoutSubtasks } = task;
                  result.push(taskWithoutSubtasks);
                  if (subtasks && subtasks.length > 0) {
                    result.push(...flattenTasks(subtasks));
                  }
                });
                return result;
              };

              const flatTasks = flattenTasks(draft);
              // Update the specific task - preserve order if not in server response
              const updatedFlatTasks = flatTasks.map(t => {
                if (t.id === id) {
                  // Preserve order field if server response doesn't include it
                  const order = updatedTask.order !== undefined ? updatedTask.order : t.order;
                  return { ...t, ...updatedTask, order };
                }
                return t;
              });
              // Reorganize into tree structure
              const reorganized = organizeTasksWithSubtasks(updatedFlatTasks);
              draft.splice(0, draft.length, ...reorganized);
            })
          );
        } catch {
          // Rollback all optimistic updates on error
          patchResults.forEach(patch => patch.undo());
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "TODAY" }, // Invalidate today view when task changes
        { type: "Task", id: "BACKLOG" }, // Invalidate backlog when task changes
      ],
    }),

    // DELETE task
    deleteTask: builder.mutation({
      query: id => ({
        url: `/tasks?id=${id}`,
        method: "DELETE",
      }),
      // Optimistic delete
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const updated = removeTaskFromTree(draft, id);
            draft.splice(0, draft.length, ...updated);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // REORDER task (single task reorder within/between sections)
    reorderTask: builder.mutation({
      query: ({ taskId, sourceSectionId, targetSectionId, newOrder }) => ({
        url: "/tasks/reorder",
        method: "PUT",
        body: JSON.stringify({ taskId, sourceSectionId, targetSectionId, newOrder }),
      }),
      // Optimistic update for smooth drag experience
      async onQueryStarted({ taskId, targetSectionId, newOrder }, { dispatch, queryFulfilled }) {
        // Simple optimistic update: just update the moved task's sectionId and order
        // The full reordering happens on the server; if it fails, we'll undo
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const updated = updateTaskInTree(draft, taskId, {
              sectionId: targetSectionId,
              order: newOrder,
            });
            draft.splice(0, draft.length, ...updated);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      // Don't invalidate tags - optimistic update handles it, prevents refetch lag
      // invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // BATCH reorder tasks
    batchReorderTasks: builder.mutation({
      query: updates => ({
        url: "/tasks/batch-reorder",
        method: "PUT",
        body: JSON.stringify({ updates }),
      }),
      // Optimistic update
      async onQueryStarted(updates, { dispatch, queryFulfilled }) {
        const updatesMap = new Map(updates.map(u => [u.id, u.order]));
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, draft => {
            const updateOrder = tasks => {
              for (const task of tasks) {
                if (updatesMap.has(task.id)) {
                  task.order = updatesMap.get(task.id);
                }
                if (task.subtasks?.length) updateOrder(task.subtasks);
              }
            };
            updateOrder(draft);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      // Don't invalidate tags - optimistic update handles it, prevents page freeze
      // invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // BATCH update tasks (for bulk edit)
    batchUpdateTasks: builder.mutation({
      query: ({ taskIds, updates }) => ({
        url: "/tasks/batch-update",
        method: "POST",
        body: JSON.stringify({ taskIds, updates }),
      }),
      invalidatesTags: (result, error, { taskIds }) => taskIds.map(id => ({ type: "Task", id })),
    }),

    // BATCH save subtasks
    batchSaveTasks: builder.mutation({
      query: tasks => ({
        url: "/tasks/batch-save",
        method: "POST",
        body: JSON.stringify({ tasks }),
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // BATCH delete subtasks
    batchDeleteTasks: builder.mutation({
      query: taskIds => ({
        url: "/tasks/batch-save",
        method: "DELETE",
        body: JSON.stringify({ taskIds }),
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    // ROLLOVER task
    rolloverTask: builder.mutation({
      query: ({ taskId, date }) => ({
        url: "/tasks/rollover",
        method: "POST",
        body: JSON.stringify({ taskId, date }),
      }),
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Completion", id: "LIST" },
      ],
    }),

    // CREATE off-schedule completion
    createOffScheduleCompletion: builder.mutation({
      query: body => ({
        url: "/tasks/off-schedule",
        method: "POST",
        body: JSON.stringify(body),
      }),
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Completion", id: "LIST" },
      ],
    }),

    // DELETE off-schedule completion
    deleteOffScheduleCompletion: builder.mutation({
      query: body => ({
        url: "/tasks/off-schedule",
        method: "DELETE",
        body: JSON.stringify(body),
      }),
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Completion", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTasksPaginatedQuery,
  useGetTasksForDateQuery, // Tasks for specific date (Today view)
  useGetBacklogTasksQuery, // Backlog tasks only
  useGetNoteTasksQuery, // Note tasks only (NotesTab)
  useGetWorkoutTasksQuery, // Workout tasks only (WorkoutTab)
  useGetRecurringTasksQuery, // Recurring tasks (JournalTab, HistoryTab)
  useGetCalendarTasksQuery, // Calendar tasks for date range
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useReorderTaskMutation,
  useBatchReorderTasksMutation,
  useBatchUpdateTasksMutation,
  useBatchSaveTasksMutation,
  useBatchDeleteTasksMutation,
  useRolloverTaskMutation,
  useCreateOffScheduleCompletionMutation,
  useDeleteOffScheduleCompletionMutation,
} = tasksApi;

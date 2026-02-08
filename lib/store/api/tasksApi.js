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

const updateTaskInList = (draft, id, patch) => {
  const index = draft.findIndex(task => task.id === id);
  if (index !== -1) {
    draft[index] = { ...draft[index], ...patch };
  }
};

const applyOrderUpdates = (draft, updatesById) => {
  draft.forEach((task, index) => {
    const nextOrder = updatesById.get(task.id);
    if (nextOrder !== undefined) {
      draft[index] = { ...task, order: nextOrder };
    }
  });
};

export const tasksApi = baseApi.injectEndpoints({
  endpoints: builder => ({
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
      // Optimistic update for notes
      async onQueryStarted(taskData, { dispatch, queryFulfilled }) {
        // If creating a note, optimistically add it to the notes cache
        if (taskData.completionType === "note") {
          const patchResult = dispatch(
            tasksApi.util.updateQueryData("getNoteTasks", undefined, draft => {
              // Create a temporary note object for optimistic update
              const optimisticNote = {
                id: `temp-${Date.now()}`,
                title: taskData.title || "Untitled Note",
                content: taskData.content || "",
                completionType: "note",
                folderId: taskData.folderId || null,
                sectionId: taskData.sectionId || null,
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              draft.push(optimisticNote);
            })
          );

          try {
            const { data: createdNote } = await queryFulfilled;
            // Replace optimistic note with real one
            dispatch(
              tasksApi.util.updateQueryData("getNoteTasks", undefined, draft => {
                const index = draft.findIndex(n => n.id?.startsWith("temp-"));
                if (index !== -1) {
                  draft[index] = createdNote;
                } else {
                  // If optimistic note not found, just add the real one
                  draft.push(createdNote);
                }
              })
            );
          } catch {
            // Rollback optimistic update on error
            patchResult.undo();
          }
        }
      },
      invalidatesTags: (result, error, taskData) => {
        const tags = [
          { type: "Task", id: "LIST" }, // Legacy query
          { type: "Task", id: "BACKLOG" }, // Backlog view
          { type: "Task", id: "TODAY" }, // Today view
          { type: "Task", id: "CALENDAR" }, // Calendar view
        ];
        // Invalidate notes list if creating a note
        if (taskData.completionType === "note") {
          tags.push({ type: "Task", id: "NOTES" });
        }
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
      // Optimistic updates for specialized caches only
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled, getState }) {
        const patchResults = [];

        // Find the task being updated from notes cache
        const notesState = tasksApi.endpoints.getNoteTasks.select(undefined)(getState());
        let taskFromNotes = null;
        if (notesState?.data) {
          const notesById = new Map(notesState.data.map(task => [task.id, task]));
          taskFromNotes = notesById.get(id);
        }

        const state = getState();
        const queries = state.api.queries;
        let taskFromToday = null;

        Object.keys(queries).forEach(key => {
          if (!key.startsWith("getTasksForDate")) return;
          const query = queries[key];
          const foundTask = query?.data?.find(t => t.id === id);
          if (foundTask && !taskFromToday) {
            taskFromToday = foundTask;
          }
        });

        // Update notes cache optimistically if it's a note
        if (taskFromNotes) {
          const notesPatch = dispatch(
            tasksApi.util.updateQueryData("getNoteTasks", undefined, draft => {
              updateTaskInList(draft, id, patch);
            })
          );
          patchResults.push(notesPatch);
        }

        // Find the task being updated from backlog cache
        let taskFromBacklog = null;
        const backlogState = tasksApi.endpoints.getBacklogTasks.select(undefined)(getState());
        if (backlogState?.data) {
          const backlogById = new Map(backlogState.data.map(task => [task.id, task]));
          taskFromBacklog = backlogById.get(id);
        }

        const shouldAddToBacklog = patch.recurrence === null && patch.sectionId === null;

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
        } else if (shouldAddToBacklog && taskFromToday && !taskFromBacklog) {
          const backlogPatch = dispatch(
            tasksApi.util.updateQueryData("getBacklogTasks", undefined, draft => {
              const exists = draft.some(t => t.id === id);
              if (!exists) {
                draft.push({ ...taskFromToday, ...patch });
              } else {
                updateTaskInList(draft, id, patch);
              }
            })
          );
          patchResults.push(backlogPatch);
        } else {
          const backlogPatch = dispatch(
            tasksApi.util.updateQueryData("getBacklogTasks", undefined, draft => {
              updateTaskInList(draft, id, patch);
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

        const shouldRemoveFromToday = patch.recurrence === null;

        Object.keys(queries).forEach(key => {
          if (!key.startsWith("getTasksForDate")) return;
          const query = queries[key];
          const hasTask = query?.data?.some(t => t.id === id);
          if (!hasTask) return;

          const dateMatch = key.match(/getTasksForDate\("([^"]+)"\)/);
          if (!dateMatch) return;

          const date = dateMatch[1];
          const todayPatch = dispatch(
            tasksApi.util.updateQueryData("getTasksForDate", date, draft => {
              if (shouldRemoveFromToday) {
                const index = draft.findIndex(t => t.id === id);
                if (index !== -1) {
                  draft.splice(index, 1);
                }
                return;
              }
              updateTaskInList(draft, id, patch);
            })
          );
          patchResults.push(todayPatch);
        });

        try {
          const { data: updatedTask } = await queryFulfilled;

          // Update notes cache with server response if it's a note
          if (taskFromNotes) {
            dispatch(
              tasksApi.util.updateQueryData("getNoteTasks", undefined, draft => {
                const index = draft.findIndex(n => n.id === id);
                if (index !== -1) {
                  draft[index] = updatedTask;
                }
              })
            );
          }
        } catch {
          // Rollback all optimistic updates on error
          patchResults.forEach(patch => patch.undo());
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "TODAY" }, // Invalidate today view when task changes
        { type: "Task", id: "BACKLOG" }, // Invalidate backlog when task changes
        { type: "Task", id: "NOTES" }, // Invalidate notes list when task changes (covers note updates)
        { type: "Task", id: "CALENDAR" }, // Invalidate calendar when task changes
        { type: "Task", id: "WORKOUT" }, // Invalidate workout list when task changes
        { type: "Task", id: "RECURRING" }, // Invalidate recurring tasks when task changes
      ],
    }),

    // DELETE task
    deleteTask: builder.mutation({
      query: id => ({
        url: `/tasks?id=${id}`,
        method: "DELETE",
      }),
      // Optimistic delete
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const patchResults = [];

        // Optimistically remove from notes cache if it's a note
        const notesState = tasksApi.endpoints.getNoteTasks.select(undefined)(getState());
        if (notesState?.data?.some(n => n.id === id)) {
          const notesPatch = dispatch(
            tasksApi.util.updateQueryData("getNoteTasks", undefined, draft => {
              const index = draft.findIndex(n => n.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            })
          );
          patchResults.push(notesPatch);
        }

        // Optimistically remove from backlog cache
        const backlogState = tasksApi.endpoints.getBacklogTasks.select(undefined)(getState());
        if (backlogState?.data?.some(t => t.id === id)) {
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

        // Optimistically remove from all getTasksForDate caches
        // We need to check all possible date caches that might contain this task
        const state = getState();
        const queries = state.api.queries;
        Object.keys(queries).forEach(key => {
          if (key.startsWith("getTasksForDate")) {
            const query = queries[key];
            if (query?.data?.some(t => t.id === id)) {
              const dateMatch = key.match(/getTasksForDate\("([^"]+)"\)/);
              if (dateMatch) {
                const date = dateMatch[1];
                const todayPatch = dispatch(
                  tasksApi.util.updateQueryData("getTasksForDate", date, draft => {
                    const index = draft.findIndex(t => t.id === id);
                    if (index !== -1) {
                      draft.splice(index, 1);
                    }
                  })
                );
                patchResults.push(todayPatch);
              }
            }
          }
        });

        // Optimistically remove from calendar cache
        const calendarState = tasksApi.endpoints.getCalendarTasks.select(undefined)(getState());
        if (calendarState?.data?.some(t => t.id === id)) {
          const calendarPatch = dispatch(
            tasksApi.util.updateQueryData("getCalendarTasks", undefined, draft => {
              const index = draft.findIndex(t => t.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            })
          );
          patchResults.push(calendarPatch);
        }

        try {
          await queryFulfilled;
        } catch {
          // Rollback all optimistic updates on error
          patchResults.forEach(patch => patch.undo());
        }
      },
      invalidatesTags: [
        { type: "Task", id: "LIST" },
        { type: "Task", id: "NOTES" }, // Invalidate notes list when deleting
        { type: "Task", id: "BACKLOG" }, // Invalidate backlog when deleting
        { type: "Task", id: "TODAY" }, // Invalidate today view when deleting
        { type: "Task", id: "CALENDAR" }, // Invalidate calendar when deleting
      ],
    }),

    // REORDER task (single task reorder within/between sections)
    reorderTask: builder.mutation({
      query: ({ taskId, sourceSectionId, targetSectionId, newOrder }) => ({
        url: "/tasks/reorder",
        method: "PUT",
        body: JSON.stringify({ taskId, sourceSectionId, targetSectionId, newOrder }),
      }),
      // Invalidate all relevant caches - reordering can affect multiple views
      invalidatesTags: [
        { type: "Task", id: "TODAY" },
        { type: "Task", id: "BACKLOG" },
        { type: "Task", id: "CALENDAR" },
      ],
    }),

    // BATCH reorder tasks
    batchReorderTasks: builder.mutation({
      query: updates => ({
        url: "/tasks/batch-reorder",
        method: "PUT",
        body: JSON.stringify({ updates }),
      }),
      async onQueryStarted(updates, { dispatch, queryFulfilled, getState }) {
        const patchResults = [];
        const updatesById = new Map(updates.map(update => [update.id, update.order]));

        const backlogState = tasksApi.endpoints.getBacklogTasks.select(undefined)(getState());
        if (backlogState?.data?.some(task => updatesById.has(task.id))) {
          const backlogPatch = dispatch(
            tasksApi.util.updateQueryData("getBacklogTasks", undefined, draft => {
              applyOrderUpdates(draft, updatesById);
            })
          );
          patchResults.push(backlogPatch);
        }

        const state = getState();
        const queries = state.api.queries;
        Object.keys(queries).forEach(key => {
          if (!key.startsWith("getTasksForDate")) return;
          const query = queries[key];
          if (!query?.data?.some(task => updatesById.has(task.id))) return;

          const dateMatch = key.match(/getTasksForDate\("([^"]+)"\)/);
          if (!dateMatch) return;
          const date = dateMatch[1];
          const todayPatch = dispatch(
            tasksApi.util.updateQueryData("getTasksForDate", date, draft => {
              applyOrderUpdates(draft, updatesById);
            })
          );
          patchResults.push(todayPatch);
        });

        try {
          await queryFulfilled;
        } catch {
          patchResults.forEach(patch => patch.undo());
        }
      },
      // Invalidate all relevant caches - batch reordering can affect multiple views
      invalidatesTags: [
        { type: "Task", id: "TODAY" },
        { type: "Task", id: "BACKLOG" },
        { type: "Task", id: "CALENDAR" },
      ],
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

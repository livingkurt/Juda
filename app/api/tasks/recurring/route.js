import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, asc, isNotNull } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { sql } from "drizzle-orm";

/**
 * GET /api/tasks/recurring
 *
 * Returns ONLY recurring tasks (recurrence.type !== "none" and not null).
 * Used by JournalTab and HistoryTab.
 * Much faster than loading all tasks and filtering client-side.
 */
export const GET = withApi(async (request, { userId }) => {
  const apiStart = Date.now();

  // Query only tasks with recurrence from DB
  // We need to check that recurrence JSON has type that is not "none"
  const recurringTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNotNull(tasks.recurrence),
      // Check that recurrence->>'type' is not 'none'
      sql`${tasks.recurrence}->>'type' IS NOT NULL AND ${tasks.recurrence}->>'type' != 'none'`
    ),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [asc(tasks.sectionId), asc(tasks.order)],
  });

  const dbTime = Date.now() - apiStart;

  // Organize tasks with subtasks and tags
  const tasksMap = new Map(
    recurringTasks.map(t => [t.id, { ...t, subtasks: [], tags: t.taskTags?.map(tt => tt.tag) || [] }])
  );

  const rootTasks = [];

  recurringTasks.forEach(task => {
    const taskWithSubtasks = tasksMap.get(task.id);
    if (task.parentId && tasksMap.has(task.parentId)) {
      tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
    } else if (!task.parentId) {
      rootTasks.push(taskWithSubtasks);
    }
  });

  console.warn(
    `[GET /api/tasks/recurring] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, Tasks: ${recurringTasks.length}`
  );

  return NextResponse.json(rootTasks);
});

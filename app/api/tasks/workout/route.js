import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";

/**
 * GET /api/tasks/workout
 *
 * Returns ONLY workout tasks (completionType === "workout").
 * Much faster than loading all tasks and filtering client-side.
 */
export const GET = withApi(async (request, { userId }) => {
  const apiStart = Date.now();

  // Query only workout tasks directly from DB
  const workoutTasks = await db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), eq(tasks.completionType, "workout")),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [asc(tasks.order)],
  });

  const dbTime = Date.now() - apiStart;

  // Organize tasks with subtasks and tags
  const tasksMap = new Map(
    workoutTasks.map(t => [t.id, { ...t, subtasks: [], tags: t.taskTags?.map(tt => tt.tag) || [] }])
  );

  const rootTasks = [];

  workoutTasks.forEach(task => {
    const taskWithSubtasks = tasksMap.get(task.id);
    if (task.parentId && tasksMap.has(task.parentId)) {
      tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
    } else if (!task.parentId) {
      rootTasks.push(taskWithSubtasks);
    }
  });

  console.warn(
    `[GET /api/tasks/workout] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, Tasks: ${workoutTasks.length}`
  );

  return NextResponse.json(rootTasks);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";

/**
 * GET /api/tasks/list
 *
 * Returns ONLY list tasks (completionType === "list") without parents.
 */
export const GET = withApi(async (request, { userId }) => {
  const listTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.completionType, "list"),
      isNull(tasks.parentId)
    ),
    with: {
      section: true,
      taskTags: { with: { tag: true } },
    },
    orderBy: [asc(tasks.order)],
  });

  const tasksMap = new Map(
    listTasks.map(t => [t.id, { ...t, subtasks: [], tags: t.taskTags?.map(tt => tt.tag) || [] }])
  );

  const rootTasks = [];
  listTasks.forEach(task => {
    const taskWithSubtasks = tasksMap.get(task.id);
    if (!task.parentId) {
      rootTasks.push(taskWithSubtasks);
    }
  });

  return NextResponse.json(rootTasks);
});

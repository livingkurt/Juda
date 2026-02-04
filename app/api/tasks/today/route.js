import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { shouldShowOnDate } from "@/lib/utils";

/**
 * GET /api/tasks/today?date=2024-02-04
 *
 * Returns ONLY tasks that should appear on a specific date.
 * This is a focused endpoint that returns much less data than loading all tasks.
 *
 * Filtering logic:
 * - Excludes notes and goals (they have their own tabs)
 * - Excludes subtasks (they're nested in parent tasks)
 * - Includes tasks that match the date via shouldShowOnDate()
 * - Includes in-progress non-recurring tasks with no date
 */
export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const apiStart = Date.now();
  const searchParams = getSearchParams();
  const dateParam = searchParams.get("date");

  if (!dateParam) {
    return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
  }

  const targetDate = new Date(dateParam);

  // Load all tasks for this user (we need to filter by recurrence logic)
  const allTasks = await db.query.tasks.findMany({
    where: eq(tasks.userId, userId),
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

  // Organize tasks with subtasks
  const tasksMap = new Map(
    allTasks.map(t => [t.id, { ...t, subtasks: [], tags: t.taskTags?.map(tt => tt.tag) || [] }])
  );
  const rootTasks = [];

  allTasks.forEach(task => {
    const taskWithSubtasks = tasksMap.get(task.id);
    if (task.parentId && tasksMap.has(task.parentId)) {
      tasksMap.get(task.parentId).subtasks.push(taskWithSubtasks);
    } else if (!task.parentId) {
      rootTasks.push(taskWithSubtasks);
    }
  });

  // Filter tasks for this date
  const todayTasks = rootTasks.filter(task => {
    // Exclude notes
    if (task.completionType === "note") return false;
    // Exclude goals
    if (task.completionType === "goal") return false;

    // Include in-progress non-recurring tasks with no date
    const isNonRecurring = !task.recurrence || task.recurrence.type === "none";
    if (isNonRecurring && task.status === "in_progress") {
      const hasNoDate = !task.recurrence || !task.recurrence.startDate;
      if (hasNoDate) return true;
    }

    // Use shouldShowOnDate for recurrence logic
    return shouldShowOnDate(task, targetDate);
  });

  // Filter out completed tasks if they shouldn't show (basic server-side check)
  // Note: Frontend does more advanced filtering based on user preference
  // We just want to ensure we don't send tasks that are definitely not for today

  console.warn(
    `[GET /api/tasks/today] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, All: ${allTasks.length}, Filtered: ${todayTasks.length}`
  );

  return NextResponse.json(todayTasks);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, asc, isNotNull, sql } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { shouldShowOnDate } from "@/lib/utils";

const parseLocalDate = dateStr => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const dateIsInRange = (task, startDate, endDate) => {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (shouldShowOnDate(task, cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
};

/**
 * GET /api/tasks/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns tasks that could appear on the calendar within the date range.
 * Excludes notes/goals and filters by recurrence/date logic using shouldShowOnDate.
 */
export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const apiStart = Date.now();
  const searchParams = getSearchParams();
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const startDate = parseLocalDate(startParam);
  const endDate = parseLocalDate(endParam);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start and end parameters are required" }, { status: 400 });
  }

  // Fetch tasks with recurrence defined (includes type "none")
  const allTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      isNotNull(tasks.recurrence),
      sql`${tasks.recurrence}->>'type' IS NOT NULL`,
      sql`${tasks.completionType} NOT IN ('note','goal')`
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

  // Build task tree with tags
  const tasksMap = new Map(
    allTasks.map(task => [task.id, { ...task, subtasks: [], tags: task.taskTags?.map(tt => tt.tag) || [] }])
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

  const calendarTasks = rootTasks.filter(task => dateIsInRange(task, startDate, endDate));

  console.warn(
    `[GET /api/tasks/calendar] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, All: ${allTasks.length}, Filtered: ${calendarTasks.length}`
  );

  return NextResponse.json(calendarTasks);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskCompletions } from "@/lib/schema";
import { eq, and, asc, isNotNull, sql, gte, lte, inArray } from "drizzle-orm";
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

const dateIsInRange = (task, startDate, endDate, getOutcomeOnDate) => {
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (shouldShowOnDate(task, cursor, getOutcomeOnDate)) return true;
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

  // Load completions for the date range (including one day before for rollover logic)
  const rangeStartWithBuffer = new Date(startDate);
  rangeStartWithBuffer.setDate(rangeStartWithBuffer.getDate() - 1);
  const rangeStartUTC = new Date(
    Date.UTC(
      rangeStartWithBuffer.getFullYear(),
      rangeStartWithBuffer.getMonth(),
      rangeStartWithBuffer.getDate(),
      0,
      0,
      0,
      0
    )
  );
  const rangeEndUTC = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));

  const completions = await db.query.taskCompletions.findMany({
    where: and(
      inArray(
        taskCompletions.taskId,
        allTasks.map(t => t.id)
      ),
      gte(taskCompletions.date, rangeStartUTC),
      lte(taskCompletions.date, rangeEndUTC)
    ),
  });

  // Build completion lookup map
  const completionMap = new Map();
  completions.forEach(completion => {
    const dateStr = completion.date.toISOString().split("T")[0];
    const key = `${completion.taskId}|${dateStr}`;
    completionMap.set(key, completion);
  });

  // Helper to get outcome for a task on a specific date
  const getOutcomeOnDate = (taskId, date) => {
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const key = `${taskId}|${dateStr}`;
    return completionMap.get(key)?.outcome || null;
  };

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

  const calendarTasks = rootTasks.filter(task => dateIsInRange(task, startDate, endDate, getOutcomeOnDate));

  console.warn(
    `[GET /api/tasks/calendar] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, All: ${allTasks.length}, Filtered: ${calendarTasks.length}`
  );

  return NextResponse.json(calendarTasks);
});

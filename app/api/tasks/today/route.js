import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskCompletions } from "@/lib/schema";
import { eq, asc, and, lte, inArray, desc } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { shouldShowOnDate, formatLocalDate } from "@/lib/utils";

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
 * - Includes tasks rolled over from the previous day
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

  const targetDayEnd = new Date(
    Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
  );

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

  // Load completions up to target day (for rollover detection)
  const completions = await db.query.taskCompletions.findMany({
    where: and(
      inArray(
        taskCompletions.taskId,
        allTasks.map(t => t.id)
      ),
      lte(taskCompletions.date, targetDayEnd)
    ),
    orderBy: [desc(taskCompletions.date)],
  });

  // Build latest completion map (most recent per task)
  const latestCompletionByTask = new Map();
  completions.forEach(completion => {
    if (!latestCompletionByTask.has(completion.taskId)) {
      latestCompletionByTask.set(completion.taskId, completion);
    }
  });

  // Helper to get latest outcome on or before a date
  const getLatestOutcomeOnOrBeforeDate = (taskId, date) => {
    const completion = latestCompletionByTask.get(taskId);
    if (!completion) return null;
    const completionDateStr = formatLocalDate(completion.date);
    const targetDateStr = formatLocalDate(date);
    if (completionDateStr > targetDateStr) return null;
    return { outcome: completion.outcome || null, date: completion.date };
  };

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

  const targetDateStr = formatLocalDate(targetDate);

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

    // Use shouldShowOnDate for recurrence logic (with rollover support)
    return shouldShowOnDate(task, targetDate, null, getLatestOutcomeOnOrBeforeDate);
  });

  // Attach rollover metadata for UI (if latest outcome is rolled_over)
  const todayTasksWithRollover = todayTasks.map(task => {
    const latest = getLatestOutcomeOnOrBeforeDate(task.id, targetDate);
    const latestDateStr = latest?.date ? formatLocalDate(latest.date) : null;
    const rolloverCarryForward = latest?.outcome === "rolled_over" && latestDateStr && latestDateStr <= targetDateStr;

    if (!rolloverCarryForward) {
      return task;
    }

    return {
      ...task,
      rolloverCarryForward: true,
      rolledOverFromDate: latestDateStr,
    };
  });

  console.warn(
    `[GET /api/tasks/today] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, All: ${allTasks.length}, Filtered: ${todayTasks.length}`
  );

  return NextResponse.json(todayTasksWithRollover);
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, isNull, or, asc, inArray } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { shouldShowOnDate, hasFutureDateTime } from "@/lib/utils";

/**
 * GET /api/tasks/backlog
 *
 * Returns ONLY backlog tasks (tasks without sections/dates).
 * This is a focused endpoint that returns much less data than loading all tasks.
 *
 * Backlog criteria:
 * - No sectionId (not assigned to a section)
 * - Does NOT show on today's date (via shouldShowOnDate)
 * - Does NOT have a future date/time
 * - Is NOT a recurring task (those show on their scheduled dates)
 * - Is NOT a note or goal
 * - Has NOT been completed on any date (one-time tasks disappear after completion)
 */
export const GET = withApi(async (request, { userId }) => {
  const apiStart = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Query only tasks without sections (potential backlog items)
  // This is more efficient than loading ALL tasks
  const potentialBacklogTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.userId, userId),
      or(isNull(tasks.sectionId), eq(tasks.sectionId, "")),
      isNull(tasks.parentId) // Exclude subtasks
    ),
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

  // Add tags to tasks
  const tasksWithTags = potentialBacklogTasks.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
    subtasks: [],
  }));

  // Fetch and attach subtasks for backlog tasks
  const parentIds = tasksWithTags.map(task => task.id);
  const subtaskRows =
    parentIds.length > 0
      ? await db.query.tasks.findMany({
          where: and(eq(tasks.userId, userId), inArray(tasks.parentId, parentIds)),
          with: {
            taskTags: {
              with: {
                tag: true,
              },
            },
          },
          orderBy: [asc(tasks.order)],
        })
      : [];

  const tasksMap = new Map(tasksWithTags.map(t => [t.id, t]));
  subtaskRows.forEach(subtask => {
    const parent = tasksMap.get(subtask.parentId);
    if (!parent) return;
    parent.subtasks.push({
      ...subtask,
      tags: subtask.taskTags?.map(tt => tt.tag) || [],
    });
  });

  // Filter to actual backlog tasks
  const backlogTasks = tasksWithTags.filter(task => {
    // Already filtered by sectionId in query, but double-check
    if (task.sectionId) return false;

    // If task shows on today's view, don't show in backlog
    if (shouldShowOnDate(task, today)) return false;

    // Exclude tasks with future date/time
    if (hasFutureDateTime(task)) return false;

    // For recurring tasks, they should NEVER appear in backlog
    if (task.recurrence?.type && task.recurrence.type !== "none") {
      return false;
    }

    // Exclude notes
    if (task.completionType === "note") return false;

    // Exclude goals
    if (task.completionType === "goal") return false;

    return true;
  });

  console.warn(
    `[GET /api/tasks/backlog] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, Potential: ${potentialBacklogTasks.length}, Filtered: ${backlogTasks.length}`
  );

  return NextResponse.json(backlogTasks);
});

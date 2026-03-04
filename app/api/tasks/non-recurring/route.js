import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskTags, tags } from "@/lib/schema";
import { eq, and, asc, desc, isNull, or, inArray, ilike, sql, ne } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";

/**
 * GET /api/tasks/non-recurring
 *
 * Returns paginated non-recurring tasks (recurrence is null or type === "none").
 * Supports search, tag filtering, priority filtering, completion type filtering, and status filtering.
 */
export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const offset = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  const tagIdsParam = searchParams.get("tagIds") || "";
  const prioritiesParam = searchParams.get("priorities") || "";
  const completionTypesParam = searchParams.get("completionTypes") || "";
  const statusesParam = searchParams.get("statuses") || "";

  const filterTagIds = tagIdsParam ? tagIdsParam.split(",").filter(Boolean) : [];
  const filterPriorities = prioritiesParam ? prioritiesParam.split(",").filter(Boolean) : [];
  const filterCompletionTypes = completionTypesParam ? completionTypesParam.split(",").filter(Boolean) : [];
  const filterStatuses = statusesParam ? statusesParam.split(",").filter(Boolean) : [];

  // Build where conditions
  const conditions = [
    eq(tasks.userId, userId),
    // Exclude notes
    ne(tasks.completionType, "note"),
    // Only non-recurring: recurrence is null OR recurrence type is "none"
    or(isNull(tasks.recurrence), sql`${tasks.recurrence}->>'type' = 'none'`),
    // Exclude rollover tasks and off-schedule tasks to keep results clean
    eq(tasks.isRollover, false),
    eq(tasks.isOffSchedule, false),
  ];

  if (search) {
    conditions.push(ilike(tasks.title, `%${search}%`));
  }

  if (filterPriorities.length > 0) {
    // Handle null priority separately
    const hasNull = filterPriorities.includes("none");
    const nonNullPriorities = filterPriorities.filter(p => p !== "none");

    if (hasNull && nonNullPriorities.length > 0) {
      conditions.push(or(isNull(tasks.priority), inArray(tasks.priority, nonNullPriorities)));
    } else if (hasNull) {
      conditions.push(isNull(tasks.priority));
    } else {
      conditions.push(inArray(tasks.priority, nonNullPriorities));
    }
  }

  if (filterCompletionTypes.length > 0) {
    conditions.push(inArray(tasks.completionType, filterCompletionTypes));
  }

  if (filterStatuses.length > 0) {
    conditions.push(inArray(tasks.status, filterStatuses));
  }

  const whereClause = and(...conditions);

  // If filtering by tags, we need a subquery to get task IDs that have those tags
  let taskIdFilter = null;
  if (filterTagIds.length > 0) {
    const taggedTaskIds = await db
      .select({ taskId: taskTags.taskId })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id))
      .where(and(eq(tags.userId, userId), inArray(taskTags.tagId, filterTagIds)));
    const ids = taggedTaskIds.map(r => r.taskId);
    if (ids.length === 0) {
      return NextResponse.json({
        tasks: [],
        pagination: { page, limit, totalCount: 0, totalPages: 0, hasMore: false },
      });
    }
    taskIdFilter = ids;
  }

  const finalWhere = taskIdFilter ? and(whereClause, inArray(tasks.id, taskIdFilter)) : whereClause;

  // Get total count
  const [{ count: totalCount }] = await db
    .select({ count: sql`count(*)` })
    .from(tasks)
    .where(finalWhere);

  // Get paginated tasks
  const rawTasks = await db.query.tasks.findMany({
    where: finalWhere,
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [desc(tasks.updatedAt), asc(tasks.id)],
    limit,
    offset,
  });

  const tasksWithTags = rawTasks.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
  }));

  const total = Number(totalCount);

  return NextResponse.json({
    tasks: tasksWithTags,
    pagination: {
      page,
      limit,
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + tasksWithTags.length < total,
    },
  });
});

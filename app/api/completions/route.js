import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskCompletions, tasks } from "@/lib/schema";
import { eq, and, gte, lte, desc, inArray, sql } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  validateEnum,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const completionBroadcast = withBroadcast(ENTITY_TYPES.COMPLETION);

export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const taskId = searchParams.get("taskId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "1000"); // Default to 1000, can be increased if needed
  const offset = (page - 1) * limit;

  const userTasks = await db.query.tasks.findMany({
    where: eq(tasks.userId, userId),
    columns: { id: true },
  });
  const userTaskIds = userTasks.map(t => t.id);

  if (userTaskIds.length === 0) {
    return NextResponse.json({
      completions: [],
      pagination: {
        page: 1,
        limit,
        totalCount: 0,
        totalPages: 0,
        hasMore: false,
      },
    });
  }

  const conditions = [];
  if (taskId && userTaskIds.includes(taskId)) {
    conditions.push(eq(taskCompletions.taskId, taskId));
  } else {
    conditions.push(inArray(taskCompletions.taskId, userTaskIds));
  }
  if (startDate) conditions.push(gte(taskCompletions.date, new Date(startDate)));
  if (endDate) conditions.push(lte(taskCompletions.date, new Date(endDate)));

  // Get total count for pagination
  const [{ count: totalCount }] = await db
    .select({ count: sql`count(*)` })
    .from(taskCompletions)
    .where(and(...conditions));

  // Get paginated results
  const completions = await db.query.taskCompletions.findMany({
    where: and(...conditions),
    orderBy: [desc(taskCompletions.date)],
    limit,
    offset,
  });

  return NextResponse.json({
    completions,
    pagination: {
      page,
      limit,
      totalCount: Number(totalCount),
      totalPages: Math.ceil(Number(totalCount) / limit),
      hasMore: offset + completions.length < Number(totalCount),
    },
  });
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date, outcome = "completed", note, time, startedAt, completedAt } = body;

  validateRequired(body, ["taskId"]);
  validateEnum("outcome", outcome, ["completed", "not_completed", "rolled_over"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const completionDate = date ? new Date(date) : new Date();
  const utcDate = new Date(
    Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
  );

  const existing = await db.query.taskCompletions.findFirst({
    where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
  });

  if (existing) {
    const updateData = { outcome };
    if (note !== undefined) updateData.note = note || null;
    if (time !== undefined) updateData.time = time || null;
    if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;
    const [updated] = await db
      .update(taskCompletions)
      .set(updateData)
      .where(eq(taskCompletions.id, existing.id))
      .returning();

    // Broadcast to other clients
    completionBroadcast.onUpdate(userId, updated, clientId);

    return NextResponse.json(updated);
  }

  const [completion] = await db
    .insert(taskCompletions)
    .values({
      taskId,
      date: utcDate,
      outcome,
      note: note || null,
      time: time || null,
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    })
    .returning();

  // Broadcast to other clients
  completionBroadcast.onCreate(userId, completion, clientId);

  return NextResponse.json(completion, { status: 201 });
});

export const DELETE = withApi(async (request, { userId, getSearchParams }) => {
  const clientId = getClientIdFromRequest(request);
  const searchParams = getSearchParams();
  const taskId = searchParams.get("taskId");
  const date = searchParams.get("date");

  if (!taskId || !date) {
    throw Errors.badRequest("Task ID and date are required");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const completionDate = new Date(date);
  const utcDate = new Date(
    Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
  );

  const result = await db
    .delete(taskCompletions)
    .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)))
    .returning();

  if (result.length === 0) {
    throw Errors.notFound("Completion");
  }

  // Broadcast to other clients
  completionBroadcast.onDelete(userId, result[0].id, clientId);

  return NextResponse.json({ success: true });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date, outcome, note, time } = body;

  validateRequired(body, ["taskId", "date"]);
  validateEnum("outcome", outcome, ["completed", "not_completed"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const completionDate = new Date(date);
  const utcDate = new Date(
    Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
  );

  const existing = await db.query.taskCompletions.findFirst({
    where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
  });

  const updateData = {};
  if (outcome !== undefined) updateData.outcome = outcome;
  if (note !== undefined) updateData.note = note || null;
  if (time !== undefined) updateData.time = time || null;

  if (existing) {
    const [updated] = await db
      .update(taskCompletions)
      .set(updateData)
      .where(eq(taskCompletions.id, existing.id))
      .returning();

    // Broadcast to other clients
    completionBroadcast.onUpdate(userId, updated, clientId);

    return NextResponse.json(updated);
  } else {
    const [created] = await db
      .insert(taskCompletions)
      .values({
        taskId,
        date: utcDate,
        outcome: outcome || "completed",
        note: note || null,
        time: time || null,
      })
      .returning();

    // Broadcast to other clients
    completionBroadcast.onCreate(userId, created, clientId);

    return NextResponse.json(created, { status: 201 });
  }
});

export const PATCH = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date, outcome } = body;

  validateRequired(body, ["taskId", "date", "outcome"]);
  validateEnum("outcome", outcome, ["completed", "not_completed"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const completionDate = new Date(date);
  const utcDate = new Date(
    Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
  );

  const [updated] = await db
    .update(taskCompletions)
    .set({ outcome })
    .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)))
    .returning();

  if (!updated) {
    throw Errors.notFound("Record");
  }

  // Broadcast to other clients
  completionBroadcast.onUpdate(userId, updated, clientId);

  return NextResponse.json(updated);
});

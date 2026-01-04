import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskCompletions, tasks } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";

const completionBroadcast = withBroadcast(ENTITY_TYPES.COMPLETION);

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { completions: completionsToCreate } = body;

  if (!Array.isArray(completionsToCreate) || completionsToCreate.length === 0) {
    throw Errors.badRequest("Completions array is required and must not be empty");
  }

  for (const completion of completionsToCreate) {
    if (!completion.taskId || !completion.date) {
      throw Errors.badRequest("Each completion must have taskId and date");
    }
  }

  const taskIds = [...new Set(completionsToCreate.map(c => c.taskId))];

  const userTasks = await db.query.tasks.findMany({
    where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
  });

  if (userTasks.length !== taskIds.length) {
    throw Errors.notFound("One or more tasks");
  }

  const values = completionsToCreate.map(({ taskId, date }) => {
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );
    return { taskId, date: utcDate, outcome: "completed" };
  });

  const createdCompletions = await db.transaction(async tx => {
    const existingCompletions = await tx.query.taskCompletions.findMany({
      where: and(
        inArray(
          taskCompletions.taskId,
          values.map(v => v.taskId)
        ),
        inArray(
          taskCompletions.date,
          values.map(v => v.date)
        )
      ),
    });

    const existingKeys = new Set(existingCompletions.map(c => `${c.taskId}|${new Date(c.date).toISOString()}`));
    const newValues = values.filter(v => !existingKeys.has(`${v.taskId}|${v.date.toISOString()}`));

    let newCompletions = [];
    if (newValues.length > 0) {
      newCompletions = await tx.insert(taskCompletions).values(newValues).returning();
    }

    return [...existingCompletions, ...newCompletions];
  });

  // Broadcast batch create to other clients
  completionBroadcast.onBatchCreate(userId, createdCompletions, clientId);

  return NextResponse.json(
    { success: true, completions: createdCompletions, count: createdCompletions.length },
    { status: 201 }
  );
});

export const DELETE = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { completions: completionsToDelete } = body;

  if (!Array.isArray(completionsToDelete) || completionsToDelete.length === 0) {
    throw Errors.badRequest("Completions array is required and must not be empty");
  }

  for (const completion of completionsToDelete) {
    if (!completion.taskId || !completion.date) {
      throw Errors.badRequest("Each completion must have taskId and date");
    }
  }

  const taskIds = [...new Set(completionsToDelete.map(c => c.taskId))];

  const userTasks = await db.query.tasks.findMany({
    where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
  });

  if (userTasks.length !== taskIds.length) {
    throw Errors.notFound("One or more tasks");
  }

  const normalizedCompletions = completionsToDelete.map(({ taskId, date }) => {
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );
    return { taskId, date: utcDate };
  });

  // Fetch completion IDs before deletion for broadcast
  const completionIds = [];
  for (const { taskId, date } of normalizedCompletions) {
    const completion = await db.query.taskCompletions.findFirst({
      where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, date)),
    });
    if (completion) {
      completionIds.push(completion.id);
    }
  }

  let deletedCount = 0;
  await db.transaction(async tx => {
    const results = await Promise.all(
      normalizedCompletions.map(({ taskId, date }) =>
        tx
          .delete(taskCompletions)
          .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, date)))
          .returning()
      )
    );
    deletedCount = results.reduce((sum, result) => sum + result.length, 0);
  });

  // Broadcast batch delete to other clients
  if (completionIds.length > 0) {
    completionBroadcast.onBatchDelete(userId, completionIds, clientId);
  }

  return NextResponse.json({ success: true, deletedCount });
});

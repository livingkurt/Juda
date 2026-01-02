import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskTags, tasks, tags } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, tagIds } = body;

  validateRequired(body, ["taskId"]);
  if (!Array.isArray(tagIds)) {
    throw Errors.badRequest("tagIds must be an array");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  if (tagIds.length === 0) {
    await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
    return NextResponse.json({ success: true, addedCount: 0, removedCount: 0 });
  }

  const userTags = await db.query.tags.findMany({
    where: and(inArray(tags.id, tagIds), eq(tags.userId, userId)),
  });

  if (userTags.length !== tagIds.length) {
    throw Errors.notFound("One or more tags");
  }

  const existingAssignments = await db.query.taskTags.findMany({
    where: eq(taskTags.taskId, taskId),
  });

  const existingTagIds = existingAssignments.map(tt => tt.tagId);
  const tagsToAdd = tagIds.filter(id => !existingTagIds.includes(id));
  const tagsToRemove = existingTagIds.filter(id => !tagIds.includes(id));

  let addedCount = 0;
  let removedCount = 0;

  await db.transaction(async tx => {
    if (tagsToRemove.length > 0) {
      const result = await tx
        .delete(taskTags)
        .where(and(eq(taskTags.taskId, taskId), inArray(taskTags.tagId, tagsToRemove)))
        .returning();
      removedCount = result.length;
    }

    if (tagsToAdd.length > 0) {
      const values = tagsToAdd.map(tagId => ({ taskId, tagId }));
      const result = await tx.insert(taskTags).values(values).returning();
      addedCount = result.length;
    }
  });

  return NextResponse.json({ success: true, addedCount, removedCount }, { status: 200 });
});

export const DELETE = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { assignments } = body;

  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw Errors.badRequest("Assignments array is required and must not be empty");
  }

  for (const assignment of assignments) {
    if (!assignment.taskId || !assignment.tagId) {
      throw Errors.badRequest("Each assignment must have taskId and tagId");
    }
  }

  const taskIds = [...new Set(assignments.map(a => a.taskId))];
  const tagIds = [...new Set(assignments.map(a => a.tagId))];

  const [userTasks, userTags] = await Promise.all([
    db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    }),
    db.query.tags.findMany({
      where: and(inArray(tags.id, tagIds), eq(tags.userId, userId)),
    }),
  ]);

  if (userTasks.length !== taskIds.length || userTags.length !== tagIds.length) {
    throw Errors.notFound("One or more tasks or tags");
  }

  let deletedCount = 0;
  await db.transaction(async tx => {
    const results = await Promise.all(
      assignments.map(({ taskId, tagId }) =>
        tx
          .delete(taskTags)
          .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
          .returning()
      )
    );
    deletedCount = results.reduce((sum, result) => sum + result.length, 0);
  });

  return NextResponse.json({ success: true, deletedCount });
});

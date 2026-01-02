import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskTags, tasks, tags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const GET = withApi(async (request, { userId, getRequiredParam }) => {
  const taskId = getRequiredParam("taskId");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const result = await db.query.taskTags.findMany({
    where: eq(taskTags.taskId, taskId),
    with: {
      tag: true,
    },
  });

  const tagsForTask = result.map(tt => tt.tag);
  return NextResponse.json(tagsForTask);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, tagId } = body;

  validateRequired(body, ["taskId", "tagId"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
  });

  if (!task || !tag) {
    throw Errors.notFound("Task or tag");
  }

  const existing = await db.query.taskTags.findFirst({
    where: and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)),
  });

  if (existing) {
    return NextResponse.json({ message: "Tag already assigned" }, { status: 200 });
  }

  const [taskTag] = await db.insert(taskTags).values({ taskId, tagId }).returning();

  return NextResponse.json(taskTag, { status: 201 });
});

export const DELETE = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const taskId = searchParams.get("taskId");
  const tagId = searchParams.get("tagId");

  if (!taskId || !tagId) {
    throw Errors.badRequest("Task ID and Tag ID are required");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
  });

  if (!task || !tag) {
    throw Errors.notFound("Task or tag");
  }

  await db.delete(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));

  return NextResponse.json({ success: true });
});

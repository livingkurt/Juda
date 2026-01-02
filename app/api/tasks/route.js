import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { withApi, Errors, validateRequired, validateEnum } from "@/lib/apiHelpers";

export const GET = withApi(async (request, { userId }) => {
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

  const tasksWithTags = allTasks.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
  }));

  return NextResponse.json(tasksWithTags);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { title, sectionId, parentId, time, duration, recurrence, order, completionType, content, folderId } = body;

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
  });

  if (!section) {
    throw Errors.notFound("Section");
  }

  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      title,
      sectionId,
      parentId: parentId || null,
      time: time || null,
      duration: duration ?? 30,
      recurrence: recurrence || null,
      order: order ?? 0,
      completionType: completionType || "checkbox",
      content: content || null,
      folderId: folderId || null,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const {
    id,
    title,
    sectionId,
    parentId,
    time,
    duration,
    recurrence,
    expanded,
    order,
    status,
    startedAt,
    completionType,
    content,
    folderId,
  } = body;

  validateRequired(body, ["id"]);

  const existingTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });

  if (!existingTask) {
    throw Errors.notFound("Task");
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (sectionId !== undefined && sectionId !== null) {
    if (sectionId !== existingTask.sectionId) {
      const section = await db.query.sections.findFirst({
        where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
      });
      if (!section) {
        throw Errors.badRequest("Invalid section ID");
      }
      updateData.sectionId = sectionId;
    }
  }
  if (parentId !== undefined) updateData.parentId = parentId;
  if (time !== undefined) updateData.time = time;
  if (duration !== undefined) updateData.duration = duration;
  if (recurrence !== undefined) updateData.recurrence = recurrence;
  if (expanded !== undefined) updateData.expanded = expanded;
  if (order !== undefined) updateData.order = order;
  if (status !== undefined) {
    validateEnum("status", status, ["todo", "in_progress", "complete"]);
    updateData.status = status;

    if (status === "in_progress" && !existingTask.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === "todo") {
      updateData.startedAt = null;
    }
  }

  if (startedAt !== undefined) {
    updateData.startedAt = startedAt ? new Date(startedAt) : null;
  }
  if (completionType !== undefined) {
    validateEnum("completionType", completionType, ["checkbox", "text", "note", "workout"]);
    updateData.completionType = completionType;
  }
  if (content !== undefined) updateData.content = content;
  if (folderId !== undefined) updateData.folderId = folderId;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(existingTask);
  }

  updateData.updatedAt = new Date();

  await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  const taskWithRelations = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const taskWithTags = {
    ...taskWithRelations,
    tags: taskWithRelations.taskTags?.map(tt => tt.tag) || [],
  };

  return NextResponse.json(taskWithTags);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const id = getRequiredParam("id");

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  return NextResponse.json({ success: true });
});

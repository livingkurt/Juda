import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections, taskTags, tags } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, validateEnum, withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskIds, updates } = body;

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    throw Errors.badRequest("Task IDs array is required and must not be empty");
  }

  if (!updates || typeof updates !== "object") {
    throw Errors.badRequest("Updates object is required");
  }

  const userTasks = await db.query.tasks.findMany({
    where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (userTasks.length !== taskIds.length) {
    throw Errors.notFound("One or more tasks");
  }

  if (updates.sectionId) {
    const section = await db.query.sections.findFirst({
      where: and(eq(sections.id, updates.sectionId), eq(sections.userId, userId)),
    });
    if (!section) {
      throw Errors.notFound("Section");
    }
  }

  validateEnum("status", updates.status, ["todo", "in_progress", "complete"]);
  if (updates.priority !== undefined && updates.priority !== null) {
    validateEnum("priority", updates.priority, ["low", "medium", "high", "urgent"]);
  }

  const updateData = {};
  if (updates.sectionId !== undefined) updateData.sectionId = updates.sectionId;
  if (updates.time !== undefined) updateData.time = updates.time;
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.recurrence !== undefined) updateData.recurrence = updates.recurrence;
  if (updates.status !== undefined) {
    updateData.status = updates.status;
    if (updates.status === "in_progress") {
      // Will be handled per-task in the transaction
    } else if (updates.status === "todo") {
      updateData.startedAt = null;
    }
  }
  if (updates.priority !== undefined) {
    updateData.priority = updates.priority === null ? null : updates.priority;
  }

  await db.transaction(async tx => {
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();

      if (updates.status === "in_progress") {
        const updatePromises = userTasks.map(async task => {
          const taskUpdateData = { ...updateData };
          if (!task.startedAt) {
            taskUpdateData.startedAt = new Date();
          }
          await tx
            .update(tasks)
            .set(taskUpdateData)
            .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
            .returning();
        });
        await Promise.all(updatePromises);
      } else {
        await tx
          .update(tasks)
          .set(updateData)
          .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
          .returning();
      }
    }

    if (updates.tagIds !== undefined && Array.isArray(updates.tagIds)) {
      if (updates.tagIds.length > 0) {
        const userTags = await tx.query.tags.findMany({
          where: and(inArray(tags.id, updates.tagIds), eq(tags.userId, userId)),
        });

        if (userTags.length !== updates.tagIds.length) {
          throw Errors.notFound("One or more tags");
        }

        for (const task of userTasks) {
          const existingTagIds = task.taskTags?.map(tt => tt.tag.id) || [];
          const mergedTagIds = [...new Set([...existingTagIds, ...updates.tagIds])];

          const currentAssignments = await tx.query.taskTags.findMany({
            where: eq(taskTags.taskId, task.id),
          });
          const currentTagIds = currentAssignments.map(tt => tt.tagId);

          const tagsToAdd = mergedTagIds.filter(id => !currentTagIds.includes(id));

          if (tagsToAdd.length > 0) {
            const values = tagsToAdd.map(tagId => ({ taskId: task.id, tagId }));
            await tx.insert(taskTags).values(values);
          }
        }
      }
    }
  });

  const tasksWithRelations = await db.query.tasks.findMany({
    where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const tasksWithTags = tasksWithRelations.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
  }));

  // Broadcast batch update to other clients
  const clientId = getClientIdFromRequest(request);
  taskBroadcast.onBatchUpdate(userId, tasksWithTags, clientId);

  return NextResponse.json(
    {
      success: true,
      tasks: tasksWithTags,
      updatedCount: tasksWithTags.length,
    },
    { status: 200 }
  );
});

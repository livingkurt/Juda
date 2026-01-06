import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskCompletions, taskTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);
const completionBroadcast = withBroadcast(ENTITY_TYPES.COMPLETION);

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date } = body;

  validateRequired(body, ["taskId", "date"]);

  // Get the original task
  const originalTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!originalTask) {
    throw Errors.notFound("Task");
  }

  // Verify it's a recurring task
  if (!originalTask.recurrence || originalTask.recurrence.type === "none") {
    throw Errors.badRequest("Only recurring tasks can be rolled over");
  }

  // Parse the date - handle YYYY-MM-DD format (from formatLocalDate)
  let utcDate;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // YYYY-MM-DD format - parse as UTC
    const [year, month, day] = date.split("-").map(Number);
    utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    // ISO string or Date object - parse and normalize to UTC midnight
    const rolloverDate = new Date(date);
    utcDate = new Date(
      Date.UTC(rolloverDate.getUTCFullYear(), rolloverDate.getUTCMonth(), rolloverDate.getUTCDate(), 0, 0, 0, 0)
    );
  }

  // Calculate next day
  const nextDay = new Date(utcDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  // Use a transaction to ensure both operations succeed or fail together
  const result = await db.transaction(async tx => {
    // 1. Create completion record with rolled_over outcome
    const existingCompletion = await tx.query.taskCompletions.findFirst({
      where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
    });

    let completion;
    if (existingCompletion) {
      // Update existing completion
      const [updated] = await tx
        .update(taskCompletions)
        .set({ outcome: "rolled_over" })
        .where(eq(taskCompletions.id, existingCompletion.id))
        .returning();
      completion = updated;
    } else {
      // Create new completion
      const [created] = await tx
        .insert(taskCompletions)
        .values({
          taskId,
          date: utcDate,
          outcome: "rolled_over",
        })
        .returning();
      completion = created;
    }

    // 2. Create new rollover task
    const nextDayISO = nextDay.toISOString();
    const [rolloverTask] = await tx
      .insert(tasks)
      .values({
        userId,
        title: originalTask.title,
        sectionId: originalTask.sectionId,
        time: originalTask.time,
        duration: originalTask.duration,
        recurrence: {
          type: "none",
          startDate: nextDayISO,
        },
        order: originalTask.order,
        completionType: originalTask.completionType,
        content: originalTask.content,
        folderId: originalTask.folderId,
        sourceTaskId: originalTask.id,
        rolledFromDate: utcDate,
        isRollover: true,
      })
      .returning();

    // 3. Copy tags if they exist
    if (originalTask.taskTags && originalTask.taskTags.length > 0) {
      const tagAssignments = originalTask.taskTags.map(tt => ({
        taskId: rolloverTask.id,
        tagId: tt.tag.id,
      }));
      await tx.insert(taskTags).values(tagAssignments);
    }

    return { completion, rolloverTask };
  });

  // Fetch the rollover task with relations for broadcast
  const rolloverTaskWithRelations = await db.query.tasks.findFirst({
    where: eq(tasks.id, result.rolloverTask.id),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const rolloverTaskWithTags = {
    ...rolloverTaskWithRelations,
    tags: rolloverTaskWithRelations.taskTags?.map(tt => tt.tag) || [],
  };

  // Broadcast to other clients
  completionBroadcast.onUpdate(userId, result.completion, clientId);
  taskBroadcast.onCreate(userId, rolloverTaskWithTags, clientId);

  return NextResponse.json(
    {
      completion: result.completion,
      rolloverTask: rolloverTaskWithTags,
    },
    { status: 201 }
  );
});

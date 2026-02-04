import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskCompletions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

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

  // Create or update completion record with rolled_over outcome
  const existingCompletion = await db.query.taskCompletions.findFirst({
    where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
  });

  let completion;
  if (existingCompletion) {
    // Update existing completion
    const [updated] = await db
      .update(taskCompletions)
      .set({ outcome: "rolled_over" })
      .where(eq(taskCompletions.id, existingCompletion.id))
      .returning();
    completion = updated;
  } else {
    // Create new completion
    const [created] = await db
      .insert(taskCompletions)
      .values({
        taskId,
        date: utcDate,
        outcome: "rolled_over",
      })
      .returning();
    completion = created;
  }

  // Broadcast to other clients
  completionBroadcast.onUpdate(userId, completion, clientId);

  return NextResponse.json(
    {
      completion,
      task: originalTask,
    },
    { status: 201 }
  );
});

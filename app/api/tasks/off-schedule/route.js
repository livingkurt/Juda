import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskCompletions, taskTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  validateEnum,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);
const completionBroadcast = withBroadcast(ENTITY_TYPES.COMPLETION);

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date, outcome, note } = body;

  validateRequired(body, ["taskId", "date"]);
  if (outcome !== null && outcome !== undefined) {
    validateEnum("outcome", outcome, ["completed", "not_completed", "rolled_over"]);
  }

  // Get the source task
  const sourceTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    with: {
      taskTags: true,
    },
  });

  if (!sourceTask) {
    throw Errors.notFound("Task");
  }

  // Parse the date - handle YYYY-MM-DD format (from formatLocalDate)
  let utcDate;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // YYYY-MM-DD format - parse as UTC
    const [year, month, day] = date.split("-").map(Number);
    utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    // ISO string or Date object - parse and normalize to UTC midnight
    const completionDate = new Date(date);
    utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );
  }

  const dateStr = utcDate.toISOString().split("T")[0];

  // Handle clearing (outcome is null)
  if (outcome === null || outcome === undefined) {
    // Delete completion
    await db
      .delete(taskCompletions)
      .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)));

    completionBroadcast.onDelete(userId, { taskId, date: utcDate.toISOString() }, clientId);

    // Find and delete off-schedule task
    const allOffScheduleTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.sourceTaskId, taskId), eq(tasks.isOffSchedule, true), eq(tasks.userId, userId)),
    });

    const offScheduleTask = allOffScheduleTasks.find(t => t.recurrence?.startDate?.startsWith(dateStr));

    if (offScheduleTask) {
      await db.delete(tasks).where(eq(tasks.id, offScheduleTask.id));
      taskBroadcast.onDelete(userId, offScheduleTask.id, clientId);
    }

    return NextResponse.json({ task: null, completion: null });
  }

  // Check if off-schedule task already exists for this date
  const allOffScheduleTasks = await db.query.tasks.findMany({
    where: and(eq(tasks.sourceTaskId, taskId), eq(tasks.isOffSchedule, true), eq(tasks.userId, userId)),
  });

  // Filter by date match (since we store startDate as ISO string in JSON)
  let offScheduleTask = allOffScheduleTasks.find(t => t.recurrence?.startDate?.startsWith(dateStr));
  let offScheduleTaskId = null;

  // Create off-schedule task if it doesn't exist
  if (!offScheduleTask) {
    const [newTask] = await db
      .insert(tasks)
      .values({
        userId,
        title: sourceTask.title,
        sectionId: sourceTask.sectionId,
        time: sourceTask.time,
        duration: sourceTask.duration,
        completionType: sourceTask.completionType,
        recurrence: {
          type: "none",
          startDate: `${dateStr}T00:00:00.000Z`,
        },
        sourceTaskId: taskId,
        isOffSchedule: true,
        isRollover: false,
        status: "todo",
      })
      .returning();

    offScheduleTask = newTask;

    // Copy tags if any
    if (sourceTask.taskTags && sourceTask.taskTags.length > 0) {
      await db.insert(taskTags).values(
        sourceTask.taskTags.map(tt => ({
          taskId: newTask.id,
          tagId: tt.tagId,
        }))
      );
    }

    // Fetch the task with relations for broadcast
    const taskWithRelations = await db.query.tasks.findFirst({
      where: eq(tasks.id, newTask.id),
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

    taskBroadcast.onCreate(userId, taskWithTags, clientId);
    offScheduleTask = taskWithTags;
    offScheduleTaskId = taskWithTags.id;
  } else {
    // Task already exists - get its ID
    offScheduleTaskId = typeof offScheduleTask === "object" ? offScheduleTask.id : offScheduleTask;
  }

  // Create or update completion on the ORIGINAL task (for History tab grouping)
  const existingCompletion = await db.query.taskCompletions.findFirst({
    where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
  });

  let completion;
  if (existingCompletion) {
    const [updated] = await db
      .update(taskCompletions)
      .set({ outcome, note: note || null })
      .where(eq(taskCompletions.id, existingCompletion.id))
      .returning();
    completion = updated;
    completionBroadcast.onUpdate(userId, updated, clientId);
  } else {
    const [created] = await db
      .insert(taskCompletions)
      .values({
        taskId,
        date: utcDate,
        outcome,
        note: note || null,
      })
      .returning();
    completion = created;
    completionBroadcast.onCreate(userId, created, clientId);
  }

  // ALSO create/update completion on the OFF-SCHEDULE TASK itself (so it shows as completed in Today/Calendar views)
  const existingOffScheduleCompletion = await db.query.taskCompletions.findFirst({
    where: and(eq(taskCompletions.taskId, offScheduleTaskId), eq(taskCompletions.date, utcDate)),
  });

  let offScheduleCompletion;
  if (existingOffScheduleCompletion) {
    const [updated] = await db
      .update(taskCompletions)
      .set({ outcome, note: note || null })
      .where(eq(taskCompletions.id, existingOffScheduleCompletion.id))
      .returning();
    offScheduleCompletion = updated;
    completionBroadcast.onUpdate(userId, updated, clientId);
  } else {
    const [created] = await db
      .insert(taskCompletions)
      .values({
        taskId: offScheduleTaskId,
        date: utcDate,
        outcome,
        note: note || null,
      })
      .returning();
    offScheduleCompletion = created;
    completionBroadcast.onCreate(userId, created, clientId);
  }

  return NextResponse.json({ task: offScheduleTask, completion });
});

export const DELETE = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { taskId, date } = body;

  validateRequired(body, ["taskId", "date"]);

  // Parse the date - handle YYYY-MM-DD format (from formatLocalDate)
  let utcDate;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // YYYY-MM-DD format - parse as UTC
    const [year, month, day] = date.split("-").map(Number);
    utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    // ISO string or Date object - parse and normalize to UTC midnight
    const completionDate = new Date(date);
    utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );
  }

  const dateStr = utcDate.toISOString().split("T")[0];

  // Delete completion
  await db.delete(taskCompletions).where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)));

  completionBroadcast.onDelete(userId, { taskId, date: utcDate.toISOString() }, clientId);

  // Find and delete off-schedule task
  const allOffScheduleTasks = await db.query.tasks.findMany({
    where: and(eq(tasks.sourceTaskId, taskId), eq(tasks.isOffSchedule, true), eq(tasks.userId, userId)),
  });

  const offScheduleTask = allOffScheduleTasks.find(t => t.recurrence?.startDate?.startsWith(dateStr));

  if (offScheduleTask) {
    await db.delete(tasks).where(eq(tasks.id, offScheduleTask.id));
    taskBroadcast.onDelete(userId, offScheduleTask.id, clientId);
  }

  return NextResponse.json({ success: true });
});


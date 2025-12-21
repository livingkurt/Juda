import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskCompletions, tasks } from "@/lib/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch completions with optional filters
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const taskId = searchParams.get("taskId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get user's task IDs
    const userTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
      columns: { id: true },
    });
    const userTaskIds = userTasks.map(t => t.id);

    if (userTaskIds.length === 0) {
      return NextResponse.json([]);
    }

    const conditions = [];
    if (taskId && userTaskIds.includes(taskId)) {
      // If specific taskId is provided and belongs to user, filter by it
      conditions.push(eq(taskCompletions.taskId, taskId));
    } else {
      // Otherwise, filter by all user's task IDs
      conditions.push(inArray(taskCompletions.taskId, userTaskIds));
    }
    if (startDate) conditions.push(gte(taskCompletions.date, new Date(startDate)));
    if (endDate) conditions.push(lte(taskCompletions.date, new Date(endDate)));

    const completions = await db.query.taskCompletions.findMany({
      where: and(...conditions),
      orderBy: [desc(taskCompletions.date)],
    });

    return NextResponse.json(completions);
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json({ error: "Failed to fetch completions", details: error.message }, { status: 500 });
  }
}

// POST - Create a completion record
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskId, date } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Normalize date to start of day for consistent storage - use UTC to avoid timezone issues
    const completionDate = date ? new Date(date) : new Date();
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Check if completion already exists for this task and date
    const existing = await db.query.taskCompletions.findFirst({
      where: and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)),
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const [completion] = await db
      .insert(taskCompletions)
      .values({
        taskId,
        date: utcDate,
      })
      .returning();

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    console.error("Error creating completion:", error);
    return NextResponse.json({ error: "Failed to create completion", details: error.message }, { status: 500 });
  }
}

// DELETE - Remove a completion record
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const date = searchParams.get("date");

    if (!taskId || !date) {
      return NextResponse.json({ error: "Task ID and date are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Normalize date to start of day - use UTC to avoid timezone issues
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    const result = await db
      .delete(taskCompletions)
      .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Completion not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting completion:", error);
    return NextResponse.json({ error: "Failed to delete completion" }, { status: 500 });
  }
}

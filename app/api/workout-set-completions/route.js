import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSetCompletions, tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch set completions for a task on a specific date
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const date = searchParams.get("date"); // YYYY-MM-DD format

    if (!taskId || !date) {
      return NextResponse.json({ error: "taskId and date are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Parse date to ensure consistent format
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Fetch all set completions for this task and date
    const completions = await db.query.workoutSetCompletions.findMany({
      where: and(eq(workoutSetCompletions.taskId, taskId), eq(workoutSetCompletions.date, utcDate)),
    });

    return NextResponse.json({ completions });
  } catch (error) {
    console.error("Error fetching workout set completions:", error);
    return NextResponse.json({ error: "Failed to fetch workout set completions" }, { status: 500 });
  }
}

// POST - Save/update a set completion
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskId, date, exerciseId, setNumber, completed, value, time, distance, pace } = body;

    if (!taskId || !date || !exerciseId || setNumber === undefined) {
      return NextResponse.json({ error: "taskId, date, exerciseId, and setNumber are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Parse date to ensure consistent format
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Check if completion already exists
    const existing = await db.query.workoutSetCompletions.findFirst({
      where: and(
        eq(workoutSetCompletions.taskId, taskId),
        eq(workoutSetCompletions.date, utcDate),
        eq(workoutSetCompletions.exerciseId, exerciseId),
        eq(workoutSetCompletions.setNumber, setNumber)
      ),
    });

    if (existing) {
      // Update existing completion
      const [updated] = await db
        .update(workoutSetCompletions)
        .set({
          completed: completed !== undefined ? completed : existing.completed,
          value: value !== undefined ? value : existing.value,
          time: time !== undefined ? time : existing.time,
          distance: distance !== undefined ? distance : existing.distance,
          pace: pace !== undefined ? pace : existing.pace,
          updatedAt: new Date(),
        })
        .where(eq(workoutSetCompletions.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create new completion
      const [created] = await db
        .insert(workoutSetCompletions)
        .values({
          taskId,
          date: utcDate,
          exerciseId,
          setNumber,
          completed: completed || false,
          value: value || null,
          time: time || null,
          distance: distance || null,
          pace: pace || null,
        })
        .returning();

      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error("Error saving workout set completion:", error);
    return NextResponse.json({ error: "Failed to save workout set completion" }, { status: 500 });
  }
}

// DELETE - Delete set completions for a task on a specific date
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const date = searchParams.get("date");

    if (!taskId || !date) {
      return NextResponse.json({ error: "taskId and date are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Parse date to ensure consistent format
    const completionDate = new Date(date);
    const utcDate = new Date(
      Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
    );

    // Delete all completions for this task and date
    await db
      .delete(workoutSetCompletions)
      .where(and(eq(workoutSetCompletions.taskId, taskId), eq(workoutSetCompletions.date, utcDate)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout set completions:", error);
    return NextResponse.json({ error: "Failed to delete workout set completions" }, { status: 500 });
  }
}

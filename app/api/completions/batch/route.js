import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskCompletions, tasks } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// POST - Create multiple completion records at once
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { completions: completionsToCreate } = body;

    if (!Array.isArray(completionsToCreate) || completionsToCreate.length === 0) {
      return NextResponse.json({ error: "Completions array is required and must not be empty" }, { status: 400 });
    }

    // Validate all have taskId and date
    for (const completion of completionsToCreate) {
      if (!completion.taskId || !completion.date) {
        return NextResponse.json({ error: "Each completion must have taskId and date" }, { status: 400 });
      }
    }

    // Extract unique task IDs
    const taskIds = [...new Set(completionsToCreate.map(c => c.taskId))];

    // Verify all tasks belong to user in a single query
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Normalize dates and prepare values
    const values = completionsToCreate.map(({ taskId, date }) => {
      const completionDate = new Date(date);
      const utcDate = new Date(
        Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
      );
      return { taskId, date: utcDate };
    });

    // Use transaction to insert all completions atomically
    const createdCompletions = await db.transaction(async tx => {
      // Check which completions already exist in a single query
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

      // Create a Set of existing completion keys for fast lookup
      const existingKeys = new Set(existingCompletions.map(c => `${c.taskId}|${new Date(c.date).toISOString()}`));

      // Filter out values that already exist
      const newValues = values.filter(v => !existingKeys.has(`${v.taskId}|${v.date.toISOString()}`));

      // Bulk insert new completions
      let newCompletions = [];
      if (newValues.length > 0) {
        newCompletions = await tx.insert(taskCompletions).values(newValues).returning();
      }

      // Return both existing and newly created completions
      return [...existingCompletions, ...newCompletions];
    });

    return NextResponse.json(
      { success: true, completions: createdCompletions, count: createdCompletions.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating batch completions:", error);
    return NextResponse.json({ error: "Failed to create batch completions", details: error.message }, { status: 500 });
  }
}

// DELETE - Remove multiple completion records at once
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { completions: completionsToDelete } = body;

    if (!Array.isArray(completionsToDelete) || completionsToDelete.length === 0) {
      return NextResponse.json({ error: "Completions array is required and must not be empty" }, { status: 400 });
    }

    // Validate all have taskId and date
    for (const completion of completionsToDelete) {
      if (!completion.taskId || !completion.date) {
        return NextResponse.json({ error: "Each completion must have taskId and date" }, { status: 400 });
      }
    }

    // Extract unique task IDs
    const taskIds = [...new Set(completionsToDelete.map(c => c.taskId))];

    // Verify all tasks belong to user in a single query
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Normalize all dates first
    const normalizedCompletions = completionsToDelete.map(({ taskId, date }) => {
      const completionDate = new Date(date);
      const utcDate = new Date(
        Date.UTC(completionDate.getUTCFullYear(), completionDate.getUTCMonth(), completionDate.getUTCDate(), 0, 0, 0, 0)
      );
      return { taskId, date: utcDate };
    });

    // Use transaction to delete all completions atomically
    // Note: We use Promise.all to delete in parallel since Drizzle doesn't support
    // complex OR conditions for bulk deletes with different taskId+date pairs
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

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error deleting batch completions:", error);
    return NextResponse.json({ error: "Failed to delete batch completions", details: error.message }, { status: 500 });
  }
}

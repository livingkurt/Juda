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
      const results = [];
      for (const value of values) {
        // Check if completion already exists
        const existing = await tx.query.taskCompletions.findFirst({
          where: and(eq(taskCompletions.taskId, value.taskId), eq(taskCompletions.date, value.date)),
        });

        if (!existing) {
          const [completion] = await tx.insert(taskCompletions).values(value).returning();
          results.push(completion);
        } else {
          results.push(existing);
        }
      }
      return results;
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

    // Use transaction to delete all completions atomically
    let deletedCount = 0;
    await db.transaction(async tx => {
      for (const { taskId, date } of completionsToDelete) {
        // Normalize date
        const completionDate = new Date(date);
        const utcDate = new Date(
          Date.UTC(
            completionDate.getUTCFullYear(),
            completionDate.getUTCMonth(),
            completionDate.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );

        const result = await tx
          .delete(taskCompletions)
          .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, utcDate)))
          .returning();

        deletedCount += result.length;
      }
    });

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error deleting batch completions:", error);
    return NextResponse.json({ error: "Failed to delete batch completions", details: error.message }, { status: 500 });
  }
}

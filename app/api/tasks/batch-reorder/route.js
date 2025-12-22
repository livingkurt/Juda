import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { updates } = body;

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Updates array is required and must not be empty" }, { status: 400 });
    }

    // Validate each update has id and order
    for (const update of updates) {
      if (!update.id || typeof update.order !== "number") {
        return NextResponse.json({ error: "Each update must have an id and order property" }, { status: 400 });
      }
    }

    // Extract task IDs
    const taskIds = updates.map(u => u.id);

    // Verify all tasks belong to the user
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Use a transaction to update all tasks atomically
    await db.transaction(async tx => {
      const now = new Date();
      for (const update of updates) {
        await tx
          .update(tasks)
          .set({ order: update.order, updatedAt: now })
          .where(and(eq(tasks.id, update.id), eq(tasks.userId, userId)));
      }
    });

    // Return success
    return NextResponse.json({ success: true, updatedCount: updates.length });
  } catch (error) {
    console.error("Error batch reordering tasks:", error);
    return NextResponse.json({ error: "Failed to batch reorder tasks" }, { status: 500 });
  }
}

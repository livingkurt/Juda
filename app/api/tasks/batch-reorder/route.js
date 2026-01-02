import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors } from "@/lib/apiHelpers";

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { updates } = body;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw Errors.badRequest("Updates array is required and must not be empty");
  }

  for (const update of updates) {
    if (!update.id || typeof update.order !== "number") {
      throw Errors.badRequest("Each update must have an id and order property");
    }
  }

  const taskIds = updates.map(u => u.id);

  const userTasks = await db.query.tasks.findMany({
    where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
  });

  if (userTasks.length !== taskIds.length) {
    throw Errors.notFound("One or more tasks");
  }

  await db.transaction(async tx => {
    const now = new Date();
    await Promise.all(
      updates.map(update =>
        tx
          .update(tasks)
          .set({ order: update.order, updatedAt: now })
          .where(and(eq(tasks.id, update.id), eq(tasks.userId, userId)))
      )
    );
  });

  return NextResponse.json({ success: true, updatedCount: updates.length });
});

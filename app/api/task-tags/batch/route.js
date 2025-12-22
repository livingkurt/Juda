import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskTags, tasks, tags } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// POST - Assign multiple tags to a task or update all tags for a task
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskId, tagIds } = body;

    if (!taskId || !Array.isArray(tagIds)) {
      return NextResponse.json({ error: "Task ID and tagIds array are required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (tagIds.length === 0) {
      // If no tags, just remove all existing tags
      await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
      return NextResponse.json({ success: true, addedCount: 0, removedCount: 0 });
    }

    // Verify all tags belong to user in a single query
    const userTags = await db.query.tags.findMany({
      where: and(inArray(tags.id, tagIds), eq(tags.userId, userId)),
    });

    if (userTags.length !== tagIds.length) {
      return NextResponse.json({ error: "One or more tags not found" }, { status: 404 });
    }

    // Get existing tag assignments for this task
    const existingAssignments = await db.query.taskTags.findMany({
      where: eq(taskTags.taskId, taskId),
    });

    const existingTagIds = existingAssignments.map(tt => tt.tagId);

    // Determine what to add and remove
    const tagsToAdd = tagIds.filter(id => !existingTagIds.includes(id));
    const tagsToRemove = existingTagIds.filter(id => !tagIds.includes(id));

    let addedCount = 0;
    let removedCount = 0;

    // Use transaction to update all assignments atomically
    await db.transaction(async tx => {
      // Remove tags that are no longer assigned
      if (tagsToRemove.length > 0) {
        const result = await tx
          .delete(taskTags)
          .where(and(eq(taskTags.taskId, taskId), inArray(taskTags.tagId, tagsToRemove)))
          .returning();
        removedCount = result.length;
      }

      // Add new tag assignments
      if (tagsToAdd.length > 0) {
        const values = tagsToAdd.map(tagId => ({ taskId, tagId }));
        const result = await tx.insert(taskTags).values(values).returning();
        addedCount = result.length;
      }
    });

    return NextResponse.json({ success: true, addedCount, removedCount }, { status: 200 });
  } catch (error) {
    console.error("Error batch updating task tags:", error);
    return NextResponse.json({ error: "Failed to batch update task tags", details: error.message }, { status: 500 });
  }
}

// DELETE - Remove multiple tag assignments at once
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: "Assignments array is required and must not be empty" }, { status: 400 });
    }

    // Validate all have taskId and tagId
    for (const assignment of assignments) {
      if (!assignment.taskId || !assignment.tagId) {
        return NextResponse.json({ error: "Each assignment must have taskId and tagId" }, { status: 400 });
      }
    }

    // Extract unique task IDs and tag IDs
    const taskIds = [...new Set(assignments.map(a => a.taskId))];
    const tagIds = [...new Set(assignments.map(a => a.tagId))];

    // Verify all tasks and tags belong to user in parallel queries
    const [userTasks, userTags] = await Promise.all([
      db.query.tasks.findMany({
        where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
      }),
      db.query.tags.findMany({
        where: and(inArray(tags.id, tagIds), eq(tags.userId, userId)),
      }),
    ]);

    if (userTasks.length !== taskIds.length || userTags.length !== tagIds.length) {
      return NextResponse.json({ error: "One or more tasks or tags not found" }, { status: 404 });
    }

    // Use transaction to delete all assignments atomically
    // Note: We use Promise.all to delete in parallel since Drizzle doesn't support
    // complex OR conditions for bulk deletes with different taskId+tagId pairs
    let deletedCount = 0;
    await db.transaction(async tx => {
      const results = await Promise.all(
        assignments.map(({ taskId, tagId }) =>
          tx
            .delete(taskTags)
            .where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)))
            .returning()
        )
      );
      deletedCount = results.reduce((sum, result) => sum + result.length, 0);
    });

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Error batch deleting task tags:", error);
    return NextResponse.json({ error: "Failed to batch delete task tags", details: error.message }, { status: 500 });
  }
}

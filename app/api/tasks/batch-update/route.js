import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections, taskTags, tags } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// POST - Update multiple tasks at once with the same changes
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskIds, updates } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs array is required and must not be empty" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Updates object is required" }, { status: 400 });
    }

    // Verify all tasks belong to user
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Validate section if provided
    if (updates.sectionId) {
      const section = await db.query.sections.findFirst({
        where: and(eq(sections.id, updates.sectionId), eq(sections.userId, userId)),
      });
      if (!section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
      }
    }

    // Validate status if provided
    if (updates.status && !["todo", "in_progress", "complete"].includes(updates.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Build update data object, only including defined fields
    const updateData = {};
    if (updates.sectionId !== undefined) updateData.sectionId = updates.sectionId;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.recurrence !== undefined) updateData.recurrence = updates.recurrence;
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      // Handle status transitions for each task
      if (updates.status === "in_progress") {
        // Will be handled per-task in the transaction
      } else if (updates.status === "todo") {
        updateData.startedAt = null;
      }
    }

    // Use transaction to update all tasks and tags atomically
    await db.transaction(async tx => {
      // Update task fields if there are any
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();

        // For status transitions to in_progress, we need to handle each task individually
        if (updates.status === "in_progress") {
          const updatePromises = userTasks.map(async task => {
            const taskUpdateData = { ...updateData };
            // Only set startedAt if not already set
            if (!task.startedAt) {
              taskUpdateData.startedAt = new Date();
            }
            await tx
              .update(tasks)
              .set(taskUpdateData)
              .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
              .returning();
          });
          await Promise.all(updatePromises);
        } else {
          // Bulk update for other cases
          await tx
            .update(tasks)
            .set(updateData)
            .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
            .returning();
        }
      }

      // Handle tag updates if provided
      if (updates.tagIds !== undefined && Array.isArray(updates.tagIds)) {
        if (updates.tagIds.length > 0) {
          // Verify all tags belong to user
          const userTags = await tx.query.tags.findMany({
            where: and(inArray(tags.id, updates.tagIds), eq(tags.userId, userId)),
          });

          if (userTags.length !== updates.tagIds.length) {
            throw new Error("One or more tags not found");
          }

          // For each task, merge new tags with existing ones
          for (const task of userTasks) {
            const existingTagIds = task.taskTags?.map(tt => tt.tag.id) || [];
            const mergedTagIds = [...new Set([...existingTagIds, ...updates.tagIds])];

            // Get current assignments
            const currentAssignments = await tx.query.taskTags.findMany({
              where: eq(taskTags.taskId, task.id),
            });
            const currentTagIds = currentAssignments.map(tt => tt.tagId);

            // Determine what to add
            const tagsToAdd = mergedTagIds.filter(id => !currentTagIds.includes(id));

            // Add new tag assignments
            if (tagsToAdd.length > 0) {
              const values = tagsToAdd.map(tagId => ({ taskId: task.id, tagId }));
              await tx.insert(taskTags).values(values);
            }
          }
        }
      }
    });

    // Fetch updated tasks with relations
    const tasksWithRelations = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
      with: {
        section: true,
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    // Transform to include tags array directly on task
    const tasksWithTags = tasksWithRelations.map(task => ({
      ...task,
      tags: task.taskTags?.map(tt => tt.tag) || [],
    }));

    return NextResponse.json(
      {
        success: true,
        tasks: tasksWithTags,
        updatedCount: tasksWithTags.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error batch updating tasks:", error);
    return NextResponse.json({ error: "Failed to batch update tasks", details: error.message }, { status: 500 });
  }
}

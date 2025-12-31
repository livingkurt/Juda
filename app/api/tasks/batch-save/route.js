import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// POST - Create or update multiple tasks at once (for subtasks management)
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { tasks: tasksToSave } = body;

    if (!Array.isArray(tasksToSave) || tasksToSave.length === 0) {
      return NextResponse.json({ error: "Tasks array is required and must not be empty" }, { status: 400 });
    }

    // Separate tasks into creates and updates
    // Check which tasks already exist in the database
    const taskIds = tasksToSave.map(t => t.id).filter(Boolean);
    const existingTasks =
      taskIds.length > 0
        ? await db.query.tasks.findMany({
            where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
          })
        : [];
    const existingTaskIds = new Set(existingTasks.map(t => t.id));

    // Tasks with IDs that exist in DB should be updated, others should be created
    const tasksToUpdate = tasksToSave.filter(t => t.id && existingTaskIds.has(t.id));
    const tasksToCreate = tasksToSave.filter(t => !t.id || !existingTaskIds.has(t.id));

    // Extract unique section IDs for validation
    const sectionIds = [...new Set(tasksToSave.map(t => t.sectionId).filter(Boolean))];

    // Verify all sections belong to user in a single query
    if (sectionIds.length > 0) {
      const userSections = await db.query.sections.findMany({
        where: and(inArray(sections.id, sectionIds), eq(sections.userId, userId)),
      });

      if (userSections.length !== sectionIds.length) {
        return NextResponse.json({ error: "One or more sections not found" }, { status: 404 });
      }
    }

    // Tasks to update are already verified above (they're in existingTasks)

    const createdTasks = [];
    const updatedTasks = [];

    // Use transaction to create/update all tasks atomically
    await db.transaction(async tx => {
      // Bulk create new tasks
      if (tasksToCreate.length > 0) {
        const valuesToInsert = tasksToCreate.map(taskData => {
          const { id: _id, ...taskFields } = taskData; // Remove temporary id if present
          return {
            userId,
            title: taskFields.title,
            sectionId: taskFields.sectionId,
            parentId: taskFields.parentId || null,
            time: taskFields.time || null,
            duration: taskFields.duration ?? 30,
            recurrence: taskFields.recurrence || null,
            order: taskFields.order ?? 0,
          };
        });
        const created = await tx.insert(tasks).values(valuesToInsert).returning();
        createdTasks.push(...created);
      }

      // Update existing tasks in parallel
      if (tasksToUpdate.length > 0) {
        const updatePromises = tasksToUpdate.map(async taskData => {
          const { id, ...taskFields } = taskData;
          const updateData = {};
          if (taskFields.title !== undefined) updateData.title = taskFields.title;
          if (taskFields.sectionId !== undefined) updateData.sectionId = taskFields.sectionId;
          if (taskFields.parentId !== undefined) updateData.parentId = taskFields.parentId;
          if (taskFields.time !== undefined) updateData.time = taskFields.time;
          if (taskFields.duration !== undefined) updateData.duration = taskFields.duration;
          if (taskFields.recurrence !== undefined) updateData.recurrence = taskFields.recurrence;
          if (taskFields.order !== undefined) updateData.order = taskFields.order;

          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            const [task] = await tx
              .update(tasks)
              .set(updateData)
              .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
              .returning();
            return task;
          }
          return null;
        });

        const updated = await Promise.all(updatePromises);
        updatedTasks.push(...updated.filter(Boolean));
      }
    });

    return NextResponse.json(
      {
        success: true,
        created: createdTasks,
        updated: updatedTasks,
        createdCount: createdTasks.length,
        updatedCount: updatedTasks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error batch saving tasks:", error);
    return NextResponse.json({ error: "Failed to batch save tasks", details: error.message }, { status: 500 });
  }
}

// DELETE - Delete multiple tasks at once
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs array is required and must not be empty" }, { status: 400 });
    }

    // Verify all tasks belong to user
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Delete all tasks in a single query
    const result = await db
      .delete(tasks)
      .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
      .returning();

    return NextResponse.json({ success: true, deletedCount: result.length });
  } catch (error) {
    console.error("Error batch deleting tasks:", error);
    return NextResponse.json({ error: "Failed to batch delete tasks", details: error.message }, { status: 500 });
  }
}

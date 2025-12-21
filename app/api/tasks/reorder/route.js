import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskId, sourceSectionId, targetSectionId, newOrder } = body;

    // Validate that both section IDs are provided
    if (!sourceSectionId || !targetSectionId) {
      return NextResponse.json({ error: "Source and target section IDs are required" }, { status: 400 });
    }

    // Verify sections belong to user
    const sourceSection = await db.query.sections.findFirst({
      where: and(eq(sections.id, sourceSectionId), eq(sections.userId, userId)),
    });
    const targetSection = await db.query.sections.findFirst({
      where: and(eq(sections.id, targetSectionId), eq(sections.userId, userId)),
    });

    if (!sourceSection || !targetSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Get the task to move (verify it belongs to user)
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If moving within the same section, reorder tasks
    if (sourceSectionId === targetSectionId) {
      const sectionTasks = await db.query.tasks.findMany({
        where: and(eq(tasks.sectionId, sourceSectionId), eq(tasks.userId, userId)),
        orderBy: [asc(tasks.order)],
      });

      // Remove the moved task from its current position
      const filteredTasks = sectionTasks.filter(t => t.id !== taskId);

      // Insert it at the new position
      filteredTasks.splice(newOrder, 0, task);

      // Update all task orders
      for (let i = 0; i < filteredTasks.length; i++) {
        await db
          .update(tasks)
          .set({ order: i, updatedAt: new Date() })
          .where(and(eq(tasks.id, filteredTasks[i].id), eq(tasks.userId, userId)));
      }
    } else {
      // Moving between sections
      const sourceTasks = await db.query.tasks.findMany({
        where: and(eq(tasks.sectionId, sourceSectionId), eq(tasks.userId, userId)),
        orderBy: [asc(tasks.order)],
      });

      const targetTasks = await db.query.tasks.findMany({
        where: and(eq(tasks.sectionId, targetSectionId), eq(tasks.userId, userId)),
        orderBy: [asc(tasks.order)],
      });

      // Remove task from source
      const updatedSourceTasks = sourceTasks.filter(t => t.id !== taskId);

      // Insert task into target at new position
      const updatedTargetTasks = [...targetTasks];
      updatedTargetTasks.splice(newOrder, 0, task);

      // Update the moved task's section and order
      await db
        .update(tasks)
        .set({
          sectionId: targetSectionId,
          order: newOrder,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

      // Reorder remaining source section tasks
      for (let i = 0; i < updatedSourceTasks.length; i++) {
        if (updatedSourceTasks[i].order !== i) {
          await db
            .update(tasks)
            .set({ order: i, updatedAt: new Date() })
            .where(and(eq(tasks.id, updatedSourceTasks[i].id), eq(tasks.userId, userId)));
        }
      }

      // Reorder target section tasks
      for (let i = 0; i < updatedTargetTasks.length; i++) {
        if (updatedTargetTasks[i].id !== taskId && updatedTargetTasks[i].order !== i) {
          await db
            .update(tasks)
            .set({ order: i, updatedAt: new Date() })
            .where(and(eq(tasks.id, updatedTargetTasks[i].id), eq(tasks.userId, userId)));
        }
      }
    }

    // Fetch the updated task
    const updatedTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error reordering task:", error);
    return NextResponse.json({ error: "Failed to reorder task" }, { status: 500 });
  }
}

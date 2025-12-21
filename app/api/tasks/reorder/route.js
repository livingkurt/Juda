import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { taskId, sourceSectionId, targetSectionId, newOrder } = body;

    // Validate that both section IDs are provided
    if (!sourceSectionId || !targetSectionId) {
      return NextResponse.json({ error: "Source and target section IDs are required" }, { status: 400 });
    }

    // Get the task to move
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If moving within the same section, reorder tasks
    if (sourceSectionId === targetSectionId) {
      const sectionTasks = await db.query.tasks.findMany({
        where: eq(tasks.sectionId, sourceSectionId),
        orderBy: [asc(tasks.order)],
      });

      // Remove the moved task from its current position
      const filteredTasks = sectionTasks.filter(t => t.id !== taskId);

      // Insert it at the new position
      filteredTasks.splice(newOrder, 0, task);

      // Update all task orders
      for (let i = 0; i < filteredTasks.length; i++) {
        await db.update(tasks).set({ order: i, updatedAt: new Date() }).where(eq(tasks.id, filteredTasks[i].id));
      }
    } else {
      // Moving between sections
      const sourceTasks = await db.query.tasks.findMany({
        where: eq(tasks.sectionId, sourceSectionId),
        orderBy: [asc(tasks.order)],
      });

      const targetTasks = await db.query.tasks.findMany({
        where: eq(tasks.sectionId, targetSectionId),
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
        .where(eq(tasks.id, taskId));

      // Reorder remaining source section tasks
      for (let i = 0; i < updatedSourceTasks.length; i++) {
        if (updatedSourceTasks[i].order !== i) {
          await db.update(tasks).set({ order: i, updatedAt: new Date() }).where(eq(tasks.id, updatedSourceTasks[i].id));
        }
      }

      // Reorder target section tasks
      for (let i = 0; i < updatedTargetTasks.length; i++) {
        if (updatedTargetTasks[i].id !== taskId && updatedTargetTasks[i].order !== i) {
          await db.update(tasks).set({ order: i, updatedAt: new Date() }).where(eq(tasks.id, updatedTargetTasks[i].id));
        }
      }
    }

    // Fetch the updated task
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error reordering task:", error);
    return NextResponse.json({ error: "Failed to reorder task" }, { status: 500 });
  }
}

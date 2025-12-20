import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { taskId, sourceSectionId, targetSectionId, newOrder } = body;

    // Validate that both section IDs are provided
    if (!sourceSectionId || !targetSectionId) {
      return NextResponse.json(
        { error: "Source and target section IDs are required" },
        { status: 400 }
      );
    }

    // Get the task to move
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If moving within the same section, reorder tasks
    if (sourceSectionId === targetSectionId) {
      const sectionTasks = await prisma.task.findMany({
        where: { sectionId: sourceSectionId },
        orderBy: { order: "asc" },
      });

      // Remove the moved task from its current position
      const filteredTasks = sectionTasks.filter(t => t.id !== taskId);

      // Insert it at the new position
      filteredTasks.splice(newOrder, 0, task);

      // Update all task orders in a transaction
      await prisma.$transaction(
        filteredTasks.map((t, index) =>
          prisma.task.update({
            where: { id: t.id },
            data: { order: index },
          })
        )
      );
    } else {
      // Moving between sections
      const sourceTasks = await prisma.task.findMany({
        where: { sectionId: sourceSectionId },
        orderBy: { order: "asc" },
      });

      const targetTasks = await prisma.task.findMany({
        where: { sectionId: targetSectionId },
        orderBy: { order: "asc" },
      });

      // Remove task from source
      const updatedSourceTasks = sourceTasks.filter(t => t.id !== taskId);

      // Insert task into target at new position
      const updatedTargetTasks = [...targetTasks];
      updatedTargetTasks.splice(newOrder, 0, task);

      // Create all updates in a transaction
      const updates = [];

      // Update the moved task's section and order
      updates.push(
        prisma.task.update({
          where: { id: taskId },
          data: {
            sectionId: targetSectionId,
            order: newOrder,
          },
        })
      );

      // Reorder remaining source section tasks
      updatedSourceTasks.forEach((t, index) => {
        if (t.order !== index) {
          updates.push(
            prisma.task.update({
              where: { id: t.id },
              data: { order: index },
            })
          );
        }
      });

      // Reorder target section tasks
      updatedTargetTasks.forEach((t, index) => {
        if (t.id !== taskId && t.order !== index) {
          updates.push(
            prisma.task.update({
              where: { id: t.id },
              data: { order: index },
            })
          );
        }
      });

      await prisma.$transaction(updates);
    }

    // Fetch the updated task
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error reordering task:", error);
    return NextResponse.json(
      { error: "Failed to reorder task" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { taskId, sourceSectionId, targetSectionId, newOrder } = body;

    // Get the task to move
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the task's section and order
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        sectionId: targetSectionId,
        order: newOrder ?? task.order,
      },
    });

    // If moving within the same section, reorder other tasks
    if (sourceSectionId === targetSectionId) {
      const sectionTasks = await prisma.task.findMany({
        where: { sectionId: sourceSectionId },
        orderBy: { order: "asc" },
      });

      // Reorder tasks
      const reorderedTasks = [...sectionTasks];
      const taskIndex = reorderedTasks.findIndex(t => t.id === taskId);
      const [movedTask] = reorderedTasks.splice(taskIndex, 1);
      reorderedTasks.splice(newOrder, 0, movedTask);

      // Update all task orders
      const updatePromises = reorderedTasks.map((t, index) =>
        prisma.task.update({
          where: { id: t.id },
          data: { order: index },
        })
      );

      await Promise.all(updatePromises);
    } else {
      // Moving between sections - update orders for both sections
      const sourceTasks = await prisma.task.findMany({
        where: { sectionId: sourceSectionId },
        orderBy: { order: "asc" },
      });

      const targetTasks = await prisma.task.findMany({
        where: { sectionId: targetSectionId },
        orderBy: { order: "asc" },
      });

      // Update source section orders
      const sourceUpdatePromises = sourceTasks
        .filter(t => t.id !== taskId)
        .map((t, index) =>
          prisma.task.update({
            where: { id: t.id },
            data: { order: index },
          })
        );

      // Update target section orders
      const targetUpdatePromises = targetTasks.map((t, index) =>
        prisma.task.update({
          where: { id: t.id },
          data: { order: index + (index >= newOrder ? 1 : 0) },
        })
      );

      await Promise.all([...sourceUpdatePromises, ...targetUpdatePromises]);
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error reordering task:", error);
    return NextResponse.json(
      { error: "Failed to reorder task" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        section: true,
      },
      orderBy: [{ sectionId: "asc" }, { order: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      sectionId,
      time,
      duration,
      color,
      recurrence,
      subtasks,
      order,
    } = body;

    const task = await prisma.task.create({
      data: {
        title,
        sectionId,
        time,
        duration: duration ?? 30,
        color: color ?? "#3b82f6",
        recurrence: recurrence || null,
        subtasks: subtasks || [],
        order: order ?? 0,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      sectionId,
      time,
      duration,
      color,
      recurrence,
      subtasks,
      completed,
      expanded,
      order,
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Verify task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data object, only including defined and non-null fields
    // sectionId must always be valid since it's required
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (sectionId !== undefined && sectionId !== null) {
      // Only validate and update sectionId if it's different from current value
      if (sectionId !== existingTask.sectionId) {
        // Validate section exists if sectionId is being updated
        const section = await prisma.section.findUnique({
          where: { id: sectionId },
        });
        if (!section) {
          return NextResponse.json(
            { error: "Invalid section ID" },
            { status: 400 }
          );
        }
        updateData.sectionId = sectionId;
      }
      // If sectionId is the same, skip updating it (no-op)
    }
    if (time !== undefined) updateData.time = time;
    if (duration !== undefined) updateData.duration = duration;
    if (color !== undefined) updateData.color = color;
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (subtasks !== undefined) updateData.subtasks = subtasks;
    if (completed !== undefined) updateData.completed = completed;
    if (expanded !== undefined) updateData.expanded = expanded;
    if (order !== undefined) updateData.order = order;

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingTask);
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        section: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    // Return more detailed error information
    const errorMessage = error.message || "Failed to update task";
    const statusCode = error.code === "P2025" ? 404 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

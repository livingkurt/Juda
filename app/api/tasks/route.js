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

    const task = await prisma.task.update({
      where: { id },
      data: {
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
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
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

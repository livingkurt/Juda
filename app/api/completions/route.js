import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch completions with optional filters
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const { searchParams } = url;
    const taskId = searchParams.get("taskId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where = {};
    if (taskId) where.taskId = taskId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const completions = await prisma.taskCompletion.findMany({
      where,
      include: {
        task: {
          include: {
            section: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(completions);
  } catch (error) {
    console.error("Error fetching completions:", error);
    return NextResponse.json(
      { error: "Failed to fetch completions", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a completion record
export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, date } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Normalize date to start of day for consistent storage
    const completionDate = date ? new Date(date) : new Date();
    completionDate.setHours(0, 0, 0, 0);

    // Check if completion already exists for this task and date
    const existing = await prisma.taskCompletion.findUnique({
      where: {
        taskId_date: {
          taskId,
          date: completionDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const completion = await prisma.taskCompletion.create({
      data: {
        taskId,
        date: completionDate,
      },
      include: {
        task: {
          include: {
            section: true,
          },
        },
      },
    });

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    console.error("Error creating completion:", error);
    return NextResponse.json(
      { error: "Failed to create completion" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a completion record
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const date = searchParams.get("date");

    if (!taskId || !date) {
      return NextResponse.json(
        { error: "Task ID and date are required" },
        { status: 400 }
      );
    }

    // Normalize date to start of day
    const completionDate = new Date(date);
    completionDate.setHours(0, 0, 0, 0);

    await prisma.taskCompletion.delete({
      where: {
        taskId_date: {
          taskId,
          date: completionDate,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting completion:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Completion not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete completion" },
      { status: 500 }
    );
  }
}

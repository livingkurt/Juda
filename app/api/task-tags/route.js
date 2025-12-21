import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

// GET tags for a specific task
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const result = await db.query.taskTags.findMany({
      where: eq(taskTags.taskId, taskId),
      with: {
        tag: true,
      },
    });

    const tagsForTask = result.map(tt => tt.tag);
    return NextResponse.json(tagsForTask);
  } catch (error) {
    console.error("Error fetching task tags:", error);
    return NextResponse.json({ error: "Failed to fetch task tags" }, { status: 500 });
  }
}

// POST assign tag to task
export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, tagId } = body;

    if (!taskId || !tagId) {
      return NextResponse.json({ error: "Task ID and Tag ID are required" }, { status: 400 });
    }

    // Check if assignment already exists
    const existing = await db.query.taskTags.findFirst({
      where: and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)),
    });

    if (existing) {
      return NextResponse.json({ message: "Tag already assigned" }, { status: 200 });
    }

    const [taskTag] = await db.insert(taskTags).values({ taskId, tagId }).returning();

    return NextResponse.json(taskTag, { status: 201 });
  } catch (error) {
    console.error("Error assigning tag:", error);
    return NextResponse.json({ error: "Failed to assign tag" }, { status: 500 });
  }
}

// DELETE remove tag from task
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const tagId = searchParams.get("tagId");

    if (!taskId || !tagId) {
      return NextResponse.json({ error: "Task ID and Tag ID are required" }, { status: 400 });
    }

    await db.delete(taskTags).where(and(eq(taskTags.taskId, taskId), eq(taskTags.tagId, tagId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing tag:", error);
    return NextResponse.json({ error: "Failed to remove tag" }, { status: 500 });
  }
}

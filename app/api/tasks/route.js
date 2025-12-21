import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const allTasks = await db.query.tasks.findMany({
      with: {
        section: true,
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [asc(tasks.sectionId), asc(tasks.order)],
    });

    // Transform to include tags array directly on task
    const tasksWithTags = allTasks.map(task => ({
      ...task,
      tags: task.taskTags?.map(tt => tt.tag) || [],
    }));

    return NextResponse.json(tasksWithTags);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, sectionId, parentId, time, duration, color, recurrence, order } = body;

    const [task] = await db
      .insert(tasks)
      .values({
        title,
        sectionId,
        parentId: parentId || null,
        time: time || null,
        duration: duration ?? 30,
        color: color ?? "#3b82f6",
        recurrence: recurrence || null,
        order: order ?? 0,
      })
      .returning();

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, sectionId, parentId, time, duration, color, recurrence, expanded, order } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify task exists
    const existingTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data object, only including defined and non-null fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (sectionId !== undefined && sectionId !== null) {
      // Only validate and update sectionId if it's different from current value
      if (sectionId !== existingTask.sectionId) {
        // Validate section exists if sectionId is being updated
        const section = await db.query.sections.findFirst({
          where: eq(sections.id, sectionId),
        });
        if (!section) {
          return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });
        }
        updateData.sectionId = sectionId;
      }
    }
    if (parentId !== undefined) updateData.parentId = parentId; // Allow null to clear parent
    if (time !== undefined) updateData.time = time;
    if (duration !== undefined) updateData.duration = duration;
    if (color !== undefined) updateData.color = color;
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (expanded !== undefined) updateData.expanded = expanded;
    if (order !== undefined) updateData.order = order;

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingTask);
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();

    // Fetch with section and tags relations
    const taskWithRelations = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
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
    const taskWithTags = {
      ...taskWithRelations,
      tags: taskWithRelations.taskTags?.map(tt => tt.tag) || [],
    };

    return NextResponse.json(taskWithTags);
  } catch (error) {
    console.error("Error updating task:", error);
    // Return more detailed error information
    const errorMessage = error.message || "Failed to update task";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const allTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
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
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      title,
      sectionId,
      parentId,
      time,
      duration,
      recurrence,
      order,
      completionType,
      content,
      // workoutData removed - now managed separately via /api/workout-programs
      folderId,
    } = body;

    // Verify the section belongs to this user
    const section = await db.query.sections.findFirst({
      where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const [task] = await db
      .insert(tasks)
      .values({
        userId,
        title,
        sectionId,
        parentId: parentId || null,
        time: time || null,
        duration: duration ?? 30,
        recurrence: recurrence || null,
        order: order ?? 0,
        completionType: completionType || "checkbox",
        content: content || null,
        // workoutData removed - now managed separately via /api/workout-programs
        folderId: folderId || null,
      })
      .returning();

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      id,
      title,
      sectionId,
      parentId,
      time,
      duration,
      recurrence,
      expanded,
      order,
      status,
      startedAt,
      completionType,
      content,
      // workoutData removed - now managed separately via /api/workout-programs
      folderId,
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify task exists and belongs to user
    const existingTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
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
        // Validate section exists and belongs to user if sectionId is being updated
        const section = await db.query.sections.findFirst({
          where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
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
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (expanded !== undefined) updateData.expanded = expanded;
    if (order !== undefined) updateData.order = order;
    if (status !== undefined) {
      if (!["todo", "in_progress", "complete"].includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updateData.status = status;

      // Handle status transitions
      if (status === "in_progress" && !existingTask.startedAt) {
        // When moving to in_progress, set startedAt if not already set
        updateData.startedAt = new Date();
      } else if (status === "todo") {
        // When moving back to todo, clear startedAt
        updateData.startedAt = null;
      }
    }

    // Allow explicit startedAt updates
    if (startedAt !== undefined) {
      updateData.startedAt = startedAt ? new Date(startedAt) : null;
    }
    if (completionType !== undefined) {
      if (!["checkbox", "text", "note", "workout"].includes(completionType)) {
        return NextResponse.json({ error: "Invalid completionType value" }, { status: 400 });
      }
      updateData.completionType = completionType;
    }
    if (content !== undefined) updateData.content = content;
    // workoutData removed - now managed separately via /api/workout-programs
    if (folderId !== undefined) updateData.folderId = folderId;

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingTask);
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    // Fetch with section and tags relations
    const taskWithRelations = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
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
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify and delete (only if belongs to user)
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

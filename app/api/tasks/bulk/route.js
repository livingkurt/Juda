import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { inArray, eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function PATCH(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskIds, updates } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs array is required" }, { status: 400 });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Updates object is required" }, { status: 400 });
    }

    // Validate updates - only allow certain fields
    const allowedFields = ["sectionId", "time", "duration", "color", "recurrence"];
    const updateData = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
    }

    // Verify all tasks belong to the user and perform update
    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    // Perform bulk update with user verification
    const result = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
      .returning();

    if (result.length !== taskIds.length) {
      return NextResponse.json({ error: "Some tasks not found or do not belong to user" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.length,
      updates: updateData,
    });
  } catch (error) {
    console.error("Error bulk updating tasks:", error);
    return NextResponse.json({ error: "Failed to bulk update tasks", details: error.message }, { status: 500 });
  }
}

// Bulk delete
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskIds } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs array is required" }, { status: 400 });
    }

    // Delete tasks with user verification
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
      .returning();

    if (result.length !== taskIds.length) {
      return NextResponse.json({ error: "Some tasks not found or do not belong to user" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.length,
    });
  } catch (error) {
    console.error("Error bulk deleting tasks:", error);
    return NextResponse.json({ error: "Failed to bulk delete tasks", details: error.message }, { status: 500 });
  }
}

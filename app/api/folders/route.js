import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteFolders } from "@/lib/schema";
import { eq, asc, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch all folders for the authenticated user
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const folders = await db.query.noteFolders.findMany({
      where: eq(noteFolders.userId, userId),
      orderBy: [asc(noteFolders.order)],
    });
    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

// POST - Create a folder
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { name, icon, color, parentId, order } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [folder] = await db
      .insert(noteFolders)
      .values({
        userId,
        name: name.trim(),
        icon: icon || "folder",
        color: color || "#6b7280",
        parentId: parentId || null,
        order: order ?? 0,
      })
      .returning();

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}

// PUT - Update a folder
export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    // Verify folder belongs to user
    const existingFolder = await db.query.noteFolders.findFirst({
      where: and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)),
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const [folder] = await db
      .update(noteFolders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)))
      .returning();

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

// DELETE - Delete a folder
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
    }

    // Verify folder belongs to user before deleting
    const existingFolder = await db.query.noteFolders.findFirst({
      where: and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)),
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Notes in this folder will have folderId set to null (ON DELETE SET NULL)
    await db.delete(noteFolders).where(and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}

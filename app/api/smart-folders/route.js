import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smartFolders } from "@/lib/schema";
import { eq, asc, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch all smart folders for the authenticated user
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const folders = await db.query.smartFolders.findMany({
      where: eq(smartFolders.userId, userId),
      orderBy: [asc(smartFolders.order)],
    });
    return NextResponse.json(folders);
  } catch (error) {
    console.error("Error fetching smart folders:", error);
    return NextResponse.json({ error: "Failed to fetch smart folders" }, { status: 500 });
  }
}

// POST - Create a smart folder
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { name, icon, color, filters, order } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const [folder] = await db
      .insert(smartFolders)
      .values({
        userId,
        name: name.trim(),
        icon: icon || "zap",
        color: color || "#8b5cf6",
        filters: filters || { tags: [], operator: "any" },
        order: order ?? 0,
      })
      .returning();

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating smart folder:", error);
    return NextResponse.json({ error: "Failed to create smart folder" }, { status: 500 });
  }
}

// PUT - Update a smart folder
export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Smart folder ID is required" }, { status: 400 });
    }

    // Verify smart folder belongs to user
    const existingFolder = await db.query.smartFolders.findFirst({
      where: and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)),
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Smart folder not found" }, { status: 404 });
    }

    const [folder] = await db
      .update(smartFolders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)))
      .returning();

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error updating smart folder:", error);
    return NextResponse.json({ error: "Failed to update smart folder" }, { status: 500 });
  }
}

// DELETE - Delete a smart folder
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Smart folder ID is required" }, { status: 400 });
    }

    // Verify smart folder belongs to user before deleting
    const existingFolder = await db.query.smartFolders.findFirst({
      where: and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)),
    });

    if (!existingFolder) {
      return NextResponse.json({ error: "Smart folder not found" }, { status: 404 });
    }

    await db.delete(smartFolders).where(and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting smart folder:", error);
    return NextResponse.json({ error: "Failed to delete smart folder" }, { status: 500 });
  }
}

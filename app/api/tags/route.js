import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

// GET all tags
export async function GET() {
  try {
    const allTags = await db.query.tags.findMany({
      orderBy: [asc(tags.name)],
    });
    return NextResponse.json(allTags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST create new tag
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    const [tag] = await db
      .insert(tags)
      .values({
        name: name.trim(),
        color: color || "#6366f1",
      })
      .returning();

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

// PUT update tag
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, color } = body;

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    const [updatedTag] = await db.update(tags).set(updateData).where(eq(tags.id, id)).returning();

    if (!updatedTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
  }
}

// DELETE tag
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    await db.delete(tags).where(eq(tags.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

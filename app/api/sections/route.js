import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const allSections = await db.query.sections.findMany({
      where: eq(sections.userId, userId),
      orderBy: [asc(sections.order), asc(sections.createdAt)],
    });
    return NextResponse.json(allSections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections", details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name, icon, order, expanded } = body;

    const [section] = await db
      .insert(sections)
      .values({
        userId,
        name,
        icon,
        order: order ?? 0,
        expanded: expanded ?? true,
      })
      .returning();

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Error creating section:", error);
    return NextResponse.json({ error: "Failed to create section", details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { id, name, icon, order, expanded } = body;

    // Verify section belongs to user
    const existingSection = await db.query.sections.findFirst({
      where: and(eq(sections.id, id), eq(sections.userId, userId)),
    });

    if (!existingSection) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;
    if (expanded !== undefined) updateData.expanded = expanded;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const [section] = await db
      .update(sections)
      .set(updateData)
      .where(and(eq(sections.id, id), eq(sections.userId, userId)))
      .returning();

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    // Verify and delete (only if belongs to user)
    await db.delete(sections).where(and(eq(sections.id, id), eq(sections.userId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

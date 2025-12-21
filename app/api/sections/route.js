import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const allSections = await db.query.sections.findMany({
      orderBy: [asc(sections.order), asc(sections.createdAt)],
    });
    return NextResponse.json(allSections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return NextResponse.json({ error: "Failed to fetch sections", details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, icon, order, expanded } = body;

    const [section] = await db
      .insert(sections)
      .values({
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
  try {
    const body = await request.json();
    const { id, name, icon, order, expanded } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;
    if (expanded !== undefined) updateData.expanded = expanded;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const [section] = await db.update(sections).set(updateData).where(eq(sections.id, id)).returning();

    return NextResponse.json(section);
  } catch (error) {
    console.error("Error updating section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    await db.delete(sections).where(eq(sections.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}

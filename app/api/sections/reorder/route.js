import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PUT(request) {
  try {
    const body = await request.json();
    const { sections: sectionsToUpdate } = body;

    // Update all sections with new order
    for (let i = 0; i < sectionsToUpdate.length; i++) {
      await db.update(sections).set({ order: i, updatedAt: new Date() }).where(eq(sections.id, sectionsToUpdate[i].id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering sections:", error);
    return NextResponse.json({ error: "Failed to reorder sections" }, { status: 500 });
  }
}

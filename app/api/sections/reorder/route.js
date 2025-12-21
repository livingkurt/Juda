import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { sections: sectionsToUpdate } = body;

    // Verify all sections belong to user and update with new order
    for (let i = 0; i < sectionsToUpdate.length; i++) {
      await db
        .update(sections)
        .set({ order: i, updatedAt: new Date() })
        .where(and(eq(sections.id, sectionsToUpdate[i].id), eq(sections.userId, userId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering sections:", error);
    return NextResponse.json({ error: "Failed to reorder sections" }, { status: 500 });
  }
}

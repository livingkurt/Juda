import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors } from "@/lib/apiHelpers";

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { sections: sectionsToUpdate } = body;

  if (!Array.isArray(sectionsToUpdate) || sectionsToUpdate.length === 0) {
    throw Errors.badRequest("Sections array is required and must not be empty");
  }

  for (let i = 0; i < sectionsToUpdate.length; i++) {
    await db
      .update(sections)
      .set({ order: i, updatedAt: new Date() })
      .where(and(eq(sections.id, sectionsToUpdate[i].id), eq(sections.userId, userId)));
  }

  return NextResponse.json({ success: true });
});

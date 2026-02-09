import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSections } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { withApi, Errors } from "@/lib/apiHelpers";

export const PUT = withApi(async (request, { getBody }) => {
  const body = await getBody();
  const { sections: sectionsToUpdate, cycleId } = body;

  if (!Array.isArray(sectionsToUpdate) || sectionsToUpdate.length === 0) {
    throw Errors.badRequest("Sections array is required and must not be empty");
  }

  if (!cycleId) {
    throw Errors.badRequest("cycleId is required");
  }

  // Update each section's order
  for (let i = 0; i < sectionsToUpdate.length; i++) {
    await db.update(workoutSections).set({ order: i }).where(eq(workoutSections.id, sectionsToUpdate[i].id));
  }

  return NextResponse.json({ success: true });
});

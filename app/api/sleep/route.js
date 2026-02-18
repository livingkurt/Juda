import { NextResponse } from "next/server";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";
import { db } from "@/lib/db.js";
import { sleepEntries } from "@/lib/schema.js";
import { eq, and, desc } from "drizzle-orm";

// GET /api/sleep - Get sleep entries for the authenticated user
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const date = searchParams.get("date"); // Optional: get specific date

    let entries;
    if (date) {
      entries = await db
        .select()
        .from(sleepEntries)
        .where(and(eq(sleepEntries.userId, userId), eq(sleepEntries.date, date)));
    } else {
      entries = await db
        .select()
        .from(sleepEntries)
        .where(eq(sleepEntries.userId, userId))
        .orderBy(desc(sleepEntries.date))
        .limit(limit);
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching sleep entries:", error);
    return NextResponse.json({ error: "Failed to fetch sleep entries" }, { status: 500 });
  }
}

// POST /api/sleep - Create or update a sleep entry
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { date, sleepStart, sleepEnd, durationMinutes, source, quality, notes } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
    }

    // Upsert: update if entry exists for this date, otherwise create
    const existing = await db
      .select()
      .from(sleepEntries)
      .where(and(eq(sleepEntries.userId, userId), eq(sleepEntries.date, date)));

    let entry;
    if (existing.length > 0) {
      // Update existing entry
      const updateData = { updatedAt: new Date() };
      if (sleepStart !== undefined) updateData.sleepStart = new Date(sleepStart);
      if (sleepEnd !== undefined) updateData.sleepEnd = new Date(sleepEnd);
      if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
      if (source !== undefined) updateData.source = source;
      if (quality !== undefined) updateData.quality = quality;
      if (notes !== undefined) updateData.notes = notes;

      [entry] = await db
        .update(sleepEntries)
        .set(updateData)
        .where(and(eq(sleepEntries.userId, userId), eq(sleepEntries.date, date)))
        .returning();
    } else {
      // Create new entry
      [entry] = await db
        .insert(sleepEntries)
        .values({
          userId,
          date,
          sleepStart: sleepStart ? new Date(sleepStart) : null,
          sleepEnd: sleepEnd ? new Date(sleepEnd) : null,
          durationMinutes: durationMinutes || null,
          source: source || "manual",
          quality: quality || null,
          notes: notes || null,
        })
        .returning();
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error saving sleep entry:", error);
    return NextResponse.json({ error: "Failed to save sleep entry" }, { status: 500 });
  }
}

// DELETE /api/sleep - Delete a sleep entry by date
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
    }

    await db
      .delete(sleepEntries)
      .where(and(eq(sleepEntries.userId, userId), eq(sleepEntries.date, date)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sleep entry:", error);
    return NextResponse.json({ error: "Failed to delete sleep entry" }, { status: 500 });
  }
}

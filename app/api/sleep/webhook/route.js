import { NextResponse } from "next/server";
import { db } from "@/lib/db.js";
import { sleepEntries, users } from "@/lib/schema.js";
import { eq, and } from "drizzle-orm";

// POST /api/sleep/webhook - Receive sleep data from iOS Shortcut
// Authenticated via SLEEP_WEBHOOK_KEY header (no user login needed)
export async function POST(request) {
  try {
    const webhookKey = request.headers.get("x-webhook-key");
    const expectedKey = process.env.SLEEP_WEBHOOK_KEY;

    if (!expectedKey || webhookKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, date, sleepStart, sleepEnd, durationMinutes, source } = body;

    if (!email || !date) {
      return NextResponse.json({ error: "email and date are required" }, { status: 400 });
    }

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate duration from start/end if not provided
    let duration = durationMinutes;
    if (!duration && sleepStart && sleepEnd) {
      const start = new Date(sleepStart);
      const end = new Date(sleepEnd);
      duration = Math.round((end - start) / (1000 * 60));
    }

    // Upsert sleep entry
    const existing = await db
      .select()
      .from(sleepEntries)
      .where(and(eq(sleepEntries.userId, user.id), eq(sleepEntries.date, date)));

    let entry;
    if (existing.length > 0) {
      [entry] = await db
        .update(sleepEntries)
        .set({
          sleepStart: sleepStart ? new Date(sleepStart) : existing[0].sleepStart,
          sleepEnd: sleepEnd ? new Date(sleepEnd) : existing[0].sleepEnd,
          durationMinutes: duration || existing[0].durationMinutes,
          source: source || "apple_health",
          updatedAt: new Date(),
        })
        .where(and(eq(sleepEntries.userId, user.id), eq(sleepEntries.date, date)))
        .returning();
    } else {
      [entry] = await db
        .insert(sleepEntries)
        .values({
          userId: user.id,
          date,
          sleepStart: sleepStart ? new Date(sleepStart) : null,
          sleepEnd: sleepEnd ? new Date(sleepEnd) : null,
          durationMinutes: duration || null,
          source: source || "apple_health",
        })
        .returning();
    }

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Sleep webhook error:", error);
    return NextResponse.json({ error: "Failed to save sleep data" }, { status: 500 });
  }
}

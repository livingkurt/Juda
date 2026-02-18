import { NextResponse } from "next/server";
import { db } from "@/lib/db.js";
import { sleepEntries, users } from "@/lib/schema.js";
import { eq, and } from "drizzle-orm";

// Try to parse any date string into a valid Date
function parseFlexibleDate(str) {
  if (!str || str.trim() === "") return null;
  // Try native Date parse first (handles ISO, RFC, and many formats)
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// Format date as YYYY-MM-DD
function toDateString(d) {
  return d.toISOString().split("T")[0];
}

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
    console.log("Sleep webhook received body:", JSON.stringify(body));

    const { email, date, sleepStart, sleepEnd, durationMinutes, source } = body;

    // Find user - by email if provided, otherwise use first user (single-user app)
    let user;
    if (email) {
      [user] = await db.select().from(users).where(eq(users.email, email));
    }
    if (!user) {
      // Fallback: get first user (Juda is single-user)
      const allUsers = await db.select().from(users).limit(1);
      user = allUsers[0];
    }
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // Parse dates flexibly
    const parsedStart = parseFlexibleDate(sleepStart);
    const parsedEnd = parseFlexibleDate(sleepEnd);

    // Determine the date - use provided date, or derive from sleep end (wake date), or start
    let sleepDate = date && date.trim() !== "" ? date : null;
    if (!sleepDate && parsedEnd) {
      sleepDate = toDateString(parsedEnd);
    } else if (!sleepDate && parsedStart) {
      sleepDate = toDateString(parsedStart);
    }

    if (!sleepDate) {
      // Last resort: use today
      sleepDate = toDateString(new Date());
    }

    // Calculate duration
    let duration = durationMinutes && durationMinutes !== "" ? Number(durationMinutes) : null;
    if (!duration && parsedStart && parsedEnd) {
      duration = Math.round((parsedEnd - parsedStart) / (1000 * 60));
    }

    // Upsert sleep entry
    const existing = await db
      .select()
      .from(sleepEntries)
      .where(and(eq(sleepEntries.userId, user.id), eq(sleepEntries.date, sleepDate)));

    let entry;
    if (existing.length > 0) {
      [entry] = await db
        .update(sleepEntries)
        .set({
          sleepStart: parsedStart || existing[0].sleepStart,
          sleepEnd: parsedEnd || existing[0].sleepEnd,
          durationMinutes: duration || existing[0].durationMinutes,
          source: source || "apple_health",
          updatedAt: new Date(),
        })
        .where(and(eq(sleepEntries.userId, user.id), eq(sleepEntries.date, sleepDate)))
        .returning();
    } else {
      [entry] = await db
        .insert(sleepEntries)
        .values({
          userId: user.id,
          date: sleepDate,
          sleepStart: parsedStart,
          sleepEnd: parsedEnd,
          durationMinutes: duration,
          source: source || "apple_health",
        })
        .returning();
    }

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Sleep webhook error:", error);
    return NextResponse.json({ error: "Failed to save sleep data", details: error.message }, { status: 500 });
  }
}

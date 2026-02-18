import { NextResponse } from "next/server";
import { db } from "@/lib/db.js";
import { sleepEntries, users } from "@/lib/schema.js";
import { eq, and } from "drizzle-orm";

// Parse flexible date strings like "Feb 18, 2026 at 8:51 AM"
function parseFlexibleDate(str) {
  if (!str || str.trim() === "") return null;
  // Remove "at" which Date() doesn't understand
  const cleaned = str.replace(" at ", " ");
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  // Try original string
  const d2 = new Date(str);
  if (!isNaN(d2.getTime())) return d2;
  return null;
}

function toDateString(d) {
  return d.toISOString().split("T")[0];
}

// POST /api/sleep/webhook
export async function POST(request) {
  try {
    const webhookKey = request.headers.get("x-webhook-key");
    const expectedKey = process.env.SLEEP_WEBHOOK_KEY;

    if (!expectedKey || webhookKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Sleep webhook received body:", JSON.stringify(body).substring(0, 500));

    const { email, source, timestamps, startDates, endDates, sleepStart, sleepEnd, date, durationMinutes } = body;

    // Find user by email
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let parsedStart = null;
    let parsedEnd = null;
    let sleepDate = null;
    let duration = null;

    // Parse newline-separated date lists from iOS Shortcuts
    function getFirstAndLast(str) {
      if (!str || typeof str !== "string") return [null, null];
      const lines = str.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return [null, null];
      return [parseFlexibleDate(lines[0]), parseFlexibleDate(lines[lines.length - 1])];
    }

    // Strategy 1: Separate startDates/endDates fields
    if (startDates) {
      const [first] = getFirstAndLast(startDates);
      if (first) parsedStart = first;
    }
    if (endDates) {
      const [, last] = getFirstAndLast(endDates);
      if (last) parsedEnd = last;
    }

    // Strategy 2: Combined timestamps field
    if (!parsedStart && timestamps) {
      const [first, last] = getFirstAndLast(timestamps);
      if (first) parsedStart = first;
      if (last && !parsedEnd) parsedEnd = last;
    }

    // Strategy 3: Explicit sleepStart/sleepEnd
    if (!parsedStart && sleepStart) parsedStart = parseFlexibleDate(sleepStart);
    if (!parsedEnd && sleepEnd) parsedEnd = parseFlexibleDate(sleepEnd);

    // Derive date from wake time (end), or sleep time (start), or explicit date, or today
    if (date && date.trim() !== "") {
      sleepDate = date;
    } else if (parsedEnd) {
      sleepDate = toDateString(parsedEnd);
    } else if (parsedStart) {
      sleepDate = toDateString(parsedStart);
    } else {
      sleepDate = toDateString(new Date());
    }

    // Calculate duration
    if (durationMinutes && durationMinutes !== "") {
      duration = Number(durationMinutes);
    } else if (parsedStart && parsedEnd) {
      duration = Math.round((parsedEnd - parsedStart) / (1000 * 60));
    }

    console.log(`Sleep webhook parsed: date=${sleepDate}, start=${parsedStart}, end=${parsedEnd}, duration=${duration}min`);

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

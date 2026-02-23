import { NextResponse } from "next/server";
import { db } from "@/lib/db.js";
import { users, tasks, taskCompletions } from "@/lib/schema.js";
import { eq, and } from "drizzle-orm";

// Parse flexible date strings like "Feb 18, 2026 at 8:51 AM"
function parseFlexibleDate(str) {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(" at ", " ");
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  const d2 = new Date(str);
  if (!isNaN(d2.getTime())) return d2;
  return null;
}

function toDateString(d) {
  return d.toISOString().split("T")[0];
}

function parseDurationToMinutes(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (parts.length === 2) {
    const [hours, minutes] = parts;
    return hours * 60 + minutes;
  }

  return null;
}

// Parse all timestamps from a newline-separated string
function parseAllDates(str) {
  if (!str || typeof str !== "string") return [];
  return str
    .split("\n")
    .map(l => l.trim())
    .filter(l => l)
    .map(parseFlexibleDate)
    .filter(d => d !== null);
}

// Find the last sleep session from a list of timestamps
// A "gap" of > 4 hours between consecutive timestamps means a new session
function getLastSession(dates) {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort((a, b) => a - b);

  let sessionStart = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60); // hours
    if (gap > 4) {
      sessionStart = i; // New session begins here
    }
  }

  return sorted.slice(sessionStart);
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
    console.warn("Sleep webhook received body:", JSON.stringify(body).substring(0, 500));

    const { email, source, timestamps, startDates, endDates, sleepStart, sleepEnd, date, durationMinutes, asleep } =
      body;

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

    // Strategy 1: Parse startDates/endDates from iOS Shortcuts
    // These are newline-separated lists of all sleep stage timestamps
    // We find the last sleep session (gap > 4h = new session)
    if (startDates || endDates) {
      const allStarts = parseAllDates(startDates);
      const allEnds = parseAllDates(endDates);
      const allTimestamps = [...allStarts, ...allEnds].sort((a, b) => a - b);

      const lastSession = getLastSession(allTimestamps);
      if (lastSession.length >= 2) {
        parsedStart = lastSession[0];
        parsedEnd = lastSession[lastSession.length - 1];
      } else if (lastSession.length === 1) {
        parsedStart = lastSession[0];
      }
    }

    // Strategy 2: Combined timestamps field
    if (!parsedStart && timestamps) {
      const allDates = parseAllDates(timestamps);
      const lastSession = getLastSession(allDates);
      if (lastSession.length >= 2) {
        parsedStart = lastSession[0];
        parsedEnd = lastSession[lastSession.length - 1];
      }
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

    // Duration priority:
    // 1) Explicit durationMinutes from source
    // 2) AutoSleep "asleep" value (already excludes awake gaps)
    // 3) Fallback math from start/end only for non-AutoSleep sources
    const normalizedSource = typeof source === "string" ? source.toLowerCase() : "";
    const isAutoSleepSource = normalizedSource.includes("autosleep") || normalizedSource === "apple_health";

    if (durationMinutes && durationMinutes !== "") {
      const parsed = Number(durationMinutes);
      duration = Number.isFinite(parsed) ? parsed : null;
    } else if (asleep && asleep !== "") {
      duration = parseDurationToMinutes(asleep);
    } else if (!isAutoSleepSource && parsedStart && parsedEnd) {
      duration = Math.round((parsedEnd - parsedStart) / (1000 * 60));
    }

    console.warn(
      `Sleep webhook parsed: date=${sleepDate}, start=${parsedStart?.toISOString()}, end=${parsedEnd?.toISOString()}, duration=${duration}min`
    );

    // Find the user's sleep task
    const [sleepTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.completionType, "sleep")));

    if (!sleepTask) {
      return NextResponse.json({ error: "No sleep task found for this user" }, { status: 404 });
    }

    // Convert sleepDate to Date object for TaskCompletion
    const completionDate = new Date(sleepDate + "T00:00:00.000Z");

    // Create sleep data for selectedOptions
    const sleepData = {
      sleepStart: parsedStart ? parsedStart.toISOString() : null,
      sleepEnd: parsedEnd ? parsedEnd.toISOString() : null,
      durationMinutes: duration || null,
      source: source || "apple_health",
    };

    // Upsert task completion
    const existing = await db
      .select()
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, sleepTask.id), eq(taskCompletions.date, completionDate)));

    let completion;
    if (existing.length > 0) {
      // Update existing completion
      const existingData = existing[0].selectedOptions || {};
      const mergedData = {
        ...existingData,
        ...sleepData,
      };

      [completion] = await db
        .update(taskCompletions)
        .set({
          outcome: "completed",
          selectedOptions: mergedData,
          completedAt: new Date(),
        })
        .where(and(eq(taskCompletions.taskId, sleepTask.id), eq(taskCompletions.date, completionDate)))
        .returning();
    } else {
      // Create new completion
      [completion] = await db
        .insert(taskCompletions)
        .values({
          taskId: sleepTask.id,
          date: completionDate,
          outcome: "completed",
          selectedOptions: sleepData,
          completedAt: new Date(),
        })
        .returning();
    }

    return NextResponse.json({ success: true, completion, sleepTask: sleepTask.title });
  } catch (error) {
    console.error("Sleep webhook error:", error);
    return NextResponse.json({ error: "Failed to save sleep data", details: error.message }, { status: 500 });
  }
}

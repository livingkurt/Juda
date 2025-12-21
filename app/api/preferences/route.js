import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";
import { mergeWithDefaults } from "@/lib/defaultPreferences";

// GET user preferences
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    // Return merged preferences (handles missing keys gracefully)
    const mergedPrefs = mergeWithDefaults(prefs?.preferences || {});

    return NextResponse.json(mergedPrefs);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

// PUT update user preferences (partial update)
export async function PUT(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const updates = await request.json();

    // Get existing preferences
    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (existing) {
      // Merge updates with existing preferences
      const currentPrefs = existing.preferences || {};
      const newPrefs = deepMerge(currentPrefs, updates);

      await db.update(userPreferences).set({ preferences: newPrefs }).where(eq(userPreferences.userId, userId));

      return NextResponse.json(mergeWithDefaults(newPrefs));
    } else {
      // Create new preferences record
      const newPrefs = mergeWithDefaults(updates);

      await db.insert(userPreferences).values({
        userId,
        preferences: newPrefs,
      });

      return NextResponse.json(newPrefs);
    }
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

// Helper function for deep merging objects
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === "object" &&
        target[key] !== null
      ) {
        // Deep merge nested objects
        result[key] = deepMerge(target[key], source[key]);
      } else {
        // Overwrite primitive values and arrays
        result[key] = source[key];
      }
    }
  }

  return result;
}

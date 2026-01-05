import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { withApi, withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";
import { mergeWithDefaults } from "@/lib/defaultPreferences";

const preferencesBroadcast = withBroadcast(ENTITY_TYPES.PREFERENCES);

export const GET = withApi(async (request, { userId }) => {
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  const mergedPrefs = mergeWithDefaults(prefs?.preferences || {});

  // Include userId for IndexedDB storage
  return NextResponse.json({ ...mergedPrefs, userId });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const updates = await getBody();

  const existing = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  let finalPrefs;
  if (existing) {
    const currentPrefs = existing.preferences || {};
    const newPrefs = deepMerge(currentPrefs, updates);

    await db.update(userPreferences).set({ preferences: newPrefs }).where(eq(userPreferences.userId, userId));

    finalPrefs = mergeWithDefaults(newPrefs);
  } else {
    const newPrefs = mergeWithDefaults(updates);

    await db.insert(userPreferences).values({
      userId,
      preferences: newPrefs,
    });

    finalPrefs = newPrefs;
  }

  // Include userId for IndexedDB storage
  const finalPrefsWithUserId = { ...finalPrefs, userId };

  // Broadcast to other clients
  preferencesBroadcast.onUpdate(userId, finalPrefsWithUserId, clientId);

  return NextResponse.json(finalPrefsWithUserId);
});

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
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { withApi } from "@/lib/apiHelpers";
import { mergeWithDefaults } from "@/lib/defaultPreferences";

export const GET = withApi(async (request, { userId }) => {
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  const mergedPrefs = mergeWithDefaults(prefs?.preferences || {});

  return NextResponse.json(mergedPrefs);
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const updates = await getBody();

  const existing = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  if (existing) {
    const currentPrefs = existing.preferences || {};
    const newPrefs = deepMerge(currentPrefs, updates);

    await db.update(userPreferences).set({ preferences: newPrefs }).where(eq(userPreferences.userId, userId));

    return NextResponse.json(mergeWithDefaults(newPrefs));
  } else {
    const newPrefs = mergeWithDefaults(updates);

    await db.insert(userPreferences).values({
      userId,
      preferences: newPrefs,
    });

    return NextResponse.json(newPrefs);
  }
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

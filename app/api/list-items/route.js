import { NextResponse } from "next/server";
import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { listItems } from "@/lib/schema";
import { withApi, validateRequired } from "@/lib/apiHelpers";

const normalizeListItemName = name => name.trim().toLowerCase().replace(/\s+/g, " ");
const normalizeTags = tags =>
  Array.from(new Set((Array.isArray(tags) ? tags : []).map(tag => String(tag || "").trim()).filter(Boolean)));

export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const search = searchParams.get("search")?.trim();

  const rows = await db.query.listItems.findMany({
    where: search
      ? and(eq(listItems.userId, userId), ilike(listItems.name, `%${search}%`))
      : eq(listItems.userId, userId),
    orderBy: [asc(listItems.name)],
  });

  return NextResponse.json(rows);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["name"]);

  const trimmedName = body.name.trim();
  const normalizedName = normalizeListItemName(trimmedName);
  const category = body.category?.trim() || null;
  const subCategory = body.subCategory?.trim() || null;
  const tags = normalizeTags(body.tags);

  const existing = await db.query.listItems.findFirst({
    where: and(eq(listItems.userId, userId), eq(listItems.normalizedName, normalizedName)),
  });

  if (existing) {
    const mergedTags = normalizeTags([
      ...(existing.tags || []),
      ...tags,
      ...(category ? [category] : []),
      ...(subCategory ? [subCategory] : []),
    ]);
    const nextCategory = existing.category || category;
    const nextSubCategory = existing.subCategory || subCategory;
    const needsUpdate =
      existing.category !== nextCategory ||
      existing.subCategory !== nextSubCategory ||
      JSON.stringify(existing.tags || []) !== JSON.stringify(mergedTags);

    if (!needsUpdate) {
      return NextResponse.json(existing);
    }

    const [updated] = await db
      .update(listItems)
      .set({
        category: nextCategory,
        subCategory: nextSubCategory,
        tags: mergedTags,
        updatedAt: new Date(),
      })
      .where(and(eq(listItems.userId, userId), eq(listItems.id, existing.id)))
      .returning();

    return NextResponse.json(updated);
  }

  const computedTags = normalizeTags([...tags, ...(category ? [category] : []), ...(subCategory ? [subCategory] : [])]);

  const [created] = await db
    .insert(listItems)
    .values({
      userId,
      name: trimmedName,
      normalizedName,
      category,
      subCategory,
      tags: computedTags,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smartFolders } from "@/lib/schema";
import { eq, asc, and } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const GET = withApi(async (request, { userId }) => {
  const folders = await db.query.smartFolders.findMany({
    where: eq(smartFolders.userId, userId),
    orderBy: [asc(smartFolders.order)],
  });
  return NextResponse.json(folders);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const { name, icon, color, filters, order } = await getBody();

  if (!name?.trim()) {
    throw Errors.validation("name", "is required");
  }

  const [folder] = await db
    .insert(smartFolders)
    .values({
      userId,
      name: name.trim(),
      icon: icon || "zap",
      color: color || "#8b5cf6",
      filters: filters || { tags: [], operator: "any" },
      order: order ?? 0,
    })
    .returning();

  return NextResponse.json(folder, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["id"]);

  const { id, ...updateData } = body;

  const existingFolder = await db.query.smartFolders.findFirst({
    where: and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)),
  });

  if (!existingFolder) {
    throw Errors.notFound("Smart folder");
  }

  const [folder] = await db
    .update(smartFolders)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)))
    .returning();

  return NextResponse.json(folder);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const id = getRequiredParam("id");

  const existingFolder = await db.query.smartFolders.findFirst({
    where: and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)),
  });

  if (!existingFolder) {
    throw Errors.notFound("Smart folder");
  }

  await db.delete(smartFolders).where(and(eq(smartFolders.id, id), eq(smartFolders.userId, userId)));

  return NextResponse.json({ success: true });
});

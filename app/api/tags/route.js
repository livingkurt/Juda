import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/schema";
import { eq, and, asc, ne } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const tagBroadcast = withBroadcast(ENTITY_TYPES.TAG);

export const GET = withApi(async (request, { userId }) => {
  // Filter out list-scoped tags from the main tags endpoint
  const allTags = await db.query.tags.findMany({
    where: and(eq(tags.userId, userId), ne(tags.scope, "list")),
    orderBy: [asc(tags.name)],
  });
  return NextResponse.json(allTags);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const { name, color } = body;

  if (!name?.trim()) {
    throw Errors.validation("name", "is required");
  }

  const [tag] = await db
    .insert(tags)
    .values({
      userId,
      name: name.trim(),
      color: color || "#6366f1",
    })
    .returning();

  // Broadcast to other clients
  tagBroadcast.onCreate(userId, tag, clientId);

  return NextResponse.json(tag, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  validateRequired(body, ["id"]);

  const { id, name, color } = body;

  const existingTag = await db.query.tags.findFirst({
    where: and(eq(tags.id, id), eq(tags.userId, userId)),
  });

  if (!existingTag) {
    throw Errors.notFound("Tag");
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (color !== undefined) updateData.color = color;

  const [updatedTag] = await db
    .update(tags)
    .set(updateData)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)))
    .returning();

  if (!updatedTag) {
    throw Errors.notFound("Tag");
  }

  // Broadcast to other clients
  tagBroadcast.onUpdate(userId, updatedTag, clientId);

  return NextResponse.json(updatedTag);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const clientId = getClientIdFromRequest(request);
  const id = getRequiredParam("id");

  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));

  // Broadcast to other clients
  tagBroadcast.onDelete(userId, id, clientId);

  return NextResponse.json({ success: true });
});

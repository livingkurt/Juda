import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tags } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { withApi, Errors, validateRequired, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const tagBroadcast = withBroadcast(ENTITY_TYPES.TAG);

// GET — Only list-scoped tags
export const GET = withApi(async (request, { userId }) => {
  const listTags = await db.query.tags.findMany({
    where: and(eq(tags.userId, userId), eq(tags.scope, "list")),
    orderBy: [asc(tags.name)],
  });
  return NextResponse.json(listTags);
});

// POST — Create a list-scoped tag
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
      scope: "list",
    })
    .returning();

  tagBroadcast.onCreate(userId, tag, clientId);
  return NextResponse.json(tag, { status: 201 });
});

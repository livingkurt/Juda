import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listItems, listItemTags } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, validateRequired, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcast = withBroadcast(ENTITY_TYPES.LIST_ITEM);

export const GET = withApi(async (request, { userId }) => {
  const items = await db.query.listItems.findMany({
    where: eq(listItems.userId, userId),
    with: {
      listItemTags: {
        with: { tag: true },
      },
    },
    orderBy: (items, { asc }) => [asc(items.name)],
  });

  return NextResponse.json(
    items.map(item => ({
      ...item,
      tags: item.listItemTags?.map(lit => lit.tag) || [],
    }))
  );
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["name"]);
  const clientId = getClientIdFromRequest(request);

  const [item] = await db.insert(listItems).values({
    userId,
    name: body.name,
    description: body.description || null,
  }).returning();

  // Add tags if provided
  if (body.tagIds?.length) {
    await db.insert(listItemTags).values(
      body.tagIds.map(tagId => ({ listItemId: item.id, tagId }))
    );
  }

  // Fetch with tags
  const fullItem = await db.query.listItems.findFirst({
    where: eq(listItems.id, item.id),
    with: { listItemTags: { with: { tag: true } } },
  });

  const result = { ...fullItem, tags: fullItem.listItemTags?.map(lit => lit.tag) || [] };
  broadcast.onCreate(userId, result, clientId);
  return NextResponse.json(result, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["id"]);
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listItems.findFirst({
    where: and(eq(listItems.id, body.id), eq(listItems.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListItem");

  const updates = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  const [updated] = await db.update(listItems).set(updates).where(eq(listItems.id, body.id)).returning();

  // Update tags if provided
  if (body.tagIds !== undefined) {
    await db.delete(listItemTags).where(eq(listItemTags.listItemId, body.id));
    if (body.tagIds.length) {
      await db.insert(listItemTags).values(
        body.tagIds.map(tagId => ({ listItemId: body.id, tagId }))
      );
    }
  }

  const fullItem = await db.query.listItems.findFirst({
    where: eq(listItems.id, body.id),
    with: { listItemTags: { with: { tag: true } } },
  });

  const result = { ...fullItem, tags: fullItem.listItemTags?.map(lit => lit.tag) || [] };
  broadcast.onUpdate(userId, result, clientId);
  return NextResponse.json(result);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const id = getRequiredParam("id");
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listItems.findFirst({
    where: and(eq(listItems.id, id), eq(listItems.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListItem");

  await db.delete(listItems).where(eq(listItems.id, id));
  broadcast.onDelete(userId, id, clientId);
  return NextResponse.json({ success: true });
});

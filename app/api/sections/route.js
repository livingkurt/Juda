import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sections } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const sectionBroadcast = withBroadcast(ENTITY_TYPES.SECTION);

export const GET = withApi(async (request, { userId }) => {
  const allSections = await db.query.sections.findMany({
    where: eq(sections.userId, userId),
    orderBy: [asc(sections.order), asc(sections.createdAt)],
  });
  return NextResponse.json(allSections);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  validateRequired(body, ["name"]);

  const { name, icon, order, expanded } = body;

  const [section] = await db
    .insert(sections)
    .values({
      userId,
      name,
      icon: icon || "list",
      order: order ?? 0,
      expanded: expanded ?? true,
    })
    .returning();

  // Broadcast to other clients
  sectionBroadcast.onCreate(userId, section, clientId);

  return NextResponse.json(section, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  validateRequired(body, ["id"]);

  const { id, name, icon, order, expanded } = body;

  const existingSection = await db.query.sections.findFirst({
    where: and(eq(sections.id, id), eq(sections.userId, userId)),
  });

  if (!existingSection) {
    throw Errors.notFound("Section");
  }

  const updateData = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (icon !== undefined) updateData.icon = icon;
  if (order !== undefined) updateData.order = order;
  if (expanded !== undefined) updateData.expanded = expanded;

  const [section] = await db
    .update(sections)
    .set(updateData)
    .where(and(eq(sections.id, id), eq(sections.userId, userId)))
    .returning();

  // Broadcast to other clients
  sectionBroadcast.onUpdate(userId, section, clientId);

  return NextResponse.json(section);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const clientId = getClientIdFromRequest(request);
  const id = getRequiredParam("id");

  await db.delete(sections).where(and(eq(sections.id, id), eq(sections.userId, userId)));

  // Broadcast to other clients
  sectionBroadcast.onDelete(userId, id, clientId);

  return NextResponse.json({ success: true });
});

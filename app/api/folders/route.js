import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { noteFolders } from "@/lib/schema";
import { eq, asc, and } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const folderBroadcast = withBroadcast(ENTITY_TYPES.FOLDER);

export const GET = withApi(async (request, { userId }) => {
  const folders = await db.query.noteFolders.findMany({
    where: eq(noteFolders.userId, userId),
    orderBy: [asc(noteFolders.order)],
  });
  return NextResponse.json(folders);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const { name, icon, color, parentId, order } = await getBody();

  if (!name?.trim()) {
    throw Errors.validation("name", "is required");
  }

  const [folder] = await db
    .insert(noteFolders)
    .values({
      userId,
      name: name.trim(),
      icon: icon || "folder",
      color: color || "#6b7280",
      parentId: parentId || null,
      order: order ?? 0,
    })
    .returning();

  // Broadcast to other clients
  folderBroadcast.onCreate(userId, folder, clientId);

  return NextResponse.json(folder, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  validateRequired(body, ["id"]);

  const { id, ...updateData } = body;

  const existingFolder = await db.query.noteFolders.findFirst({
    where: and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)),
  });

  if (!existingFolder) {
    throw Errors.notFound("Folder");
  }

  const [folder] = await db
    .update(noteFolders)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)))
    .returning();

  // Broadcast to other clients
  folderBroadcast.onUpdate(userId, folder, clientId);

  return NextResponse.json(folder);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const clientId = getClientIdFromRequest(request);
  const id = getRequiredParam("id");

  const existingFolder = await db.query.noteFolders.findFirst({
    where: and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)),
  });

  if (!existingFolder) {
    throw Errors.notFound("Folder");
  }

  await db.delete(noteFolders).where(and(eq(noteFolders.id, id), eq(noteFolders.userId, userId)));

  // Broadcast to other clients
  folderBroadcast.onDelete(userId, id, clientId);

  return NextResponse.json({ success: true });
});

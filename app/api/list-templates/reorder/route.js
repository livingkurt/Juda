import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcast = withBroadcast(ENTITY_TYPES.LIST_TEMPLATE);

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { items } = body; // [{ id, order }]
  const clientId = getClientIdFromRequest(request);

  if (!Array.isArray(items)) throw Errors.badRequest("items must be an array");

  await db.transaction(async tx => {
    for (const item of items) {
      await tx.update(listTemplates).set({ order: item.order }).where(
        and(eq(listTemplates.id, item.id), eq(listTemplates.userId, userId))
      );
    }
  });

  broadcast.onReorder(userId, items, clientId);
  return NextResponse.json({ success: true });
});

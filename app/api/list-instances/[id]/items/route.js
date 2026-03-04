import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listInstances, listInstanceItems } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcast = withBroadcast(ENTITY_TYPES.LIST_INSTANCE);

export const PUT = withApi(async (request, { userId, getBody }, context) => {
  const body = await getBody();
  const instanceId = context.params.id;
  const clientId = getClientIdFromRequest(request);

  // Verify ownership
  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
  });
  if (!instance) throw Errors.notFound("ListInstance");

  // body.items: [{ id, checked }]
  if (!Array.isArray(body.items)) throw Errors.badRequest("items must be an array");

  const now = new Date();
  await db.transaction(async tx => {
    for (const item of body.items) {
      await tx.update(listInstanceItems).set({
        checked: item.checked,
        checkedAt: item.checked ? now : null,
      }).where(
        and(eq(listInstanceItems.id, item.id), eq(listInstanceItems.instanceId, instanceId))
      );
    }
  });

  // Fetch updated instance
  const fullInstance = await db.query.listInstances.findFirst({
    where: eq(listInstances.id, instanceId),
    with: {
      instanceItems: { orderBy: (ii, { asc }) => [asc(ii.order)] },
      template: true,
    },
  });

  broadcast.onUpdate(userId, fullInstance, clientId);
  return NextResponse.json(fullInstance);
});

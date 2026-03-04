import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listInstances, listInstanceItems, listItems, listTemplates, listTemplateItems } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { withApi, Errors, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcastInstance = withBroadcast(ENTITY_TYPES.LIST_INSTANCE);
const broadcastTemplate = withBroadcast(ENTITY_TYPES.LIST_TEMPLATE);

// PUT — Batch update instance items (toggle checked, update quantity)
export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const instanceId = request.nextUrl.pathname.split("/list-instances/")[1].split("/")[0];
  const clientId = getClientIdFromRequest(request);

  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
  });
  if (!instance) throw Errors.notFound("ListInstance");

  if (!Array.isArray(body.items)) throw Errors.badRequest("items must be an array");

  const now = new Date();
  await db.transaction(async tx => {
    for (const item of body.items) {
      const updates = {};
      if (item.checked !== undefined) {
        updates.checked = item.checked;
        updates.checkedAt = item.checked ? now : null;
      }
      if (item.quantity !== undefined) {
        updates.quantity = Math.max(1, Math.floor(item.quantity));
      }
      if (Object.keys(updates).length > 0) {
        await tx
          .update(listInstanceItems)
          .set(updates)
          .where(and(eq(listInstanceItems.id, item.id), eq(listInstanceItems.instanceId, instanceId)));
      }
    }
  });

  const fullInstance = await fetchFullInstance(instanceId);
  broadcastInstance.onUpdate(userId, fullInstance, clientId);
  return NextResponse.json(fullInstance);
});

// POST — Add items to an existing instance
export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const instanceId = request.nextUrl.pathname.split("/list-instances/")[1].split("/")[0];
  const clientId = getClientIdFromRequest(request);

  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
    with: { instanceItems: true },
  });
  if (!instance) throw Errors.notFound("ListInstance");

  // body.items: [{ listItemId, name?, quantity? }] or body.newItems: [{ name, quantity? }]
  const itemsToAdd = body.items || [];
  const newItems = body.newItems || [];
  const maxOrder = instance.instanceItems.reduce((max, i) => Math.max(max, i.order), -1);
  let nextOrder = maxOrder + 1;

  const created = [];

  await db.transaction(async tx => {
    // Add existing library items
    for (const item of itemsToAdd) {
      let name = item.name;
      if (!name && item.listItemId) {
        const libItem = await tx.query.listItems.findFirst({
          where: eq(listItems.id, item.listItemId),
        });
        name = libItem?.name || "Unknown Item";
      }
      const [row] = await tx
        .insert(listInstanceItems)
        .values({
          instanceId,
          listItemId: item.listItemId || null,
          name: name || "New Item",
          order: nextOrder++,
          quantity: item.quantity ?? 1,
          checked: false,
        })
        .returning();
      created.push(row);
    }

    // Add brand new items (not in library)
    for (const item of newItems) {
      const [row] = await tx
        .insert(listInstanceItems)
        .values({
          instanceId,
          listItemId: null,
          name: item.name || "New Item",
          order: nextOrder++,
          quantity: item.quantity ?? 1,
          checked: false,
        })
        .returning();
      created.push(row);
    }
  });

  const fullInstance = await fetchFullInstance(instanceId);
  broadcastInstance.onUpdate(userId, fullInstance, clientId);
  return NextResponse.json(fullInstance);
});

// DELETE — Remove items from an instance
export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const instanceId = request.nextUrl.pathname.split("/list-instances/")[1].split("/")[0];
  const clientId = getClientIdFromRequest(request);
  const itemIds = request.nextUrl.searchParams.get("itemIds");

  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
  });
  if (!instance) throw Errors.notFound("ListInstance");

  if (!itemIds) throw Errors.badRequest("itemIds query param required");

  const ids = itemIds.split(",").filter(Boolean);
  if (ids.length > 0) {
    await db
      .delete(listInstanceItems)
      .where(and(eq(listInstanceItems.instanceId, instanceId), inArray(listInstanceItems.id, ids)));
  }

  const fullInstance = await fetchFullInstance(instanceId);
  broadcastInstance.onUpdate(userId, fullInstance, clientId);
  return NextResponse.json(fullInstance);
});

async function fetchFullInstance(instanceId) {
  const inst = await db.query.listInstances.findFirst({
    where: eq(listInstances.id, instanceId),
    with: {
      instanceItems: {
        orderBy: (ii, { asc }) => [asc(ii.order)],
        with: { listItem: { with: { listItemTags: { with: { tag: true } } } } },
      },
      template: true,
    },
  });
  if (!inst) return null;
  return {
    ...inst,
    instanceItems: inst.instanceItems.map(ii => ({
      ...ii,
      tags: ii.listItem?.listItemTags?.map(lit => lit.tag) || [],
      listItem: undefined,
    })),
  };
}

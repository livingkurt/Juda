import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  listInstances,
  listInstanceItems,
  listItems,
  listTemplates,
  listTemplateItems,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcastTemplate = withBroadcast(ENTITY_TYPES.LIST_TEMPLATE);

// POST — Update the source template to match this instance's current items
export const POST = withApi(async (request, { userId }) => {
  const instanceId = request.nextUrl.pathname.split("/list-instances/")[1].split("/")[0];
  const clientId = getClientIdFromRequest(request);

  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
    with: {
      instanceItems: { orderBy: (ii, { asc }) => [asc(ii.order)] },
    },
  });
  if (!instance) throw Errors.notFound("ListInstance");
  if (!instance.templateId) throw Errors.badRequest("Instance has no linked template");

  // Verify user owns the template
  const template = await db.query.listTemplates.findFirst({
    where: and(eq(listTemplates.id, instance.templateId), eq(listTemplates.userId, userId)),
  });
  if (!template) throw Errors.notFound("ListTemplate");

  await db.transaction(async tx => {
    // Remove all existing template items
    await tx.delete(listTemplateItems).where(eq(listTemplateItems.templateId, template.id));

    // Rebuild from instance items
    for (const ii of instance.instanceItems) {
      let libItemId = ii.listItemId;

      // If instance item has no library reference, create a library item
      if (!libItemId) {
        const [newLibItem] = await tx
          .insert(listItems)
          .values({ userId, name: ii.name })
          .returning();
        libItemId = newLibItem.id;
      }

      await tx.insert(listTemplateItems).values({
        templateId: template.id,
        listItemId: libItemId,
        order: ii.order,
        quantity: ii.quantity ?? 1,
      });
    }
  });

  const fullTemplate = await db.query.listTemplates.findFirst({
    where: eq(listTemplates.id, template.id),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: { listItem: true },
      },
    },
  });

  broadcastTemplate.onUpdate(userId, fullTemplate, clientId);
  return NextResponse.json(fullTemplate);
});

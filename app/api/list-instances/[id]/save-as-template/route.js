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

// POST — Create a new template from an instance's current state
export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const instanceId = request.nextUrl.pathname.split("/list-instances/")[1].split("/")[0];
  const clientId = getClientIdFromRequest(request);

  const instance = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, instanceId), eq(listInstances.userId, userId)),
    with: {
      instanceItems: { orderBy: (ii, { asc }) => [asc(ii.order)] },
    },
  });
  if (!instance) throw Errors.notFound("ListInstance");

  const result = await db.transaction(async tx => {
    // Create template
    const [template] = await tx
      .insert(listTemplates)
      .values({
        userId,
        name: body.name || `${instance.name} (copy)`,
        description: body.description || null,
      })
      .returning();

    // For each instance item, ensure library item exists, then add to template
    for (const ii of instance.instanceItems) {
      let libItemId = ii.listItemId;

      // If no library item reference, create one
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

    return template;
  });

  const fullTemplate = await db.query.listTemplates.findFirst({
    where: eq(listTemplates.id, result.id),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: { listItem: true },
      },
    },
  });

  broadcastTemplate.onCreate(userId, fullTemplate, clientId);
  return NextResponse.json(fullTemplate, { status: 201 });
});

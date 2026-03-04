import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listTemplates, listTemplateItems } from "@/lib/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { withApi, Errors, validateRequired, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcast = withBroadcast(ENTITY_TYPES.LIST_TEMPLATE);

export const GET = withApi(async (request, { userId }) => {
  const templates = await db.query.listTemplates.findMany({
    where: eq(listTemplates.userId, userId),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: {
          listItem: {
            with: {
              listItemTags: { with: { tag: true } },
            },
          },
        },
      },
    },
    orderBy: (t, { asc }) => [asc(t.order)],
  });

  return NextResponse.json(
    templates.map(t => ({
      ...t,
      items: t.templateItems.map(ti => ({
        ...ti.listItem,
        templateItemId: ti.id,
        order: ti.order,
        tags: ti.listItem?.listItemTags?.map(lit => lit.tag) || [],
      })),
    }))
  );
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["name"]);
  const clientId = getClientIdFromRequest(request);

  const result = await db.transaction(async tx => {
    const [template] = await tx.insert(listTemplates).values({
      userId,
      name: body.name,
      description: body.description || null,
      icon: body.icon || null,
      order: body.order ?? 0,
    }).returning();

    if (body.itemIds?.length) {
      await tx.insert(listTemplateItems).values(
        body.itemIds.map((itemId, idx) => ({
          templateId: template.id,
          listItemId: itemId,
          order: idx,
        }))
      );
    }

    return template;
  });

  // Fetch full template
  const fullTemplate = await db.query.listTemplates.findFirst({
    where: eq(listTemplates.id, result.id),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: { listItem: { with: { listItemTags: { with: { tag: true } } } } },
      },
    },
  });

  const transformed = {
    ...fullTemplate,
    items: fullTemplate.templateItems.map(ti => ({
      ...ti.listItem,
      templateItemId: ti.id,
      order: ti.order,
      tags: ti.listItem?.listItemTags?.map(lit => lit.tag) || [],
    })),
  };

  broadcast.onCreate(userId, transformed, clientId);
  return NextResponse.json(transformed, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["id"]);
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listTemplates.findFirst({
    where: and(eq(listTemplates.id, body.id), eq(listTemplates.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListTemplate");

  await db.transaction(async tx => {
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.order !== undefined) updates.order = body.order;

    if (Object.keys(updates).length) {
      await tx.update(listTemplates).set(updates).where(eq(listTemplates.id, body.id));
    }

    if (body.itemIds !== undefined) {
      await tx.delete(listTemplateItems).where(eq(listTemplateItems.templateId, body.id));
      if (body.itemIds.length) {
        await tx.insert(listTemplateItems).values(
          body.itemIds.map((itemId, idx) => ({
            templateId: body.id,
            listItemId: itemId,
            order: idx,
          }))
        );
      }
    }
  });

  const fullTemplate = await db.query.listTemplates.findFirst({
    where: eq(listTemplates.id, body.id),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: { listItem: { with: { listItemTags: { with: { tag: true } } } } },
      },
    },
  });

  const transformed = {
    ...fullTemplate,
    items: fullTemplate.templateItems.map(ti => ({
      ...ti.listItem,
      templateItemId: ti.id,
      order: ti.order,
      tags: ti.listItem?.listItemTags?.map(lit => lit.tag) || [],
    })),
  };

  broadcast.onUpdate(userId, transformed, clientId);
  return NextResponse.json(transformed);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const id = getRequiredParam("id");
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listTemplates.findFirst({
    where: and(eq(listTemplates.id, id), eq(listTemplates.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListTemplate");

  await db.delete(listTemplates).where(eq(listTemplates.id, id));
  broadcast.onDelete(userId, id, clientId);
  return NextResponse.json({ success: true });
});

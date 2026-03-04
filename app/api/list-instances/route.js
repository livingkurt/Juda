import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listInstances, listInstanceItems, listTemplates, listTemplateItems, listItems, tasks, taskTags } from "@/lib/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { withApi, Errors, validateRequired, getClientIdFromRequest, withBroadcast, ENTITY_TYPES } from "@/lib/apiHelpers";

const broadcastInstance = withBroadcast(ENTITY_TYPES.LIST_INSTANCE);
const broadcastTask = withBroadcast(ENTITY_TYPES.TASK);

export const GET = withApi(async (request, { userId }) => {
  const instances = await db.query.listInstances.findMany({
    where: eq(listInstances.userId, userId),
    with: {
      instanceItems: {
        orderBy: (ii, { asc }) => [asc(ii.order)],
        with: {
          listItem: {
            with: { listItemTags: { with: { tag: true } } },
          },
        },
      },
      template: true,
    },
    orderBy: (i, { desc }) => [desc(i.createdAt)],
  });

  // Flatten tags onto instance items for convenience
  const result = instances.map(inst => ({
    ...inst,
    instanceItems: inst.instanceItems.map(ii => ({
      ...ii,
      tags: ii.listItem?.listItemTags?.map(lit => lit.tag) || [],
      listItem: undefined,
    })),
  }));

  return NextResponse.json(result);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["templateId"]);
  const clientId = getClientIdFromRequest(request);

  // Fetch template with items
  const template = await db.query.listTemplates.findFirst({
    where: and(eq(listTemplates.id, body.templateId), eq(listTemplates.userId, userId)),
    with: {
      templateItems: {
        orderBy: (ti, { asc }) => [asc(ti.order)],
        with: { listItem: true },
      },
    },
  });

  if (!template) throw Errors.notFound("ListTemplate");

  const result = await db.transaction(async tx => {
    // Create task with completionType "list"
    const [task] = await tx.insert(tasks).values({
      userId,
      title: body.name || template.name,
      completionType: "list",
      status: "todo",
      date: undefined,
      time: body.time || null,
    }).returning();

    // Create instance
    const [instance] = await tx.insert(listInstances).values({
      userId,
      templateId: template.id,
      taskId: task.id,
      name: body.name || template.name,
      date: body.date ? new Date(body.date) : null,
      time: body.time || null,
      status: "active",
    }).returning();

    // Apply template tags to the task
    const templateTagIds = Array.isArray(template.tagIds) ? template.tagIds : [];
    if (templateTagIds.length) {
      await tx.insert(taskTags).values(
        templateTagIds.map(tagId => ({ taskId: task.id, tagId }))
      );
    }

    // Snapshot items
    if (template.templateItems.length) {
      await tx.insert(listInstanceItems).values(
        template.templateItems.map((ti, idx) => ({
          instanceId: instance.id,
          listItemId: ti.listItem?.id || null,
          name: ti.listItem?.name || "Unknown Item",
          order: ti.order ?? idx,
          quantity: ti.quantity ?? 1,
          checked: false,
        }))
      );
    }

    return { task, instance };
  });

  // Fetch full instance
  const fullInstance = await db.query.listInstances.findFirst({
    where: eq(listInstances.id, result.instance.id),
    with: {
      instanceItems: { orderBy: (ii, { asc }) => [asc(ii.order)] },
      template: true,
    },
  });

  // Fetch full task for broadcast
  const fullTask = await db.query.tasks.findFirst({
    where: eq(tasks.id, result.task.id),
    with: { section: true, taskTags: { with: { tag: true } } },
  });

  broadcastTask.onCreate(userId, { ...fullTask, subtasks: [], tags: fullTask.taskTags?.map(tt => tt.tag) || [] }, clientId);
  broadcastInstance.onCreate(userId, fullInstance, clientId);

  return NextResponse.json({ instance: fullInstance, task: fullTask }, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  validateRequired(body, ["id"]);
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, body.id), eq(listInstances.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListInstance");

  const updates = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.date !== undefined) updates.date = body.date ? new Date(body.date) : null;
  if (body.time !== undefined) updates.time = body.time;
  if (body.name !== undefined) updates.name = body.name;

  const [updated] = await db.update(listInstances).set(updates).where(eq(listInstances.id, body.id)).returning();

  const fullInstance = await db.query.listInstances.findFirst({
    where: eq(listInstances.id, body.id),
    with: {
      instanceItems: { orderBy: (ii, { asc }) => [asc(ii.order)] },
      template: true,
    },
  });

  broadcastInstance.onUpdate(userId, fullInstance, clientId);
  return NextResponse.json(fullInstance);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const id = getRequiredParam("id");
  const clientId = getClientIdFromRequest(request);

  const existing = await db.query.listInstances.findFirst({
    where: and(eq(listInstances.id, id), eq(listInstances.userId, userId)),
  });
  if (!existing) throw Errors.notFound("ListInstance");

  // Delete associated task too
  if (existing.taskId) {
    await db.delete(tasks).where(eq(tasks.id, existing.taskId));
    broadcastTask.onDelete(userId, existing.taskId, clientId);
  }

  await db.delete(listInstances).where(eq(listInstances.id, id));
  broadcastInstance.onDelete(userId, id, clientId);
  return NextResponse.json({ success: true });
});

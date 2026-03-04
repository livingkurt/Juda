import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections, listItems, taskListItems } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";
import { withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);
const LIST_PARENT_KINDS = new Set(["list_template", "list_instance"]);
const normalizeListItemName = value => (value || "").trim().toLowerCase().replace(/\s+/g, " ");

// POST - Create or update multiple tasks at once (for subtasks management)
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const clientId = getClientIdFromRequest(request);

  try {
    const body = await request.json();
    const { tasks: tasksToSave } = body;

    if (!Array.isArray(tasksToSave) || tasksToSave.length === 0) {
      return NextResponse.json({ error: "Tasks array is required and must not be empty" }, { status: 400 });
    }

    // Separate tasks into creates and updates
    // Check which tasks already exist in the database
    const taskIds = tasksToSave.map(t => t.id).filter(Boolean);
    const existingTasks =
      taskIds.length > 0
        ? await db.query.tasks.findMany({
            where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
          })
        : [];
    const existingTaskIds = new Set(existingTasks.map(t => t.id));

    // Tasks with IDs that exist in DB should be updated, others should be created
    const tasksToUpdate = tasksToSave.filter(t => t.id && existingTaskIds.has(t.id));
    const tasksToCreate = tasksToSave.filter(t => !t.id || !existingTaskIds.has(t.id));

    // Extract unique section IDs for validation
    const sectionIds = [...new Set(tasksToSave.map(t => t.sectionId).filter(Boolean))];
    const parentIds = [...new Set(tasksToSave.map(t => t.parentId).filter(Boolean))];

    // Verify all sections belong to user in a single query
    if (sectionIds.length > 0) {
      const userSections = await db.query.sections.findMany({
        where: and(inArray(sections.id, sectionIds), eq(sections.userId, userId)),
      });

      if (userSections.length !== sectionIds.length) {
        return NextResponse.json({ error: "One or more sections not found" }, { status: 404 });
      }
    }

    const parentTasks =
      parentIds.length > 0
        ? await db.query.tasks.findMany({
            where: and(inArray(tasks.id, parentIds), eq(tasks.userId, userId)),
          })
        : [];
    const parentTaskById = new Map(parentTasks.map(task => [task.id, task]));

    if (parentTasks.length !== parentIds.length) {
      return NextResponse.json({ error: "One or more parent tasks not found" }, { status: 404 });
    }

    const listManagedIncoming = tasksToSave.filter(task =>
      LIST_PARENT_KINDS.has(parentTaskById.get(task.parentId)?.taskKind)
    );
    const duplicateGuard = new Map();
    for (const task of listManagedIncoming) {
      const parentId = task.parentId;
      const normalizedTitle = normalizeListItemName(task.title);
      if (!parentId || !normalizedTitle) continue;
      if (!duplicateGuard.has(parentId)) {
        duplicateGuard.set(parentId, new Set());
      }
      const existing = duplicateGuard.get(parentId);
      if (existing.has(normalizedTitle)) {
        return NextResponse.json(
          { error: "List items cannot contain duplicate names in the same list" },
          { status: 400 }
        );
      }
      existing.add(normalizedTitle);
    }

    // Tasks to update are already verified above (they're in existingTasks)

    const createdTasks = [];
    const updatedTasks = [];

    // Use transaction to create/update all tasks atomically
    await db.transaction(async tx => {
      // Bulk create new tasks
      if (tasksToCreate.length > 0) {
        const valuesToInsert = tasksToCreate.map(taskData => {
          const { id: _id, ...taskFields } = taskData; // Remove temporary id if present
          return {
            userId,
            title: taskFields.title,
            sectionId: taskFields.sectionId,
            parentId: taskFields.parentId || null,
            time: taskFields.time || null,
            duration: taskFields.duration ?? 30,
            recurrence: taskFields.recurrence || null,
            order: taskFields.order ?? 0,
            priority: taskFields.priority ?? null,
          };
        });
        const created = await tx.insert(tasks).values(valuesToInsert).returning();
        createdTasks.push(...created);
      }

      // Update existing tasks in parallel
      if (tasksToUpdate.length > 0) {
        const updatePromises = tasksToUpdate.map(async taskData => {
          const { id, ...taskFields } = taskData;
          const updateData = {};
          if (taskFields.title !== undefined) updateData.title = taskFields.title;
          if (taskFields.sectionId !== undefined) updateData.sectionId = taskFields.sectionId;
          if (taskFields.parentId !== undefined) updateData.parentId = taskFields.parentId;
          if (taskFields.time !== undefined) updateData.time = taskFields.time;
          if (taskFields.duration !== undefined) updateData.duration = taskFields.duration;
          if (taskFields.recurrence !== undefined) updateData.recurrence = taskFields.recurrence;
          if (taskFields.order !== undefined) updateData.order = taskFields.order;
          if (taskFields.priority !== undefined) updateData.priority = taskFields.priority;

          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            const [task] = await tx
              .update(tasks)
              .set(updateData)
              .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
              .returning();
            return task;
          }
          return null;
        });

        const updated = await Promise.all(updatePromises);
        updatedTasks.push(...updated.filter(Boolean));
      }

      const listManagedTasks = [...createdTasks, ...updatedTasks].filter(task =>
        LIST_PARENT_KINDS.has(parentTaskById.get(task.parentId)?.taskKind)
      );

      if (listManagedTasks.length > 0) {
        const normalizedByTaskId = new Map();
        const canonicalDisplayByNormalized = new Map();

        listManagedTasks.forEach(task => {
          const normalized = normalizeListItemName(task.title);
          if (!normalized) return;
          normalizedByTaskId.set(task.id, normalized);
          if (!canonicalDisplayByNormalized.has(normalized)) {
            canonicalDisplayByNormalized.set(normalized, task.title.trim());
          }
        });

        const normalizedNames = Array.from(new Set(normalizedByTaskId.values()));

        if (normalizedNames.length > 0) {
          const existingCanonicalItems = await tx.query.listItems.findMany({
            where: and(eq(listItems.userId, userId), inArray(listItems.normalizedName, normalizedNames)),
          });
          const canonicalByNormalized = new Map(
            existingCanonicalItems.map(item => [
              item.normalizedName,
              { id: item.id, normalizedName: item.normalizedName },
            ])
          );

          const missingNormalizedNames = normalizedNames.filter(name => !canonicalByNormalized.has(name));
          if (missingNormalizedNames.length > 0) {
            const inserted = await tx
              .insert(listItems)
              .values(
                missingNormalizedNames.map(normalizedName => ({
                  userId,
                  name: canonicalDisplayByNormalized.get(normalizedName) || normalizedName,
                  normalizedName,
                }))
              )
              .returning();
            inserted.forEach(item => {
              canonicalByNormalized.set(item.normalizedName, { id: item.id, normalizedName: item.normalizedName });
            });
          }

          const managedTaskIds = listManagedTasks.map(task => task.id);
          await tx.delete(taskListItems).where(inArray(taskListItems.taskId, managedTaskIds));

          const mappingRows = listManagedTasks
            .map(task => {
              const normalized = normalizedByTaskId.get(task.id);
              if (!normalized) return null;
              const canonical = canonicalByNormalized.get(normalized);
              if (!canonical) return null;
              return {
                taskId: task.id,
                listItemId: canonical.id,
                order: task.order ?? 0,
              };
            })
            .filter(Boolean);

          if (mappingRows.length > 0) {
            await tx.insert(taskListItems).values(mappingRows);
          }
        }
      }
    });

    // Fetch full task data with relations for broadcasting
    const allTaskIds = [...createdTasks.map(t => t.id), ...updatedTasks.map(t => t.id)];
    const allTasksWithRelations =
      allTaskIds.length > 0
        ? await db.query.tasks.findMany({
            where: and(inArray(tasks.id, allTaskIds), eq(tasks.userId, userId)),
            with: {
              section: true,
              taskTags: {
                with: {
                  tag: true,
                },
              },
            },
          })
        : [];

    const allTasksWithTags = allTasksWithRelations.map(task => ({
      ...task,
      tags: task.taskTags?.map(tt => tt.tag) || [],
    }));

    // Broadcast batch create/update to other clients
    if (createdTasks.length > 0) {
      taskBroadcast.onBatchCreate(
        userId,
        allTasksWithTags.filter(t => createdTasks.some(ct => ct.id === t.id)),
        clientId
      );
    }
    if (updatedTasks.length > 0) {
      taskBroadcast.onBatchUpdate(
        userId,
        allTasksWithTags.filter(t => updatedTasks.some(ut => ut.id === t.id)),
        clientId
      );
    }

    return NextResponse.json(
      {
        success: true,
        created: createdTasks,
        updated: updatedTasks,
        createdCount: createdTasks.length,
        updatedCount: updatedTasks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error batch saving tasks:", error);
    return NextResponse.json({ error: "Failed to batch save tasks", details: error.message }, { status: 500 });
  }
}

// DELETE - Delete multiple tasks at once
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  const clientId = getClientIdFromRequest(request);

  try {
    const body = await request.json();
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "Task IDs array is required and must not be empty" }, { status: 400 });
    }

    // Verify all tasks belong to user
    const userTasks = await db.query.tasks.findMany({
      where: and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)),
    });

    if (userTasks.length !== taskIds.length) {
      return NextResponse.json({ error: "One or more tasks not found" }, { status: 404 });
    }

    // Delete all tasks in a single query
    const result = await db
      .delete(tasks)
      .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
      .returning();

    // Broadcast batch delete to other clients
    taskBroadcast.onBatchDelete(userId, taskIds, clientId);

    return NextResponse.json({ success: true, deletedCount: result.length });
  } catch (error) {
    console.error("Error batch deleting tasks:", error);
    return NextResponse.json({ error: "Failed to batch delete tasks", details: error.message }, { status: 500 });
  }
}

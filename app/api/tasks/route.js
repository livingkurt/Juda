import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections, taskTags, tags } from "@/lib/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import {
  withApi,
  Errors,
  validateRequired,
  validateEnum,
  withBroadcast,
  getClientIdFromRequest,
  ENTITY_TYPES,
} from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);

export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const apiStart = Date.now();
  const searchParams = getSearchParams();
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor"); // For cursor-based pagination
  const includeAll = searchParams.get("all") === "true" || (!pageParam && !limitParam && !cursorParam);
  const page = parseInt(pageParam || "1");
  const limit = parseInt(limitParam || "50"); // Reduced default from 500 to 50
  const offset = (page - 1) * limit;

  const baseQuery = {
    where: eq(tasks.userId, userId),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
    orderBy: [asc(tasks.sectionId), asc(tasks.order)],
  };

  // Default: load all tasks (for calendar views, etc.)
  const dbStart = Date.now();
  const allTasks = includeAll
    ? await db.query.tasks.findMany(baseQuery)
    : await db.query.tasks.findMany({
        ...baseQuery,
        limit,
        offset,
      });
  const dbTime = Date.now() - dbStart;

  const tasksWithTags = allTasks.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
  }));

  console.warn(`[GET /api/tasks] DB: ${dbTime}ms, Total: ${Date.now() - apiStart}ms, Tasks: ${allTasks.length}`);

  if (includeAll) {
    return NextResponse.json(tasksWithTags);
  }

  const [{ count: totalCount }] = await db
    .select({ count: sql`count(*)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  return NextResponse.json({
    tasks: tasksWithTags,
    pagination: {
      page,
      limit,
      totalCount: Number(totalCount),
      totalPages: Math.ceil(Number(totalCount) / limit),
      hasMore: offset + tasksWithTags.length < Number(totalCount),
    },
  });
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const {
    title,
    sectionId,
    parentId,
    time,
    duration,
    recurrence,
    order,
    completionType,
    content,
    priority,
    folderId,
    tagIds,
    sourceTaskId,
    rolledFromDate,
    isRollover,
    isOffSchedule,
    goalData,
    reflectionData,
    selectionData,
    goalYear,
    goalMonths,
  } = body;

  // Validate section exists if sectionId is provided
  // Allow null sectionId for backlog tasks
  if (sectionId !== null && sectionId !== undefined) {
    const section = await db.query.sections.findFirst({
      where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
    });

    if (!section) {
      throw Errors.notFound("Section");
    }
  }

  // Validate goal-specific data
  if (completionType === "goal") {
    if (parentId) {
      const parentTask = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, parentId), eq(tasks.userId, userId)),
      });
      if (!parentTask || parentTask.completionType !== "goal") {
        throw Errors.badRequest("Parent task must also be a goal");
      }
    }
  }

  // Validate reflection-specific data
  if (completionType === "reflection" && reflectionData) {
    if (!reflectionData.questions || !Array.isArray(reflectionData.questions)) {
      throw Errors.badRequest("Reflection data must contain a questions array");
    }
  }

  // Validate selection-specific data
  if (completionType === "selection" && selectionData) {
    if (!selectionData.options || !Array.isArray(selectionData.options)) {
      throw Errors.badRequest("Selection data must contain an options array");
    }
  }
  if (completionType === "selection" && selectionData) {
    if (!selectionData.options || !Array.isArray(selectionData.options)) {
      throw Errors.badRequest("Selection data must contain an options array");
    }
  }

  // Create task and assign tags in a transaction
  const result = await db.transaction(async tx => {
    if (priority !== undefined && priority !== null) {
      validateEnum("priority", priority, ["low", "medium", "high", "urgent"]);
    }

    const [task] = await tx
      .insert(tasks)
      .values({
        userId,
        title,
        sectionId,
        parentId: parentId || null,
        time: time || null,
        duration: duration ?? 30,
        recurrence: recurrence || null,
        order: order ?? 0,
        completionType: completionType || "checkbox",
        content: content || null,
        priority: priority ?? null,
        folderId: folderId || null,
        sourceTaskId: sourceTaskId || null,
        rolledFromDate: rolledFromDate ? new Date(rolledFromDate) : null,
        isRollover: isRollover || false,
        isOffSchedule: isOffSchedule || false,
        goalData: goalData || null,
        reflectionData: reflectionData || null,
        selectionData: selectionData || null,
        goalYear: goalYear || null,
        goalMonths: goalMonths || null,
      })
      .returning();

    // Assign tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      // Verify all tags belong to the user
      const userTags = await tx.query.tags.findMany({
        where: and(inArray(tags.id, tagIds), eq(tags.userId, userId)),
      });

      if (userTags.length !== tagIds.length) {
        throw Errors.notFound("One or more tags");
      }

      // Create task-tag relations
      const tagAssignments = tagIds.map(tagId => ({
        taskId: task.id,
        tagId,
      }));
      await tx.insert(taskTags).values(tagAssignments);
    }

    return task;
  });

  // Fetch the full task with relations for broadcast
  const taskWithRelations = await db.query.tasks.findFirst({
    where: eq(tasks.id, result.id),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const taskWithTags = {
    ...taskWithRelations,
    tags: taskWithRelations.taskTags?.map(tt => tt.tag) || [],
  };

  // Broadcast to other clients (exclude the one that made this request)
  taskBroadcast.onCreate(userId, taskWithTags, clientId);

  return NextResponse.json(taskWithTags, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const clientId = getClientIdFromRequest(request);
  const body = await getBody();
  const {
    id,
    title,
    sectionId,
    parentId,
    time,
    duration,
    recurrence,
    expanded,
    order,
    status,
    priority,
    startedAt,
    completionType,
    content,
    folderId,
    goalData,
    reflectionData,
    selectionData,
    goalYear,
    goalMonths,
  } = body;

  validateRequired(body, ["id"]);

  const existingTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
  });

  if (!existingTask) {
    throw Errors.notFound("Task");
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (sectionId !== undefined) {
    if (sectionId === null) {
      // Allow clearing sectionId (for backlog tasks)
      updateData.sectionId = null;
    } else if (sectionId !== existingTask.sectionId) {
      // Validate new section exists
      const section = await db.query.sections.findFirst({
        where: and(eq(sections.id, sectionId), eq(sections.userId, userId)),
      });
      if (!section) {
        throw Errors.badRequest("Invalid section ID");
      }
      updateData.sectionId = sectionId;
    }
  }
  if (parentId !== undefined) updateData.parentId = parentId;
  if (time !== undefined) updateData.time = time;
  if (duration !== undefined) updateData.duration = duration;
  if (recurrence !== undefined) updateData.recurrence = recurrence;
  if (expanded !== undefined) updateData.expanded = expanded;
  if (order !== undefined) updateData.order = order;
  if (status !== undefined) {
    validateEnum("status", status, ["todo", "in_progress", "complete"]);
    updateData.status = status;

    if (status === "in_progress" && !existingTask.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === "todo") {
      updateData.startedAt = null;
    }
  }

  if (startedAt !== undefined) {
    updateData.startedAt = startedAt ? new Date(startedAt) : null;
  }
  if (completionType !== undefined) {
    validateEnum("completionType", completionType, [
      "checkbox",
      "text",
      "selection",
      "note",
      "workout",
      "goal",
      "reflection",
    ]);
    updateData.completionType = completionType;
  }
  if (content !== undefined) updateData.content = content;
  if (folderId !== undefined) updateData.folderId = folderId;
  if (priority !== undefined) {
    if (priority === null) {
      updateData.priority = null;
    } else {
      validateEnum("priority", priority, ["low", "medium", "high", "urgent"]);
      updateData.priority = priority;
    }
  }

  // Goal-specific fields
  if (goalData !== undefined) updateData.goalData = goalData;
  if (goalYear !== undefined) updateData.goalYear = goalYear;
  if (goalMonths !== undefined) updateData.goalMonths = goalMonths;

  // Reflection-specific fields
  if (reflectionData !== undefined) {
    // Validate reflection data structure
    if (completionType === "reflection" && reflectionData) {
      if (!reflectionData.questions || !Array.isArray(reflectionData.questions)) {
        throw Errors.badRequest("Reflection data must contain a questions array");
      }
    }
    updateData.reflectionData = reflectionData;
  }

  // Selection-specific fields
  if (selectionData !== undefined) {
    // Validate selection data structure
    if (completionType === "selection" && selectionData) {
      if (!selectionData.options || !Array.isArray(selectionData.options)) {
        throw Errors.badRequest("Selection data must contain an options array");
      }
    }
    updateData.selectionData = selectionData;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(existingTask);
  }

  updateData.updatedAt = new Date();

  await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  const taskWithRelations = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const taskWithTags = {
    ...taskWithRelations,
    tags: taskWithRelations.taskTags?.map(tt => tt.tag) || [],
  };

  // Broadcast to other clients (include previous state for cache relevance)
  taskBroadcast.onUpdate(userId, { task: taskWithTags, previousTask: existingTask }, clientId);

  return NextResponse.json(taskWithTags);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const clientId = getClientIdFromRequest(request);
  const id = getRequiredParam("id");

  const existingTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
    with: {
      section: true,
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  // Broadcast to other clients
  taskBroadcast.onDelete(userId, { id, previousTask: existingTask }, clientId);

  return NextResponse.json({ success: true });
});

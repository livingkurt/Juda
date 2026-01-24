import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, sections, taskTags, tags, reflectionQuestions } from "@/lib/schema";
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
  const searchParams = getSearchParams();
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const includeAll = searchParams.get("all") === "true" || (!pageParam && !limitParam);
  const page = parseInt(pageParam || "1");
  const limit = parseInt(limitParam || "500");
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

  const allTasks = includeAll
    ? await db.query.tasks.findMany(baseQuery)
    : await db.query.tasks.findMany({
        ...baseQuery,
        limit,
        offset,
      });

  const tasksWithTags = allTasks.map(task => ({
    ...task,
    tags: task.taskTags?.map(tt => tt.tag) || [],
  }));

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
    defaultQuestions,
    includeGoalReflection,
    goalReflectionQuestion,
    isPinned,
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
        isPinned: completionType === "goals" ? true : isPinned || false,
      })
      .returning();

    if (completionType === "reflection" && Array.isArray(defaultQuestions) && defaultQuestions.length > 0) {
      await tx.insert(reflectionQuestions).values({
        taskId: task.id,
        questions: defaultQuestions,
        includeGoalReflection: includeGoalReflection || false,
        goalReflectionQuestion: goalReflectionQuestion || null,
        startDate: new Date(),
        endDate: null,
      });
    }

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
    isPinned,
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
    validateEnum("completionType", completionType, ["checkbox", "text", "note", "workout", "goals", "reflection"]);
    updateData.completionType = completionType;
    if (completionType === "goals") {
      updateData.isPinned = true;
    }
  }
  if (isPinned !== undefined) updateData.isPinned = isPinned;
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

  // Broadcast to other clients
  taskBroadcast.onUpdate(userId, taskWithTags, clientId);

  return NextResponse.json(taskWithTags);
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const clientId = getClientIdFromRequest(request);
  const id = getRequiredParam("id");

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  // Broadcast to other clients
  taskBroadcast.onDelete(userId, id, clientId);

  return NextResponse.json({ success: true });
});

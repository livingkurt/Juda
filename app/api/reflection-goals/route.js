import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectionGoals, tasks } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

const generateCuid = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
};

export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const reflectionTaskId = searchParams.get("reflectionTaskId");

  if (!reflectionTaskId) {
    throw Errors.validation("reflectionTaskId", "is required");
  }

  const reflectionTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, reflectionTaskId), eq(tasks.userId, userId)),
  });

  if (!reflectionTask) {
    throw Errors.notFound("Task");
  }

  const links = await db.query.reflectionGoals.findMany({
    where: eq(reflectionGoals.reflectionTaskId, reflectionTaskId),
  });

  return NextResponse.json({
    reflectionTaskId,
    goalTaskIds: links.map(link => link.goalTaskId),
  });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { reflectionTaskId, goalTaskIds } = body;

  validateRequired(body, ["reflectionTaskId"]);

  if (goalTaskIds !== undefined && !Array.isArray(goalTaskIds)) {
    throw Errors.validation("goalTaskIds", "must be an array");
  }

  const reflectionTask = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, reflectionTaskId), eq(tasks.userId, userId)),
  });

  if (!reflectionTask) {
    throw Errors.notFound("Task");
  }

  const normalizedGoalIds = Array.isArray(goalTaskIds) ? goalTaskIds : [];

  if (normalizedGoalIds.length > 0) {
    const goalTasks = await db.query.tasks.findMany({
      where: and(eq(tasks.userId, userId), inArray(tasks.id, normalizedGoalIds)),
    });

    if (goalTasks.length !== normalizedGoalIds.length) {
      throw Errors.notFound("One or more goals");
    }
  }

  await db.transaction(async tx => {
    await tx.delete(reflectionGoals).where(eq(reflectionGoals.reflectionTaskId, reflectionTaskId));

    if (normalizedGoalIds.length > 0) {
      await tx.insert(reflectionGoals).values(
        normalizedGoalIds.map(goalTaskId => ({
          id: generateCuid(),
          reflectionTaskId,
          goalTaskId,
        }))
      );
    }
  });

  return NextResponse.json({
    reflectionTaskId,
    goalTaskIds: normalizedGoalIds,
  });
});

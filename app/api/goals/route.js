import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import { withApi, Errors, withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);

// GET /api/goals - Get all goals with optional year filter
export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const year = searchParams.get("year");
  const includeSubgoals = searchParams.get("includeSubgoals") !== "false";

  const conditions = [eq(tasks.userId, userId), eq(tasks.completionType, "goal")];

  if (year) {
    conditions.push(eq(tasks.goalYear, parseInt(year, 10)));
  }

  const allGoals = await db.query.tasks.findMany({
    where: and(...conditions),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: includeSubgoals
        ? {
            where: eq(tasks.completionType, "goal"),
            with: {
              taskTags: {
                with: {
                  tag: true,
                },
              },
            },
          }
        : undefined,
    },
    orderBy: [sql`${tasks.goalYear} DESC`, sql`${tasks.order} ASC`],
  });

  const goalsWithTags = allGoals.map(goal => ({
    ...goal,
    tags: goal.taskTags?.map(tt => tt.tag) || [],
    subtasks: goal.subtasks?.map(subgoal => ({
      ...subgoal,
      tags: subgoal.taskTags?.map(tt => tt.tag) || [],
    })),
  }));

  // Organize by yearly vs monthly
  const yearlyGoals = goalsWithTags.filter(g => !g.parentId && (!g.goalMonths || g.goalMonths.length === 0));
  const monthlyGoals = goalsWithTags.filter(g => g.parentId || (g.goalMonths && g.goalMonths.length > 0));

  return NextResponse.json({
    yearlyGoals,
    monthlyGoals,
    allGoals: goalsWithTags,
  });
});

// GET /api/goals/years - Get all years that have goals
export async function GET_YEARS(request) {
  return withApi(async (request, { userId }) => {
    const yearsResult = await db
      .selectDistinct({ year: tasks.goalYear })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.completionType, "goal"), sql`${tasks.goalYear} IS NOT NULL`))
      .orderBy(sql`${tasks.goalYear} DESC`);

    const years = yearsResult.map(r => r.year).filter(y => y !== null);

    return NextResponse.json({ years });
  })(request);
}

// PUT /api/goals/[id]/progress - Update goal progress from reflection
export async function PUT_PROGRESS(request, goalId) {
  return withApi(async (request, { userId, getBody }) => {
    const clientId = getClientIdFromRequest(request);
    const body = await getBody();
    const { status, progressNote } = body;

    const goal = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, goalId), eq(tasks.userId, userId), eq(tasks.completionType, "goal")),
    });

    if (!goal) {
      throw Errors.notFound("Goal");
    }

    const updateData = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "in_progress" && !goal.startedAt) {
        updateData.startedAt = new Date();
      } else if (status === "todo") {
        updateData.startedAt = null;
      }
    }

    // Store progress note in goalData
    if (progressNote !== undefined) {
      updateData.goalData = {
        ...(goal.goalData || {}),
        lastProgressNote: progressNote,
        lastProgressUpdate: new Date().toISOString(),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(goal);
    }

    updateData.updatedAt = new Date();

    await db.update(tasks).set(updateData).where(eq(tasks.id, goalId)).returning();

    const updatedGoal = await db.query.tasks.findFirst({
      where: eq(tasks.id, goalId),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    const goalWithTags = {
      ...updatedGoal,
      tags: updatedGoal.taskTags?.map(tt => tt.tag) || [],
    };

    // Broadcast to other clients
    taskBroadcast.onUpdate(userId, goalWithTags, clientId);

    return NextResponse.json(goalWithTags);
  })(request);
}

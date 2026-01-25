import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskTags } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors, withBroadcast, getClientIdFromRequest, ENTITY_TYPES } from "@/lib/apiHelpers";

const taskBroadcast = withBroadcast(ENTITY_TYPES.TASK);

// POST /api/goals/[id]/rollover - Duplicate a goal to a new year
export const POST = withApi(async (request, { userId, getBody, params }) => {
  const clientId = getClientIdFromRequest(request);
  const { id } = await params;
  const body = await getBody();
  const { targetYear, includeSubgoals = true } = body;

  if (!targetYear) {
    throw Errors.badRequest("Target year is required");
  }

  // Get the original goal
  const originalGoal = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.completionType, "goal")),
    with: {
      taskTags: true,
      subtasks: includeSubgoals
        ? {
            where: eq(tasks.completionType, "goal"),
            with: {
              taskTags: true,
            },
          }
        : undefined,
    },
  });

  if (!originalGoal) {
    throw Errors.notFound("Goal");
  }

  // Check if goal already exists in target year (prevent duplicates)
  const existingGoal = await db.query.tasks.findFirst({
    where: and(
      eq(tasks.userId, userId),
      eq(tasks.completionType, "goal"),
      eq(tasks.goalYear, targetYear),
      eq(tasks.title, originalGoal.title)
    ),
  });

  if (existingGoal) {
    throw Errors.badRequest(`Goal "${originalGoal.title}" already exists in ${targetYear}`);
  }

  // Create the rolled over goal in a transaction
  const result = await db.transaction(async tx => {
    // Create the new goal
    const [newGoal] = await tx
      .insert(tasks)
      .values({
        userId,
        title: originalGoal.title,
        completionType: "goal",
        goalYear: targetYear,
        goalMonths: null, // Yearly goals don't have months
        goalData: {
          ...originalGoal.goalData,
          rolledOverFrom: originalGoal.id,
          rolledOverFromYear: originalGoal.goalYear,
        },
        status: "todo",
        order: originalGoal.order,
      })
      .returning();

    // Copy tags to the new goal
    if (originalGoal.taskTags && originalGoal.taskTags.length > 0) {
      await tx.insert(taskTags).values(
        originalGoal.taskTags.map(tt => ({
          taskId: newGoal.id,
          tagId: tt.tagId,
        }))
      );
    }

    // Optionally roll over sub-goals (monthly goals) as templates
    const rolledOverSubgoals = [];
    if (includeSubgoals && originalGoal.subtasks && originalGoal.subtasks.length > 0) {
      for (const subgoal of originalGoal.subtasks) {
        const [newSubgoal] = await tx
          .insert(tasks)
          .values({
            userId,
            title: subgoal.title,
            completionType: "goal",
            goalYear: targetYear,
            goalMonths: subgoal.goalMonths, // Keep same months
            goalData: {
              ...subgoal.goalData,
              rolledOverFrom: subgoal.id,
              rolledOverFromYear: subgoal.goalYear,
            },
            parentId: newGoal.id,
            status: "todo",
            order: subgoal.order,
          })
          .returning();

        // Copy tags to the new subgoal
        if (subgoal.taskTags && subgoal.taskTags.length > 0) {
          await tx.insert(taskTags).values(
            subgoal.taskTags.map(tt => ({
              taskId: newSubgoal.id,
              tagId: tt.tagId,
            }))
          );
        }

        rolledOverSubgoals.push(newSubgoal);
      }
    }

    return { newGoal, rolledOverSubgoals };
  });

  // Fetch the complete goal with relations
  const goalWithRelations = await db.query.tasks.findFirst({
    where: eq(tasks.id, result.newGoal.id),
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
      subtasks: {
        with: {
          taskTags: {
            with: {
              tag: true,
            },
          },
        },
      },
    },
  });

  const goalWithTags = {
    ...goalWithRelations,
    tags: goalWithRelations.taskTags?.map(tt => tt.tag) || [],
    subtasks: goalWithRelations.subtasks?.map(s => ({
      ...s,
      tags: s.taskTags?.map(tt => tt.tag) || [],
    })),
  };

  // Broadcast to other clients
  taskBroadcast.onCreate(userId, goalWithTags, clientId);

  return NextResponse.json({
    success: true,
    goal: goalWithTags,
    subgoalsRolledOver: result.rolledOverSubgoals.length,
  });
});

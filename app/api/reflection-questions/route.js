import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reflectionQuestions, tasks } from "@/lib/schema";
import { eq, and, or, lte, gte, isNull, desc } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const GET = withApi(async (request, { userId, getSearchParams }) => {
  const searchParams = getSearchParams();
  const taskId = searchParams.get("taskId");
  const dateStr = searchParams.get("date");

  if (!taskId) {
    throw Errors.validation("taskId", "is required");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  let whereConditions = [eq(reflectionQuestions.taskId, taskId)];

  if (dateStr) {
    const date = new Date(dateStr);
    whereConditions.push(lte(reflectionQuestions.startDate, date));
    whereConditions.push(or(isNull(reflectionQuestions.endDate), gte(reflectionQuestions.endDate, date)));
  }

  const results = await db
    .select()
    .from(reflectionQuestions)
    .where(and(...whereConditions))
    .orderBy(desc(reflectionQuestions.startDate));
  return NextResponse.json(results);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, questions, includeGoalReflection, goalReflectionQuestion, startDate } = body;

  validateRequired(body, ["taskId", "questions", "startDate"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const [created] = await db
    .insert(reflectionQuestions)
    .values({
      taskId,
      questions,
      includeGoalReflection: includeGoalReflection || false,
      goalReflectionQuestion: goalReflectionQuestion || null,
      startDate: new Date(startDate),
      endDate: null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
});

export const PUT = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { id, questions, includeGoalReflection, goalReflectionQuestion, endDate } = body;

  validateRequired(body, ["id"]);

  const existing = await db.query.reflectionQuestions.findFirst({
    where: eq(reflectionQuestions.id, id),
  });

  if (!existing) {
    throw Errors.notFound("ReflectionQuestion");
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, existing.taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const updateData = {
    updatedAt: new Date(),
  };

  if (questions !== undefined) updateData.questions = questions;
  if (includeGoalReflection !== undefined) updateData.includeGoalReflection = includeGoalReflection;
  if (goalReflectionQuestion !== undefined) updateData.goalReflectionQuestion = goalReflectionQuestion;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

  const [updated] = await db
    .update(reflectionQuestions)
    .set(updateData)
    .where(eq(reflectionQuestions.id, id))
    .returning();

  return NextResponse.json(updated);
});

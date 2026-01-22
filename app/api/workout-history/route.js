import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutSetCompletions, workoutPrograms, exercises, tasks, taskCompletions } from "@/lib/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { withApi, Errors } from "@/lib/apiHelpers";

const parseDateParam = (value, { endOfDay = false } = {}) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Errors.badRequest(`Invalid date: ${value}`);
  }
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  if (!endOfDay) return utcDate;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
};

export const GET = withApi(async (request, { userId, getRequiredParam, getSearchParams }) => {
  const taskId = getRequiredParam("taskId");
  const searchParams = getSearchParams();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  const startDate = parseDateParam(startDateParam);
  const endDate = parseDateParam(endDateParam, { endOfDay: true });

  // Fetch TaskCompletion records (like History tab does)
  const taskCompletionFilters = [eq(taskCompletions.taskId, taskId)];
  if (startDate) {
    taskCompletionFilters.push(gte(taskCompletions.date, startDate));
  }
  if (endDate) {
    taskCompletionFilters.push(lte(taskCompletions.date, endDate));
  }

  const taskCompletionRows = await db
    .select({
      id: taskCompletions.id,
      taskId: taskCompletions.taskId,
      date: taskCompletions.date,
      outcome: taskCompletions.outcome,
      note: taskCompletions.note,
    })
    .from(taskCompletions)
    .where(and(...taskCompletionFilters))
    .orderBy(asc(taskCompletions.date));

  // Fetch workout set completions for additional details
  const setCompletionFilters = [eq(workoutSetCompletions.taskId, taskId)];
  if (startDate) {
    setCompletionFilters.push(gte(workoutSetCompletions.date, startDate));
  }
  if (endDate) {
    setCompletionFilters.push(lte(workoutSetCompletions.date, endDate));
  }

  const setCompletionRows = await db
    .select({
      date: workoutSetCompletions.date,
      exerciseId: workoutSetCompletions.exerciseId,
      setNumber: workoutSetCompletions.setNumber,
      outcome: workoutSetCompletions.outcome,
      actualValue: workoutSetCompletions.actualValue,
      unit: workoutSetCompletions.unit,
      exerciseName: exercises.name,
    })
    .from(workoutSetCompletions)
    .leftJoin(exercises, eq(workoutSetCompletions.exerciseId, exercises.id))
    .where(and(...setCompletionFilters))
    .orderBy(
      asc(workoutSetCompletions.date),
      asc(workoutSetCompletions.exerciseId),
      asc(workoutSetCompletions.setNumber)
    );

  // Group workout set completions by date
  const setCompletionsByDate = new Map();
  setCompletionRows.forEach(row => {
    const dateKey = row.date.toISOString().split("T")[0];
    if (!setCompletionsByDate.has(dateKey)) {
      setCompletionsByDate.set(dateKey, {
        totalSets: 0,
        completedSets: 0,
        exercises: new Map(),
      });
    }

    const dateEntry = setCompletionsByDate.get(dateKey);
    if (!dateEntry.exercises.has(row.exerciseId)) {
      dateEntry.exercises.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName || "Unknown exercise",
        totalSets: 0,
        completedSets: 0,
        sets: [],
      });
    }

    const exerciseEntry = dateEntry.exercises.get(row.exerciseId);
    exerciseEntry.sets.push({
      setNumber: row.setNumber,
      outcome: row.outcome,
      actualValue: row.actualValue,
      unit: row.unit,
    });
    exerciseEntry.totalSets += 1;
    if (row.outcome === "completed") {
      exerciseEntry.completedSets += 1;
    }

    dateEntry.totalSets += 1;
    if (row.outcome === "completed") {
      dateEntry.completedSets += 1;
    }
  });

  // Build completions array from TaskCompletion records (primary source)
  const completions = taskCompletionRows.map(row => {
    const dateKey = row.date.toISOString().split("T")[0];
    const setData = setCompletionsByDate.get(dateKey);

    return {
      date: dateKey,
      outcome: row.outcome,
      note: row.note,
      totalSets: setData?.totalSets || 0,
      completedSets: setData?.completedSets || 0,
      exercises: setData ? Array.from(setData.exercises.values()) : [],
    };
  });

  const program = await db.query.workoutPrograms.findFirst({
    where: eq(workoutPrograms.taskId, taskId),
    with: {
      sections: {
        orderBy: (sections, { asc }) => [asc(sections.order)],
        with: {
          days: {
            orderBy: (days, { asc }) => [asc(days.order)],
            with: {
              exercises: {
                orderBy: (exerciseRows, { asc }) => [asc(exerciseRows.order)],
                with: {
                  weeklyProgressions: {
                    orderBy: (progressions, { asc }) => [asc(progressions.week)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!program) {
    return NextResponse.json({ completions, program: null });
  }

  const transformedProgram = {
    id: program.id,
    taskId: program.taskId,
    name: program.name,
    numberOfWeeks: program.numberOfWeeks,
    sections: program.sections.map(section => ({
      id: section.id,
      name: section.name,
      type: section.type,
      order: section.order,
      days: section.days.map(day => ({
        id: day.id,
        name: day.name,
        daysOfWeek: day.daysOfWeek,
        order: day.order,
        exercises: day.exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          sets: exercise.sets,
          targetValue: exercise.targetValue,
          unit: exercise.unit,
          goal: exercise.goal,
          notes: exercise.notes,
          bothSides: exercise.bothSides || false,
          order: exercise.order,
          weeklyProgression: exercise.weeklyProgressions.map(wp => ({
            week: wp.week,
            targetValue: wp.targetValue,
            isDeload: wp.isDeload,
            isTest: wp.isTest,
          })),
        })),
      })),
    })),
  };

  return NextResponse.json({ completions, program: transformedProgram });
});

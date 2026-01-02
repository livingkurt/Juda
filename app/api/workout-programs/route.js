import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutPrograms, workoutSections, workoutDays, exercises, weeklyProgressions, tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

export const GET = withApi(async (request, { userId, getRequiredParam }) => {
  const taskId = getRequiredParam("taskId");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

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
                orderBy: (exercises, { asc }) => [asc(exercises.order)],
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
    return NextResponse.json(null);
  }

  const transformed = {
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

  return NextResponse.json(transformed);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, name, numberOfWeeks, sections: sectionsData } = body;

  validateRequired(body, ["taskId"]);

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  // Use transaction for atomic operation
  const result = await db.transaction(async tx => {
    // Check if program exists
    const existingProgram = await tx.query.workoutPrograms.findFirst({
      where: eq(workoutPrograms.taskId, taskId),
    });

    let programId;

    if (existingProgram) {
      // Update existing program
      await tx
        .update(workoutPrograms)
        .set({ name, numberOfWeeks, updatedAt: new Date() })
        .where(eq(workoutPrograms.id, existingProgram.id));
      programId = existingProgram.id;

      // Delete existing sections (cascade will delete days, exercises, progressions)
      await tx.delete(workoutSections).where(eq(workoutSections.programId, programId));
    } else {
      // Create new program
      const [newProgram] = await tx.insert(workoutPrograms).values({ taskId, name, numberOfWeeks }).returning();
      programId = newProgram.id;
    }

    // Helper function to create weekly progressions for an exercise (no nesting)
    const createWeeklyProgressions = async (tx, exerciseId, weeklyProgression) => {
      if (!weeklyProgression || weeklyProgression.length === 0) return;

      const progressionValues = weeklyProgression.map(wp => ({
        exerciseId,
        week: wp.week,
        targetValue: wp.targetValue,
        isDeload: wp.isDeload || false,
        isTest: wp.isTest || false,
      }));

      await tx.insert(weeklyProgressions).values(progressionValues);
    };

    // Helper function to create a single exercise
    const createExercise = async (tx, dayId, exerciseData, order) => {
      const [exercise] = await tx
        .insert(exercises)
        .values({
          id: exerciseData.id, // Preserve ID
          dayId,
          name: exerciseData.name,
          type: exerciseData.type || "reps",
          sets: exerciseData.sets || 3,
          targetValue: exerciseData.targetValue,
          unit: exerciseData.unit || "reps",
          goal: exerciseData.goal || null,
          notes: exerciseData.notes || null,
          order,
        })
        .returning();

      await createWeeklyProgressions(tx, exercise.id, exerciseData.weeklyProgression);
    };

    // Create sections with nested data
    if (!sectionsData || sectionsData.length === 0) {
      return { programId };
    }

    for (let sIdx = 0; sIdx < sectionsData.length; sIdx++) {
      const sectionData = sectionsData[sIdx];

      const [section] = await tx
        .insert(workoutSections)
        .values({
          id: sectionData.id, // Preserve ID for completion compatibility
          programId,
          name: sectionData.name,
          type: sectionData.type || "workout",
          order: sIdx,
        })
        .returning();

      // Create days for this section
      if (!sectionData.days || sectionData.days.length === 0) {
        continue;
      }

      for (let dIdx = 0; dIdx < sectionData.days.length; dIdx++) {
        const dayData = sectionData.days[dIdx];

        const [day] = await tx
          .insert(workoutDays)
          .values({
            id: dayData.id, // Preserve ID
            sectionId: section.id,
            name: dayData.name,
            daysOfWeek: dayData.daysOfWeek || [1],
            order: dIdx,
          })
          .returning();

        // Create exercises for this day
        if (!dayData.exercises || dayData.exercises.length === 0) {
          continue;
        }

        for (let eIdx = 0; eIdx < dayData.exercises.length; eIdx++) {
          await createExercise(tx, day.id, dayData.exercises[eIdx], eIdx);
        }
      }
    }

    return { programId };
  });

  return NextResponse.json({ success: true, programId: result.programId }, { status: 200 });
});

export const DELETE = withApi(async (request, { userId, getRequiredParam }) => {
  const taskId = getRequiredParam("taskId");

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  });

  if (!task) {
    throw Errors.notFound("Task");
  }

  await db.delete(workoutPrograms).where(eq(workoutPrograms.taskId, taskId));

  return NextResponse.json({ success: true });
});

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  workoutPrograms,
  workoutCycles,
  workoutSections,
  workoutDays,
  exercises,
  weeklyProgressions,
  tasks,
} from "@/lib/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { withApi, Errors, validateRequired } from "@/lib/apiHelpers";

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
};

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
      cycles: {
        orderBy: (cycles, { asc }) => [asc(cycles.order)],
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
      },
    },
  });

  if (!program) {
    return NextResponse.json(null);
  }

  // Transform to match expected response shape
  const transformed = {
    id: program.id,
    taskId: program.taskId,
    name: program.name,
    progress: program.progress || 0.0,
    cycles: (program.cycles || []).map(cycle => ({
      id: cycle.id,
      name: cycle.name,
      numberOfWeeks: cycle.numberOfWeeks,
      order: cycle.order,
      sections: cycle.sections.map(section => ({
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
            // eslint-disable-next-line max-nested-callbacks
            weeklyProgression: exercise.weeklyProgressions.map(wp => ({
              week: wp.week,
              targetValue: wp.targetValue,
              isDeload: wp.isDeload,
              isTest: wp.isTest,
            })),
          })),
        })),
      })),
    })),
  };

  return NextResponse.json(transformed);
});

export const POST = withApi(async (request, { userId, getBody }) => {
  const body = await getBody();
  const { taskId, name, cycles: cyclesData } = body;

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
        .set({ name, updatedAt: new Date() })
        .where(eq(workoutPrograms.id, existingProgram.id));
      programId = existingProgram.id;
    } else {
      // Create new program
      const [newProgram] = await tx.insert(workoutPrograms).values({ taskId, name }).returning();
      programId = newProgram.id;
    }

    const weeklyProgressionRows = [];
    const touchedExerciseIds = new Set();
    const normalizedCycles = Array.isArray(cyclesData) ? cyclesData : [];
    const now = new Date();

    if (normalizedCycles.length === 0) {
      await tx.delete(workoutCycles).where(eq(workoutCycles.programId, programId));
      return { programId };
    }

    const existingCycleRows = await tx
      .select({ id: workoutCycles.id })
      .from(workoutCycles)
      .where(eq(workoutCycles.programId, programId));
    const existingCycleIds = existingCycleRows.map(row => row.id);

    const existingSectionRows = existingCycleIds.length
      ? await tx
          .select({ id: workoutSections.id })
          .from(workoutSections)
          .where(inArray(workoutSections.cycleId, existingCycleIds))
      : [];
    const existingSectionIds = existingSectionRows.map(row => row.id);

    const existingDayRows = existingSectionIds.length
      ? await tx
          .select({ id: workoutDays.id })
          .from(workoutDays)
          .where(inArray(workoutDays.sectionId, existingSectionIds))
      : [];
    const existingDayIds = existingDayRows.map(row => row.id);

    const existingExerciseRows = existingDayIds.length
      ? await tx.select({ id: exercises.id }).from(exercises).where(inArray(exercises.dayId, existingDayIds))
      : [];
    const existingExerciseIds = existingExerciseRows.map(row => row.id);

    const incomingCycleIds = new Set();
    const incomingSectionIds = new Set();
    const incomingDayIds = new Set();
    const incomingExerciseIds = new Set();
    const cycleRows = [];
    const sectionRows = [];
    const dayRows = [];
    const exerciseRows = [];

    for (let cIdx = 0; cIdx < normalizedCycles.length; cIdx++) {
      const cycleData = normalizedCycles[cIdx];
      const cycleId = cycleData.id || generateId();
      incomingCycleIds.add(cycleId);

      cycleRows.push({
        id: cycleId,
        programId,
        name: cycleData.name || `Cycle ${cIdx + 1}`,
        numberOfWeeks: cycleData.numberOfWeeks === 0 ? 0 : cycleData.numberOfWeeks || 1,
        order: cIdx,
        updatedAt: now,
      });

      const normalizedSections = Array.isArray(cycleData.sections) ? cycleData.sections : [];
      for (let sIdx = 0; sIdx < normalizedSections.length; sIdx++) {
        const sectionData = normalizedSections[sIdx];
        const sectionId = sectionData.id || generateId();
        incomingSectionIds.add(sectionId);

        sectionRows.push({
          id: sectionId,
          cycleId,
          name: sectionData.name,
          type: sectionData.type || "workout",
          order: sIdx,
        });

        const normalizedDays = Array.isArray(sectionData.days) ? sectionData.days : [];
        for (let dIdx = 0; dIdx < normalizedDays.length; dIdx++) {
          const dayData = normalizedDays[dIdx];
          const dayId = dayData.id || generateId();
          incomingDayIds.add(dayId);

          dayRows.push({
            id: dayId,
            sectionId,
            name: dayData.name,
            daysOfWeek: dayData.daysOfWeek || [1],
            order: dIdx,
          });

          const normalizedExercises = Array.isArray(dayData.exercises) ? dayData.exercises : [];
          for (let eIdx = 0; eIdx < normalizedExercises.length; eIdx++) {
            const exerciseData = normalizedExercises[eIdx];
            const exerciseId = exerciseData.id || generateId();
            incomingExerciseIds.add(exerciseId);

            exerciseRows.push({
              id: exerciseId,
              dayId,
              name: exerciseData.name,
              type: exerciseData.type || "reps",
              sets: exerciseData.sets || 3,
              targetValue: exerciseData.targetValue,
              unit: exerciseData.unit || "reps",
              goal: exerciseData.goal || null,
              notes: exerciseData.notes || null,
              bothSides: exerciseData.bothSides || false,
              order: eIdx,
            });

            touchedExerciseIds.add(exerciseId);
            // eslint-disable-next-line max-depth
            if (exerciseData.weeklyProgression && exerciseData.weeklyProgression.length > 0) {
              weeklyProgressionRows.push(
                ...exerciseData.weeklyProgression.map(wp => ({
                  exerciseId,
                  week: wp.week,
                  targetValue: wp.targetValue,
                  isDeload: wp.isDeload || false,
                  isTest: wp.isTest || false,
                }))
              );
            }
          }
        }
      }
    }

    if (cycleRows.length > 0) {
      await tx
        .insert(workoutCycles)
        .values(cycleRows)
        .onConflictDoUpdate({
          target: workoutCycles.id,
          set: {
            programId: sql`excluded."programId"`,
            name: sql`excluded."name"`,
            numberOfWeeks: sql`excluded."numberOfWeeks"`,
            order: sql`excluded."order"`,
            updatedAt: now,
          },
        });
    }

    if (sectionRows.length > 0) {
      await tx
        .insert(workoutSections)
        .values(sectionRows)
        .onConflictDoUpdate({
          target: workoutSections.id,
          set: {
            cycleId: sql`excluded."cycleId"`,
            name: sql`excluded."name"`,
            type: sql`excluded."type"`,
            order: sql`excluded."order"`,
          },
        });
    }

    if (dayRows.length > 0) {
      await tx
        .insert(workoutDays)
        .values(dayRows)
        .onConflictDoUpdate({
          target: workoutDays.id,
          set: {
            sectionId: sql`excluded."sectionId"`,
            name: sql`excluded."name"`,
            daysOfWeek: sql`excluded."daysOfWeek"`,
            order: sql`excluded."order"`,
          },
        });
    }

    if (exerciseRows.length > 0) {
      await tx
        .insert(exercises)
        .values(exerciseRows)
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            dayId: sql`excluded."dayId"`,
            name: sql`excluded."name"`,
            type: sql`excluded."type"`,
            sets: sql`excluded."sets"`,
            targetValue: sql`excluded."targetValue"`,
            unit: sql`excluded."unit"`,
            goal: sql`excluded."goal"`,
            notes: sql`excluded."notes"`,
            bothSides: sql`excluded."bothSides"`,
            order: sql`excluded."order"`,
          },
        });
    }

    if (touchedExerciseIds.size > 0) {
      await tx.delete(weeklyProgressions).where(inArray(weeklyProgressions.exerciseId, Array.from(touchedExerciseIds)));
    }
    if (weeklyProgressionRows.length > 0) {
      await tx.insert(weeklyProgressions).values(weeklyProgressionRows);
    }

    // Delete removed cycles (cascade will handle sections/days/exercises)
    const cycleIdsToDelete = existingCycleIds.filter(id => !incomingCycleIds.has(id));
    if (cycleIdsToDelete.length > 0) {
      await tx.delete(workoutCycles).where(inArray(workoutCycles.id, cycleIdsToDelete));
    }

    // Delete removed sections (only those still in existing cycles)
    const sectionIdsToDelete = existingSectionIds.filter(id => !incomingSectionIds.has(id));
    if (sectionIdsToDelete.length > 0) {
      await tx.delete(workoutSections).where(inArray(workoutSections.id, sectionIdsToDelete));
    }

    // Delete removed days
    const dayIdsToDelete = existingDayIds.filter(id => !incomingDayIds.has(id));
    if (dayIdsToDelete.length > 0) {
      await tx.delete(workoutDays).where(inArray(workoutDays.id, dayIdsToDelete));
    }

    // Delete removed exercises
    const exerciseIdsToDelete = existingExerciseIds.filter(id => !incomingExerciseIds.has(id));
    if (exerciseIdsToDelete.length > 0) {
      await tx.delete(exercises).where(inArray(exercises.id, exerciseIdsToDelete));
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

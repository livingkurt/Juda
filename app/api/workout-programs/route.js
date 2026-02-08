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
import { eq, and, inArray } from "drizzle-orm";
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

    const normalizedCycles = Array.isArray(cyclesData) ? cyclesData : [];

    // Get existing cycles with all nested data
    const existingCycles = await tx.query.workoutCycles.findMany({
      where: eq(workoutCycles.programId, programId),
      with: {
        sections: {
          with: {
            days: {
              with: {
                exercises: true,
              },
            },
          },
        },
      },
    });

    const existingCycleIds = new Set(existingCycles.map(cycle => cycle.id));
    const existingSectionIds = new Set(
      existingCycles.flatMap(cycle => cycle.sections || []).map(section => section.id)
    );
    const existingDayIds = new Set(
      existingCycles
        .flatMap(cycle => cycle.sections || [])
        .flatMap(section => section.days || [])
        .map(day => day.id)
    );
    const existingExerciseIds = new Set(
      existingCycles
        .flatMap(cycle => cycle.sections || [])
        .flatMap(section => section.days || [])
        .flatMap(day => day.exercises || [])
        .map(exercise => exercise.id)
    );

    const incomingCycleIds = new Set();
    const incomingSectionIds = new Set();
    const incomingDayIds = new Set();
    const incomingExerciseIds = new Set();

    // Process cycles
    for (let cIdx = 0; cIdx < normalizedCycles.length; cIdx++) {
      const cycleData = normalizedCycles[cIdx];
      const cycleId = cycleData.id;

      if (cycleId) {
        incomingCycleIds.add(cycleId);
      }

      let finalCycleId = cycleId;

      if (cycleId && existingCycleIds.has(cycleId)) {
        await tx
          .update(workoutCycles)
          .set({
            name: cycleData.name,
            numberOfWeeks: cycleData.numberOfWeeks || 1,
            order: cIdx,
            updatedAt: new Date(),
          })
          .where(eq(workoutCycles.id, cycleId));
      } else {
        const [cycle] = await tx
          .insert(workoutCycles)
          .values({
            id: cycleId,
            programId,
            name: cycleData.name || `Cycle ${cIdx + 1}`,
            numberOfWeeks: cycleData.numberOfWeeks || 1,
            order: cIdx,
          })
          .returning();
        finalCycleId = cycle.id;
        incomingCycleIds.add(finalCycleId);
      }

      // Process sections within this cycle
      const normalizedSections = Array.isArray(cycleData.sections) ? cycleData.sections : [];

      for (let sIdx = 0; sIdx < normalizedSections.length; sIdx++) {
        const sectionData = normalizedSections[sIdx];
        const sectionId = sectionData.id;

        if (sectionId) {
          incomingSectionIds.add(sectionId);
        }

        let finalSectionId = sectionId;

        if (sectionId && existingSectionIds.has(sectionId)) {
          await tx
            .update(workoutSections)
            .set({
              cycleId: finalCycleId,
              name: sectionData.name,
              type: sectionData.type || "workout",
              order: sIdx,
            })
            .where(eq(workoutSections.id, sectionId));
        } else {
          const [section] = await tx
            .insert(workoutSections)
            .values({
              id: sectionId,
              cycleId: finalCycleId,
              name: sectionData.name,
              type: sectionData.type || "workout",
              order: sIdx,
            })
            .returning();
          finalSectionId = section.id;
          incomingSectionIds.add(finalSectionId);
        }

        if (!sectionData.days || sectionData.days.length === 0) {
          continue;
        }

        for (let dIdx = 0; dIdx < sectionData.days.length; dIdx++) {
          const dayData = sectionData.days[dIdx];
          const dayId = dayData.id;

          if (dayId) {
            incomingDayIds.add(dayId);
          }

          let finalDayId = dayId;

          if (dayId && existingDayIds.has(dayId)) {
            await tx
              .update(workoutDays)
              .set({
                sectionId: finalSectionId,
                name: dayData.name,
                daysOfWeek: dayData.daysOfWeek || [1],
                order: dIdx,
              })
              .where(eq(workoutDays.id, dayId));
          } else {
            const [day] = await tx
              .insert(workoutDays)
              .values({
                id: dayId,
                sectionId: finalSectionId,
                name: dayData.name,
                daysOfWeek: dayData.daysOfWeek || [1],
                order: dIdx,
              })
              .returning();
            finalDayId = day.id;
            incomingDayIds.add(finalDayId);
          }

          if (!dayData.exercises || dayData.exercises.length === 0) {
            continue;
          }

          for (let eIdx = 0; eIdx < dayData.exercises.length; eIdx++) {
            const exerciseData = dayData.exercises[eIdx];
            const exerciseId = exerciseData.id;

            if (exerciseId) {
              incomingExerciseIds.add(exerciseId);
            }

            let finalExerciseId = exerciseId;

            if (exerciseId && existingExerciseIds.has(exerciseId)) {
              await tx
                .update(exercises)
                .set({
                  dayId: finalDayId,
                  name: exerciseData.name,
                  type: exerciseData.type || "reps",
                  sets: exerciseData.sets || 3,
                  targetValue: exerciseData.targetValue,
                  unit: exerciseData.unit || "reps",
                  goal: exerciseData.goal || null,
                  notes: exerciseData.notes || null,
                  bothSides: exerciseData.bothSides || false,
                  order: eIdx,
                })
                .where(eq(exercises.id, exerciseId));
            } else {
              const [exercise] = await tx
                .insert(exercises)
                .values({
                  id: exerciseId,
                  dayId: finalDayId,
                  name: exerciseData.name,
                  type: exerciseData.type || "reps",
                  sets: exerciseData.sets || 3,
                  targetValue: exerciseData.targetValue,
                  unit: exerciseData.unit || "reps",
                  goal: exerciseData.goal || null,
                  notes: exerciseData.notes || null,
                  bothSides: exerciseData.bothSides || false,
                  order: eIdx,
                })
                .returning();
              finalExerciseId = exercise.id;
              incomingExerciseIds.add(finalExerciseId);
            }

            await tx.delete(weeklyProgressions).where(eq(weeklyProgressions.exerciseId, finalExerciseId));
            await createWeeklyProgressions(tx, finalExerciseId, exerciseData.weeklyProgression);
          }
        }
      }
    }

    // Delete removed cycles (cascade will handle sections/days/exercises)
    const cycleIdsToDelete = existingCycles.map(cycle => cycle.id).filter(id => !incomingCycleIds.has(id));
    if (cycleIdsToDelete.length > 0) {
      await tx.delete(workoutCycles).where(inArray(workoutCycles.id, cycleIdsToDelete));
    }

    // Delete removed sections (only those still in existing cycles)
    const sectionIdsToDelete = existingCycles
      .filter(cycle => incomingCycleIds.has(cycle.id))
      .flatMap(cycle => cycle.sections || [])
      .map(section => section.id)
      .filter(id => !incomingSectionIds.has(id));
    if (sectionIdsToDelete.length > 0) {
      await tx.delete(workoutSections).where(inArray(workoutSections.id, sectionIdsToDelete));
    }

    // Delete removed days
    const dayIdsToDelete = existingCycles
      .filter(cycle => incomingCycleIds.has(cycle.id))
      .flatMap(cycle => cycle.sections || [])
      .filter(section => incomingSectionIds.has(section.id))
      .flatMap(section => section.days || [])
      .map(day => day.id)
      .filter(id => !incomingDayIds.has(id));
    if (dayIdsToDelete.length > 0) {
      await tx.delete(workoutDays).where(inArray(workoutDays.id, dayIdsToDelete));
    }

    // Delete removed exercises
    const exerciseIdsToDelete = existingCycles
      .filter(cycle => incomingCycleIds.has(cycle.id))
      .flatMap(cycle => cycle.sections || [])
      .filter(section => incomingSectionIds.has(section.id))
      .flatMap(section => section.days || [])
      .filter(day => incomingDayIds.has(day.id))
      .flatMap(day => day.exercises || [])
      .map(exercise => exercise.id)
      .filter(id => !incomingExerciseIds.has(id));
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

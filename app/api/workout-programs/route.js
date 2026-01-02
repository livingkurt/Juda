import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workoutPrograms, workoutSections, workoutDays, exercises, weeklyProgressions, tasks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/lib/authMiddleware";

// GET - Fetch workout program by taskId
export async function GET(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch workout program with full nested structure
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

    // Transform to match expected frontend structure
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
  } catch (error) {
    console.error("Error fetching workout program:", error);
    return NextResponse.json({ error: "Failed to fetch workout program" }, { status: 500 });
  }
}

// POST - Create or update workout program
export async function POST(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { taskId, name, numberOfWeeks, sections: sectionsData } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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

      // Create sections with nested data
      if (sectionsData && sectionsData.length > 0) {
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

          // Create days
          if (sectionData.days && sectionData.days.length > 0) {
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

              // Create exercises
              if (dayData.exercises && dayData.exercises.length > 0) {
                for (let eIdx = 0; eIdx < dayData.exercises.length; eIdx++) {
                  const exerciseData = dayData.exercises[eIdx];

                  const [exercise] = await tx
                    .insert(exercises)
                    .values({
                      id: exerciseData.id, // Preserve ID
                      dayId: day.id,
                      name: exerciseData.name,
                      type: exerciseData.type || "reps",
                      sets: exerciseData.sets || 3,
                      targetValue: exerciseData.targetValue,
                      unit: exerciseData.unit || "reps",
                      goal: exerciseData.goal || null,
                      notes: exerciseData.notes || null,
                      order: eIdx,
                    })
                    .returning();

                  // Create weekly progressions
                  if (exerciseData.weeklyProgression && exerciseData.weeklyProgression.length > 0) {
                    const progressionValues = exerciseData.weeklyProgression.map(wp => ({
                      exerciseId: exercise.id,
                      week: wp.week,
                      targetValue: wp.targetValue,
                      isDeload: wp.isDeload || false,
                      isTest: wp.isTest || false,
                    }));

                    await tx.insert(weeklyProgressions).values(progressionValues);
                  }
                }
              }
            }
          }
        }
      }

      return { programId };
    });

    return NextResponse.json({ success: true, programId: result.programId }, { status: 200 });
  } catch (error) {
    console.error("Error saving workout program:", error);
    return NextResponse.json({ error: "Failed to save workout program" }, { status: 500 });
  }
}

// DELETE - Delete workout program
export async function DELETE(request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete program (cascade handles children)
    await db.delete(workoutPrograms).where(eq(workoutPrograms.taskId, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workout program:", error);
    return NextResponse.json({ error: "Failed to delete workout program" }, { status: 500 });
  }
}

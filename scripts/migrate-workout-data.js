#!/usr/bin/env node

/**
 * Migration script: Convert workoutData JSONB to normalized tables
 * Run with: node scripts/migrate-workout-data.js
 */

import { db } from "../lib/db.js";
import { tasks, workoutPrograms, workoutSections, workoutDays, exercises, weeklyProgressions } from "../lib/schema.js";
import { isNotNull, eq } from "drizzle-orm";

async function migrateWorkoutData() {
  // eslint-disable-next-line no-console
  console.log("🏋️ Starting workout data migration...\n");

  try {
    // Find all tasks with workoutData
    const tasksWithWorkouts = await db.query.tasks.findMany({
      where: isNotNull(tasks.workoutData),
    });

    // eslint-disable-next-line no-console
    console.log(`Found ${tasksWithWorkouts.length} tasks with workout data\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const task of tasksWithWorkouts) {
      const workoutData = task.workoutData;

      // Skip if no sections (invalid data)
      if (!workoutData?.sections || workoutData.sections.length === 0) {
        // eslint-disable-next-line no-console
        console.log(`⏭️  Skipping task ${task.id} - no sections`);
        skippedCount++;
        continue;
      }

      // Check if already migrated
      const existingProgram = await db.query.workoutPrograms.findFirst({
        where: eq(workoutPrograms.taskId, task.id),
      });

      if (existingProgram) {
        // eslint-disable-next-line no-console
        console.log(`⏭️  Skipping task ${task.id} - already migrated`);
        skippedCount++;
        continue;
      }

      try {
        await db.transaction(async tx => {
          // 1. Create WorkoutProgram
          const [program] = await tx
            .insert(workoutPrograms)
            .values({
              taskId: task.id,
              name: workoutData.name || null,
              numberOfWeeks: workoutData.numberOfWeeks || 1,
            })
            .returning();

          // eslint-disable-next-line no-console
          console.log(`  📁 Created program: ${program.id}`);

          // Helper function to create weekly progressions
          const createWeeklyProgressions = async (exerciseId, weeklyProgression) => {
            if (!weeklyProgression || weeklyProgression.length === 0) return;

            const progressionValues = weeklyProgression.map(wp => ({
              exerciseId,
              week: wp.week,
              targetValue: wp.targetValue,
              isDeload: wp.isDeload || false,
              isTest: wp.isTest || false,
            }));

            if (progressionValues.length > 0) {
              await tx.insert(weeklyProgressions).values(progressionValues);
              // eslint-disable-next-line no-console
              console.log(`          📈 Created ${progressionValues.length} weekly progressions`);
            }
          };

          // Helper function to create exercises for a day
          const createExercisesForDay = async (dayId, exercisesData) => {
            if (!exercisesData) return;

            for (let eIdx = 0; eIdx < exercisesData.length; eIdx++) {
              const exerciseData = exercisesData[eIdx];

              const [exercise] = await tx
                .insert(exercises)
                .values({
                  id: exerciseData.id, // Preserve original ID
                  dayId,
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

              // eslint-disable-next-line no-console
              console.log(`        🏃 Created exercise: ${exercise.name}`);

              await createWeeklyProgressions(exercise.id, exerciseData.weeklyProgression);
            }
          };

          // Helper function to create days for a section
          const createDaysForSection = async (sectionId, daysData) => {
            if (!daysData) return;

            for (let dIdx = 0; dIdx < daysData.length; dIdx++) {
              const dayData = daysData[dIdx];

              // Handle both old dayOfWeek (single) and new daysOfWeek (array)
              let daysOfWeekArray = dayData.daysOfWeek;
              if (!daysOfWeekArray && dayData.dayOfWeek !== undefined) {
                daysOfWeekArray = [dayData.dayOfWeek];
              }
              if (!daysOfWeekArray || daysOfWeekArray.length === 0) {
                daysOfWeekArray = [1]; // Default to Monday
              }

              const [day] = await tx
                .insert(workoutDays)
                .values({
                  id: dayData.id, // Preserve original ID
                  sectionId,
                  name: dayData.name,
                  daysOfWeek: daysOfWeekArray,
                  order: dIdx,
                })
                .returning();

              // eslint-disable-next-line no-console
              console.log(`      📅 Created day: ${day.name}`);

              await createExercisesForDay(day.id, dayData.exercises);
            }
          };

          // 2. Create Sections
          for (let sIdx = 0; sIdx < workoutData.sections.length; sIdx++) {
            const sectionData = workoutData.sections[sIdx];

            const [section] = await tx
              .insert(workoutSections)
              .values({
                id: sectionData.id, // Preserve original ID for completion compatibility
                programId: program.id,
                name: sectionData.name,
                type: sectionData.type || "workout",
                order: sIdx,
              })
              .returning();

            // eslint-disable-next-line no-console
            console.log(`    📂 Created section: ${section.name}`);

            await createDaysForSection(section.id, sectionData.days);
          }
        });

        // eslint-disable-next-line no-console
        console.log(`✅ Migrated task ${task.id} (${task.title})\n`);
        migratedCount++;
      } catch (err) {
        console.error(`❌ Error migrating task ${task.id}:`, err.message);
        errorCount++;
      }
    }

    // eslint-disable-next-line no-console
    console.log("\n========================================");
    // eslint-disable-next-line no-console
    console.log("Migration Summary:");
    // eslint-disable-next-line no-console
    console.log(`  ✅ Migrated: ${migratedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  ❌ Errors: ${errorCount}`);
    // eslint-disable-next-line no-console
    console.log("========================================\n");

    if (errorCount === 0) {
      // eslint-disable-next-line no-console
      console.log("🎉 Migration completed successfully!");
      // eslint-disable-next-line no-console
      console.log("\nNext steps:");
      // eslint-disable-next-line no-console
      console.log("1. Verify data in Drizzle Studio: npm run db:studio");
      // eslint-disable-next-line no-console
      console.log("2. Update components to use new tables");
      // eslint-disable-next-line no-console
      console.log("3. After testing, remove workoutData column from schema");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateWorkoutData();

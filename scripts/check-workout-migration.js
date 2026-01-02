#!/usr/bin/env node

/**
 * Check if workout data was migrated successfully
 */

import { db } from "../lib/db.js";
import { tasks, workoutPrograms, workoutSections, workoutDays, exercises } from "../lib/schema.js";
import { isNotNull, eq } from "drizzle-orm";

async function checkMigration() {
  // eslint-disable-next-line no-console
  console.log("🔍 Checking workout migration status...\n");

  try {
    // Check tasks with workoutData
    const tasksWithWorkoutData = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(isNotNull(tasks.workoutData));

    // eslint-disable-next-line no-console
    console.log(`📋 Tasks with workoutData: ${tasksWithWorkoutData.length}`);
    tasksWithWorkoutData.forEach(task => {
      // eslint-disable-next-line no-console
      console.log(`  - ${task.title} (${task.id})`);
    });
    // eslint-disable-next-line no-console
    console.log();

    // Check WorkoutPrograms
    const programs = await db.select().from(workoutPrograms);
    // eslint-disable-next-line no-console
    console.log(`💪 WorkoutPrograms created: ${programs.length}`);
    programs.forEach(program => {
      // eslint-disable-next-line no-console
      console.log(`  - Program ${program.id} for task ${program.taskId}`);
    });
    // eslint-disable-next-line no-console
    console.log();

    // Check WorkoutSections
    const sectionsCount = await db.select().from(workoutSections);
    // eslint-disable-next-line no-console
    console.log(`📂 WorkoutSections created: ${sectionsCount.length}`);
    // eslint-disable-next-line no-console
    console.log();

    // Check WorkoutDays
    const daysCount = await db.select().from(workoutDays);
    // eslint-disable-next-line no-console
    console.log(`📅 WorkoutDays created: ${daysCount.length}`);
    // eslint-disable-next-line no-console
    console.log();

    // Check Exercises
    const exercisesCount = await db.select().from(exercises);
    // eslint-disable-next-line no-console
    console.log(`🏃 Exercises created: ${exercisesCount.length}`);
    // eslint-disable-next-line no-console
    console.log();

    // Detailed check for each program
    if (programs.length > 0) {
      console.log("📊 Detailed program structure:");
      for (const program of programs) {
        const programWithData = await db.query.workoutPrograms.findFirst({
          where: eq(workoutPrograms.id, program.id),
          with: {
            sections: {
              with: {
                days: {
                  with: {
                    exercises: {
                      with: {
                        weeklyProgressions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // eslint-disable-next-line no-console
        console.log(`\n  Program: ${programWithData.name || "Unnamed"} (${programWithData.id})`);
        // eslint-disable-next-line no-console
        console.log(`    Task ID: ${programWithData.taskId}`);
        // eslint-disable-next-line no-console
        console.log(`    Weeks: ${programWithData.numberOfWeeks}`);
        // eslint-disable-next-line no-console
        console.log(`    Sections: ${programWithData.sections.length}`);

        programWithData.sections.forEach(section => {
          // eslint-disable-next-line no-console
          console.log(`      - ${section.name} (${section.type}): ${section.days.length} days`);
          section.days.forEach(day => {
            // eslint-disable-next-line no-console
            console.log(`        - ${day.name}: ${day.exercises.length} exercises`);
          });
        });
      }
    }

    // eslint-disable-next-line no-console
    console.log("\n✅ Migration check complete!");
  } catch (error) {
    console.error("❌ Error checking migration:", error);
    process.exit(1);
  }

  process.exit(0);
}

checkMigration();

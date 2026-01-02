#!/usr/bin/env node

/**
 * Check if workout data was migrated successfully
 */

import { db } from "../lib/db.js";
import { tasks, workoutPrograms, workoutSections, workoutDays, exercises } from "../lib/schema.js";
import { isNotNull, eq } from "drizzle-orm";

async function checkMigration() {
  console.log("🔍 Checking workout migration status...\n");

  try {
    // Check tasks with workoutData
    const tasksWithWorkoutData = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(isNotNull(tasks.workoutData));

    console.log(`📋 Tasks with workoutData: ${tasksWithWorkoutData.length}`);
    tasksWithWorkoutData.forEach(task => {
      console.log(`  - ${task.title} (${task.id})`);
    });
    console.log();

    // Check WorkoutPrograms
    const programs = await db.select().from(workoutPrograms);
    console.log(`💪 WorkoutPrograms created: ${programs.length}`);
    programs.forEach(program => {
      console.log(`  - Program ${program.id} for task ${program.taskId}`);
    });
    console.log();

    // Check WorkoutSections
    const sectionsCount = await db.select().from(workoutSections);
    console.log(`📂 WorkoutSections created: ${sectionsCount.length}`);
    console.log();

    // Check WorkoutDays
    const daysCount = await db.select().from(workoutDays);
    console.log(`📅 WorkoutDays created: ${daysCount.length}`);
    console.log();

    // Check Exercises
    const exercisesCount = await db.select().from(exercises);
    console.log(`🏃 Exercises created: ${exercisesCount.length}`);
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

        console.log(`\n  Program: ${programWithData.name || "Unnamed"} (${programWithData.id})`);
        console.log(`    Task ID: ${programWithData.taskId}`);
        console.log(`    Weeks: ${programWithData.numberOfWeeks}`);
        console.log(`    Sections: ${programWithData.sections.length}`);

        programWithData.sections.forEach(section => {
          console.log(`      - ${section.name} (${section.type}): ${section.days.length} days`);
          section.days.forEach(day => {
            console.log(`        - ${day.name}: ${day.exercises.length} exercises`);
          });
        });
      }
    }

    console.log("\n✅ Migration check complete!");
  } catch (error) {
    console.error("❌ Error checking migration:", error);
    process.exit(1);
  }

  process.exit(0);
}

checkMigration();

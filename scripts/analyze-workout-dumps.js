#!/usr/bin/env node

/**
 * Script to analyze workout data from production dumps (Jan 6-19)
 * and identify lost workout data that needs to be restored
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dumpsDir = path.join(process.cwd(), "dumps");

// Get all dump files from Jan 6-19
const files = fs
  .readdirSync(dumpsDir)
  .filter(f => f.startsWith("production-dump-2026-01-"))
  .sort();

const targetFiles = files.filter(f => {
  const dateStr = f.match(/production-dump-(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const jan6 = new Date("2026-01-06");
  const jan19 = new Date("2026-01-19");
  return date >= jan6 && date <= jan19;
});

console.log(`📊 Analyzing ${targetFiles.length} dump files from Jan 6-19...\n`);

// Workout-related tables
const workoutTables = [
  "WorkoutProgram",
  "WorkoutSection",
  "WorkoutDay",
  "Exercise",
  "WeeklyProgression",
  "WorkoutSetCompletion",
];

// Store all unique records by ID
const allRecords = {
  WorkoutProgram: new Map(),
  WorkoutSection: new Map(),
  WorkoutDay: new Map(),
  Exercise: new Map(),
  WeeklyProgression: new Map(),
  WorkoutSetCompletion: new Map(),
};

// Track which dump files contain each record
const recordSources = {
  WorkoutProgram: new Map(),
  WorkoutSection: new Map(),
  WorkoutDay: new Map(),
  Exercise: new Map(),
  WeeklyProgression: new Map(),
  WorkoutSetCompletion: new Map(),
};

// Process each dump file
for (const file of targetFiles) {
  const filePath = path.join(dumpsDir, file);
  const dump = JSON.parse(fs.readFileSync(filePath, "utf8"));

  console.log(`📁 ${file}`);

  for (const tableName of workoutTables) {
    const rows = dump.tables[tableName] || [];
    console.log(`   ${tableName}: ${rows.length} rows`);

    for (const row of rows) {
      const id = row.id;
      if (!id) continue;

      // Store the record (keep the most recent version if duplicates)
      if (!allRecords[tableName].has(id)) {
        allRecords[tableName].set(id, row);
        recordSources[tableName].set(id, [file]);
      } else {
        // Check if this is a newer version
        const existing = allRecords[tableName].get(id);
        const existingDate = existing.updatedAt || existing.createdAt;
        const newDate = row.updatedAt || row.createdAt;
        if (newDate > existingDate) {
          allRecords[tableName].set(id, row);
        }
        // Track all sources
        const sources = recordSources[tableName].get(id);
        if (!sources.includes(file)) {
          sources.push(file);
        }
      }
    }
  }
  console.log();
}

// Generate summary report
console.log("=".repeat(80));
console.log("📋 SUMMARY OF WORKOUT DATA FOUND");
console.log("=".repeat(80));
console.log();

for (const tableName of workoutTables) {
  const count = allRecords[tableName].size;
  console.log(`${tableName}: ${count} unique records`);
}

console.log();
console.log("=".repeat(80));
console.log("📄 DETAILED BREAKDOWN");
console.log("=".repeat(80));
console.log();

// WorkoutProgram details
console.log("🏋️  WORKOUT PROGRAMS");
console.log("-".repeat(80));
const programs = Array.from(allRecords.WorkoutProgram.values());
for (const program of programs) {
  console.log(`  ID: ${program.id}`);
  console.log(`  Task ID: ${program.taskId}`);
  console.log(`  Name: ${program.name || "(unnamed)"}`);
  console.log(`  Weeks: ${program.numberOfWeeks}`);
  console.log(`  Progress: ${program.progress || 0}`);
  console.log(`  Created: ${program.createdAt}`);
  console.log(`  Updated: ${program.updatedAt || program.createdAt}`);
  console.log(`  Found in: ${recordSources.WorkoutProgram.get(program.id).join(", ")}`);
  console.log();
}

// WorkoutSection details
console.log("📦 WORKOUT SECTIONS");
console.log("-".repeat(80));
const sections = Array.from(allRecords.WorkoutSection.values());
for (const section of sections) {
  console.log(`  ID: ${section.id}`);
  console.log(`  Program ID: ${section.programId}`);
  console.log(`  Name: ${section.name}`);
  console.log(`  Type: ${section.type}`);
  console.log(`  Order: ${section.order}`);
  console.log(`  Created: ${section.createdAt}`);
  console.log(`  Found in: ${recordSources.WorkoutSection.get(section.id).join(", ")}`);
  console.log();
}

// WorkoutDay details
console.log("📅 WORKOUT DAYS");
console.log("-".repeat(80));
const days = Array.from(allRecords.WorkoutDay.values());
for (const day of days) {
  console.log(`  ID: ${day.id}`);
  console.log(`  Section ID: ${day.sectionId}`);
  console.log(`  Name: ${day.name}`);
  console.log(`  Days of Week: ${JSON.stringify(day.daysOfWeek || [])}`);
  console.log(`  Order: ${day.order}`);
  console.log(`  Created: ${day.createdAt}`);
  console.log(`  Found in: ${recordSources.WorkoutDay.get(day.id).join(", ")}`);
  console.log();
}

// Exercise details
console.log("💪 EXERCISES");
console.log("-".repeat(80));
const exercises = Array.from(allRecords.Exercise.values());
console.log(`Total: ${exercises.length} exercises`);
for (const exercise of exercises.slice(0, 20)) {
  // Show first 20
  console.log(`  ${exercise.name} (${exercise.type}, ${exercise.sets} sets, target: ${exercise.targetValue} ${exercise.unit})`);
}
if (exercises.length > 20) {
  console.log(`  ... and ${exercises.length - 20} more`);
}
console.log();

// WeeklyProgression details
console.log("📈 WEEKLY PROGRESSIONS");
console.log("-".repeat(80));
const progressions = Array.from(allRecords.WeeklyProgression.values());
console.log(`Total: ${progressions.length} progressions`);
const byExercise = {};
for (const prog of progressions) {
  if (!byExercise[prog.exerciseId]) {
    byExercise[prog.exerciseId] = [];
  }
  byExercise[prog.exerciseId].push(prog);
}
console.log(`Across ${Object.keys(byExercise).length} exercises`);
for (const [exerciseId, progs] of Object.entries(byExercise).slice(0, 10)) {
  console.log(`  Exercise ${exerciseId}: ${progs.length} weeks`);
}
if (Object.keys(byExercise).length > 10) {
  console.log(`  ... and ${Object.keys(byExercise).length - 10} more exercises`);
}
console.log();

// WorkoutSetCompletion details
console.log("✅ WORKOUT SET COMPLETIONS");
console.log("-".repeat(80));
const completions = Array.from(allRecords.WorkoutSetCompletion.values());
console.log(`Total: ${completions.length} set completions`);

// Group by date
const byDate = {};
for (const completion of completions) {
  const date = new Date(completion.date).toISOString().split("T")[0];
  if (!byDate[date]) {
    byDate[date] = [];
  }
  byDate[date].push(completion);
}

console.log(`Across ${Object.keys(byDate).length} dates:`);
for (const [date, comps] of Object.entries(byDate).sort().slice(0, 15)) {
  console.log(`  ${date}: ${comps.length} completions`);
}
if (Object.keys(byDate).length > 15) {
  console.log(`  ... and ${Object.keys(byDate).length - 15} more dates`);
}
console.log();

// Export data for migration
const exportData = {
  timestamp: new Date().toISOString(),
  sourceFiles: targetFiles,
  data: {
    WorkoutProgram: Array.from(allRecords.WorkoutProgram.values()),
    WorkoutSection: Array.from(allRecords.WorkoutSection.values()),
    WorkoutDay: Array.from(allRecords.WorkoutDay.values()),
    Exercise: Array.from(allRecords.Exercise.values()),
    WeeklyProgression: Array.from(allRecords.WeeklyProgression.values()),
    WorkoutSetCompletion: Array.from(allRecords.WorkoutSetCompletion.values()),
  },
};

const outputPath = path.join(process.cwd(), "workout-restore-data.json");
fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`💾 Exported data to: ${outputPath}`);

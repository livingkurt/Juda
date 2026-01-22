#!/usr/bin/env node

/**
 * Script to generate SQL migration from workout restore data
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(process.cwd(), "workout-restore-data.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

// Helper to escape SQL strings
function escapeSQL(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String - escape single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Helper to format date for SQL
function formatDate(dateStr) {
  if (!dateStr) return "NULL";
  // Normalize date to midnight UTC to match API query expectations
  const date = new Date(dateStr);
  const normalizedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  return `'${normalizedDate.toISOString()}'::timestamp`;
}

// Generate INSERT statements for a table
function generateInserts(tableName, rows) {
  if (!rows || rows.length === 0) {
    return `-- No ${tableName} records to restore\n`;
  }

  let sql = `-- Restore ${rows.length} ${tableName} records\n`;
  sql += `-- Source: ${data.sourceFiles.join(", ")}\n\n`;

  for (const row of rows) {
    const columns = Object.keys(row);
    const columnList = columns.map(c => `"${c}"`).join(", ");
    const values = columns
      .map(col => {
        const val = row[col];
        if (col.includes("At") || col === "date") {
          // Timestamp columns
          return formatDate(val);
        }
        if (
          col === "daysOfWeek" ||
          col === "filters" ||
          col === "recurrence" ||
          col === "workoutData" ||
          col === "preferences"
        ) {
          // JSONB columns
          return escapeSQL(val);
        }
        if (col === "progress" && tableName === "WorkoutProgram") {
          // Progress column - database expects jsonb type
          if (val === null || val === undefined) {
            return "NULL";
          }
          // Convert numeric value to JSONB format
          const numVal = typeof val === "number" ? val : parseFloat(val);
          if (isNaN(numVal)) {
            return "NULL";
          }
          // Convert to JSONB: store as JSON number
          return `'${numVal}'::jsonb`;
        }
        return escapeSQL(val);
      })
      .join(", ");

    // Determine unique constraint for ON CONFLICT
    let conflictClause = "";
    if (tableName === "WorkoutProgram") {
      conflictClause = ' ON CONFLICT ("id") DO NOTHING';
    } else if (tableName === "WorkoutSection") {
      conflictClause = ' ON CONFLICT ("id") DO NOTHING';
    } else if (tableName === "WorkoutDay") {
      conflictClause = ' ON CONFLICT ("id") DO NOTHING';
    } else if (tableName === "Exercise") {
      conflictClause = ' ON CONFLICT ("id") DO NOTHING';
    } else if (tableName === "WeeklyProgression") {
      conflictClause = ' ON CONFLICT ("exerciseId", "week") DO NOTHING';
    } else if (tableName === "WorkoutSetCompletion") {
      conflictClause = ' ON CONFLICT ("taskId", "date", "exerciseId", "setNumber") DO NOTHING';
    } else {
      conflictClause = ' ON CONFLICT ("id") DO NOTHING';
    }

    sql += `INSERT INTO "${tableName}" (${columnList}) VALUES (${values})${conflictClause};\n`;
  }

  sql += "\n";
  return sql;
}

// Generate the full migration SQL
let migrationSQL = `-- Migration: Restore Lost Workout Data (Jan 6-19, 2026)
-- This migration restores workout data that was lost due to a bug in WorkoutBuilder.jsx
-- Generated from production database dumps
-- Date: ${new Date().toISOString()}

-- IMPORTANT: This migration uses ON CONFLICT DO NOTHING to preserve existing data
-- Only missing records will be inserted

BEGIN;

`;

// Insert in dependency order (dependencies first)
const tables = [
  "WorkoutProgram",
  "WorkoutSection",
  "WorkoutDay",
  "Exercise",
  "WeeklyProgression",
  "WorkoutSetCompletion",
];

for (const tableName of tables) {
  const rows = data.data[tableName] || [];
  migrationSQL += generateInserts(tableName, rows);
}

migrationSQL += `COMMIT;

-- Verification queries (run manually to verify restoration)
-- SELECT COUNT(*) FROM "WorkoutProgram";
-- SELECT COUNT(*) FROM "WorkoutSection";
-- SELECT COUNT(*) FROM "WorkoutDay";
-- SELECT COUNT(*) FROM "Exercise";
-- SELECT COUNT(*) FROM "WeeklyProgression";
-- SELECT COUNT(*) FROM "WorkoutSetCompletion";
`;

// Write to migration file
const migrationPath = path.join(process.cwd(), "drizzle", "0041_restore_lost_workout_data.sql");
fs.writeFileSync(migrationPath, migrationSQL);

console.log(`✅ Generated migration SQL: ${migrationPath}`);
console.log(`📊 Summary:`);
for (const tableName of tables) {
  const count = (data.data[tableName] || []).length;
  console.log(`   ${tableName}: ${count} records`);
}

#!/usr/bin/env node

/**
 * Verification script to check if database migrations have been applied correctly.
 * This script checks if the TaskCompletion table exists and has the correct structure.
 */

import { prisma } from "../lib/prisma.js";

async function verifyMigrations() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.warn("⚠️  DATABASE_URL not set, skipping migration verification");
      console.warn("   This is normal during local development if DATABASE_URL is not configured");
      process.exit(0);
    }

    console.log("🔍 Verifying database migrations...");

    // Check if TaskCompletion table exists by trying to query it
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'TaskCompletion'
      );
    `;

    const exists = tableExists[0]?.exists;

    if (!exists) {
      console.error("❌ TaskCompletion table does not exist!");
      console.error("   This means migrations have not been applied.");
      console.error("   Please run: npx prisma migrate deploy");
      process.exit(1);
    }

    console.log("✅ TaskCompletion table exists");

    // Check if the table has the correct columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'TaskCompletion'
      ORDER BY ordinal_position;
    `;

    const requiredColumns = ["id", "taskId", "date", "createdAt"];
    const existingColumnNames = columns.map(c => c.column_name);

    const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col));

    if (missingColumns.length > 0) {
      console.error(`❌ TaskCompletion table is missing columns: ${missingColumns.join(", ")}`);
      console.error("   The table structure does not match the schema.");
      console.error("   Please run: npx prisma migrate deploy");
      process.exit(1);
    }

    console.log("✅ TaskCompletion table has correct structure");

    // Check if the unique constraint exists
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'TaskCompletion'
      AND constraint_type = 'UNIQUE';
    `;

    const hasUniqueConstraint = constraints.some(
      c => c.constraint_name.includes("taskId") && c.constraint_name.includes("date")
    );

    if (!hasUniqueConstraint) {
      console.warn("⚠️  Warning: Unique constraint on (taskId, date) may be missing");
    } else {
      console.log("✅ Unique constraint on (taskId, date) exists");
    }

    console.log("\n✅ All migrations verified successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying migrations:", error.message);
    console.error("\nThis might indicate:");
    console.error("  1. Database connection issues");
    console.error("  2. Migrations have not been applied");
    console.error("  3. Database schema is out of sync");
    console.error("\nPlease run: npx prisma migrate deploy");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigrations();

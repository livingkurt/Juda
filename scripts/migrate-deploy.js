#!/usr/bin/env node

/**
 * Migration deployment script that uses the non-pooling URL for Neon/Vercel Postgres.
 * This script will:
 * 1. Try to use POSTGRES_URL_NON_POOLING if available (for Neon)
 * 2. Fall back to DATABASE_URL_UNPOOLED if available
 * 3. Fall back to DATABASE_URL if non-pooling URL is not available
 * 4. Run prisma migrate deploy
 *
 * Note: If migrations fail during build, you can run them manually:
 *   npm run db:migrate
 *   or
 *   DATABASE_URL_UNPOOLED="your-url" npx prisma migrate deploy
 */

import { spawnSync } from "child_process";

// Check for non-pooling URLs (Neon provides POSTGRES_URL_NON_POOLING, but some setups use DATABASE_URL_UNPOOLED)
const nonPoolingUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED;
const databaseUrl = process.env.DATABASE_URL;

// Debug logging (will show in build logs)
// eslint-disable-next-line no-console
console.log("🔍 Checking environment variables...");
// eslint-disable-next-line no-console
console.log(`   POSTGRES_URL_NON_POOLING: ${process.env.POSTGRES_URL_NON_POOLING ? "✅ Set" : "❌ Not set"}`);
// eslint-disable-next-line no-console
console.log(`   DATABASE_URL_UNPOOLED: ${process.env.DATABASE_URL_UNPOOLED ? "✅ Set" : "❌ Not set"}`);
// eslint-disable-next-line no-console
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ Set" : "❌ Not set"}`);

if (!databaseUrl && !nonPoolingUrl) {
  // eslint-disable-next-line no-console
  console.error("❌ Error: Neither DATABASE_URL nor a non-pooling URL is set");
  // eslint-disable-next-line no-console
  console.error("   Migrations cannot run without a database connection.");
  // eslint-disable-next-line no-console
  console.error("   Please set one of: POSTGRES_URL_NON_POOLING, DATABASE_URL_UNPOOLED, or DATABASE_URL");
  process.exit(1);
}

// Use non-pooling URL if available (required for Neon), otherwise use DATABASE_URL
const migrationUrl = nonPoolingUrl || databaseUrl;

// eslint-disable-next-line no-console
console.log("🔄 Running database migrations...");
if (nonPoolingUrl) {
  const urlSource = process.env.POSTGRES_URL_NON_POOLING
    ? "POSTGRES_URL_NON_POOLING"
    : process.env.DATABASE_URL_UNPOOLED
      ? "DATABASE_URL_UNPOOLED"
      : "non-pooling URL";
  // eslint-disable-next-line no-console
  console.log(`   Using ${urlSource} (required for Neon)`);
} else {
  // eslint-disable-next-line no-console
  console.log("   Using DATABASE_URL");
  // eslint-disable-next-line no-console
  console.warn("   ⚠️  Warning: If using Neon, migrations may fail. Use a non-pooling URL instead.");
}

try {
  // Set DATABASE_URL temporarily for the migration command
  // Use spawnSync to properly handle environment variables
  // eslint-disable-next-line no-console
  console.log("   Executing: npx prisma migrate deploy");
  // eslint-disable-next-line no-console
  console.log("   This may take a moment...");

  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: migrationUrl,
    },
  });

  if (result.error) {
    // eslint-disable-next-line no-console
    console.error("   Error spawning migration process:", result.error.message);
    throw result.error;
  }

  if (result.status !== 0) {
    // eslint-disable-next-line no-console
    console.error(`   Migration process exited with code: ${result.status}`);
    process.exit(result.status || 1);
  }

  // eslint-disable-next-line no-console
  console.log("✅ Migrations completed successfully");
} catch (error) {
  // eslint-disable-next-line no-console
  console.error("❌ Migration failed:", error.message);
  if (error.code === "ETIMEDOUT" || error.signal === "SIGTERM") {
    // eslint-disable-next-line no-console
    console.error("   ⏱️  Migration timed out - this often happens with Neon pooled connections");
    // eslint-disable-next-line no-console
    console.error("   Make sure you're using a non-pooling URL (POSTGRES_URL_NON_POOLING or DATABASE_URL_UNPOOLED)");
  }
  // eslint-disable-next-line no-console
  console.error("\n💡 Troubleshooting:");
  // eslint-disable-next-line no-console
  console.error("   1. If using Neon, ensure POSTGRES_URL_NON_POOLING or DATABASE_URL_UNPOOLED is set in Vercel");
  // eslint-disable-next-line no-console
  console.error("   2. Verify your database is accessible");
  // eslint-disable-next-line no-console
  console.error("   3. Check that migrations are committed to your repository");
  // eslint-disable-next-line no-console
  console.error("   4. You can run migrations manually: npm run db:migrate");
  process.exit(1);
}

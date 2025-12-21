#!/usr/bin/env node

/**
 * Non-Interactive Migration Generator
 *
 * This script generates Drizzle migrations using the --custom flag,
 * which automatically creates ALL required files:
 *   - drizzle/000X_name.sql      (empty, you fill it in)
 *   - drizzle/meta/000X_snapshot.json  (auto-generated)
 *   - drizzle/meta/_journal.json       (auto-updated)
 *
 * Usage:
 *   npm run db:generate add_user_email
 *   npm run db:generate                  # Auto-generates timestamp name
 *
 * This works like Rails migrations - one command creates everything.
 */

import { execSync } from "child_process";

// Get migration name from command line args or generate one with timestamp
const migrationName = process.argv[2] || `migration_${Date.now()}`;

console.log(`\n🔄 Generating migration: ${migrationName}\n`);

try {
  // The --custom flag is the key:
  // - Bypasses all interactive prompts
  // - Creates the SQL file, snapshot, and journal entry automatically
  // - Works in CI/CD environments
  execSync(`npx drizzle-kit generate --name=${migrationName} --custom`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log(`\n✅ Migration generated successfully!\n`);
  console.log(`📝 Next steps:`);
  console.log(`   1. Edit the generated SQL file in drizzle/ folder`);
  console.log(`   2. Test locally: npm run db:migrate`);
  console.log(`   3. Commit and push - migration runs automatically on deploy\n`);
} catch (error) {
  console.error(`\n❌ Failed to generate migration`);
  process.exit(1);
}

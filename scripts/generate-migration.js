#!/usr/bin/env node

/**
 * Non-interactive migration generator for Drizzle ORM
 *
 * Usage:
 *   npm run db:generate                          # Auto-generates name with timestamp
 *   npm run db:generate add_user_field           # Uses custom name
 *   node scripts/generate-migration.js my_migration
 */

import { execSync } from "child_process";

// Get migration name from command line args or generate one with timestamp
const migrationName = process.argv[2] || `migration_${Date.now()}`;

console.log(`\n🔄 Generating migration: ${migrationName}\n`);

try {
  execSync(`npx drizzle-kit generate --name=${migrationName} --custom`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log(`\n✅ Migration generated successfully!\n`);
  console.log(`📝 Next steps:`);
  console.log(`   1. Review the generated SQL in drizzle/ folder`);
  console.log(`   2. Test locally: npm run db:migrate`);
  console.log(`   3. Commit and push - migration will run automatically on deploy\n`);
} catch (error) {
  console.error(`\n❌ Failed to generate migration`);
  process.exit(1);
}

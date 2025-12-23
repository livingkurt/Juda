#!/usr/bin/env node

/**
 * Script to dump production database and restore it locally
 *
 * Reads PRODUCTION_DATABASE_URL and DATABASE_URL from .env file
 *
 * Usage:
 *   npm run db:dump
 *   npm run db:restore
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sections, tasks, taskCompletions, tags, taskTags } from "../lib/schema.js";
import { asc } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

// Remove unsupported query parameters from DATABASE_URL
function cleanDatabaseUrl(url) {
  if (!url) return url;
  const urlObj = new URL(url);
  urlObj.searchParams.delete("schema");
  return urlObj.toString();
}

// Load .env file
loadEnvFile();

// Get database URLs from environment (now loaded from .env)
const productionUrl = cleanDatabaseUrl(process.env.PRODUCTION_DATABASE_URL);
const localUrl = cleanDatabaseUrl(process.env.DATABASE_URL);

if (!productionUrl) {
  console.error("❌ Error: PRODUCTION_DATABASE_URL not found in .env file");

  console.error("   Add it to your .env file:");

  console.error('   PRODUCTION_DATABASE_URL="your-production-database-url"');

  console.error("   Get it from Vercel: Settings → Environment Variables → DATABASE_URL");
  process.exit(1);
}

if (!localUrl) {
  console.error("❌ Error: DATABASE_URL not found in .env file");

  console.error("   Make sure your .env file has DATABASE_URL set for your local database");
  process.exit(1);
}

const productionClient = postgres(productionUrl);
const productionDb = drizzle(productionClient);

const localClient = postgres(localUrl);
const localDb = drizzle(localClient);

async function dumpProduction() {
  // eslint-disable-next-line no-console
  console.log("📦 Dumping production database...\n");

  try {
    // Use raw SQL to query only columns that exist (production may not have userId yet)
    // Check if userId column exists in Section table
    const sectionColumnsResult = await productionClient`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Section' AND column_name = 'userId'
    `;
    const hasSectionUserId = sectionColumnsResult.length > 0;

    const taskColumnsResult = await productionClient`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Task' AND column_name = 'userId'
    `;
    const hasTaskUserId = taskColumnsResult.length > 0;

    const tagColumnsResult = await productionClient`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Tag' AND column_name = 'userId'
    `;
    const hasTagUserId = tagColumnsResult.length > 0;

    // Build SELECT queries based on what columns exist
    const sectionFields = hasSectionUserId
      ? '"id", "userId", "name", "icon", "order", "expanded", "createdAt", "updatedAt"'
      : '"id", "name", "icon", "order", "expanded", "createdAt", "updatedAt"';

    const taskFields = hasTaskUserId
      ? '"id", "userId", "title", "sectionId", "parentId", "time", "duration", "color", "expanded", "order", "recurrence", "createdAt", "updatedAt"'
      : '"id", "title", "sectionId", "parentId", "time", "duration", "color", "expanded", "order", "recurrence", "createdAt", "updatedAt"';

    // Fetch all data from production using raw SQL
    const allSections = await productionClient.unsafe(`SELECT ${sectionFields} FROM "Section" ORDER BY "order" ASC`);
    const allTasks = await productionClient.unsafe(
      `SELECT ${taskFields} FROM "Task" ORDER BY "sectionId" ASC, "order" ASC`
    );
    const allCompletions = await productionClient.unsafe(
      `SELECT "id", "taskId", "date", "createdAt" FROM "TaskCompletion" ORDER BY "date" DESC`
    );

    // Also dump tags and taskTags if they exist
    let allTags = [];
    let allTaskTags = [];

    try {
      const tagFields = hasTagUserId
        ? '"id", "userId", "name", "color", "createdAt", "updatedAt"'
        : '"id", "name", "color", "createdAt", "updatedAt"';

      allTags = await productionClient.unsafe(`SELECT ${tagFields} FROM "Tag" ORDER BY "name" ASC`);

      allTaskTags = await productionClient.unsafe(`SELECT "id", "taskId", "tagId", "createdAt" FROM "TaskTag"`);
    } catch (error) {
      // Tags table might not exist yet, that's okay
      // eslint-disable-next-line no-console
      console.log("   ⚠️  Tags table not found (skipping)");
    }

    const dump = {
      timestamp: new Date().toISOString(),
      sections: allSections,
      tasks: allTasks,
      taskCompletions: allCompletions,
      tags: allTags,
      taskTags: allTaskTags,
    };

    // Save to file
    const dumpDir = path.join(process.cwd(), "dumps");
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpFile = path.join(dumpDir, `production-dump-${timestamp}.json`);

    fs.writeFileSync(dumpFile, JSON.stringify(dump, null, 2));

    // eslint-disable-next-line no-console
    console.log(`✅ Dump saved to: ${dumpFile}`);
    // eslint-disable-next-line no-console
    console.log(`   Sections: ${allSections.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Tasks: ${allTasks.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Task Completions: ${allCompletions.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Tags: ${allTags.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Task Tags: ${allTaskTags.length}\n`);

    return dump;
  } catch (error) {
    console.error("❌ Error dumping production database:", error.message);
    throw error;
  }
}

// Convert date strings to Date objects for all timestamp fields
function convertDates(record) {
  const converted = { ...record };
  const dateFields = ["createdAt", "updatedAt", "date"];

  for (const field of dateFields) {
    if (converted[field] && typeof converted[field] === "string") {
      converted[field] = new Date(converted[field]);
    }
  }

  return converted;
}

async function restoreToLocal(dump) {
  if (!localUrl) {
    // eslint-disable-next-line no-console
    console.log("⚠️  Skipping local restore (no DATABASE_URL set)");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("🔄 Restoring to local database...\n");

  try {
    // Clear local database (in reverse order due to foreign keys)
    await localDb.delete(taskCompletions);
    await localDb.delete(taskTags);
    await localDb.delete(tasks);
    await localDb.delete(tags);
    await localDb.delete(sections);

    // eslint-disable-next-line no-console
    console.log("   ✓ Cleared local database");

    // Restore sections first (tasks depend on them)
    if (dump.sections && dump.sections.length > 0) {
      const sectionsToInsert = dump.sections.map(convertDates);
      // Add userId if it doesn't exist in dump (for backward compatibility)
      const sectionsWithUserId = sectionsToInsert.map(s => ({
        ...s,
        userId: s.userId || null, // Will be set by migration 0008
      }));
      await localDb.insert(sections).values(sectionsWithUserId);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.sections.length} sections`);
    }

    // Restore tasks (Drizzle will automatically handle field validation)
    if (dump.tasks && dump.tasks.length > 0) {
      const tasksToInsert = dump.tasks.map(convertDates);
      // Add userId if it doesn't exist in dump (for backward compatibility)
      const tasksWithUserId = tasksToInsert.map(t => ({
        ...t,
        userId: t.userId || null, // Will be set by migration 0008
      }));
      await localDb.insert(tasks).values(tasksWithUserId);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.tasks.length} tasks`);
    }

    // Restore task completions (if present in dump)
    if (dump.taskCompletions && dump.taskCompletions.length > 0) {
      const completionsToInsert = dump.taskCompletions.map(convertDates);
      await localDb.insert(taskCompletions).values(completionsToInsert);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.taskCompletions.length} task completions`);
    }

    // Restore tags (if present in dump)
    if (dump.tags && dump.tags.length > 0) {
      const tagsToInsert = dump.tags.map(convertDates);
      // Add userId if it doesn't exist in dump (for backward compatibility)
      const tagsWithUserId = tagsToInsert.map(t => ({
        ...t,
        userId: t.userId || null, // Will be set by migration 0008
      }));
      await localDb.insert(tags).values(tagsWithUserId);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.tags.length} tags`);
    }

    // Restore task tags (if present in dump)
    if (dump.taskTags && dump.taskTags.length > 0) {
      const taskTagsToInsert = dump.taskTags.map(convertDates);
      await localDb.insert(taskTags).values(taskTagsToInsert);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.taskTags.length} task tags`);
    }

    // eslint-disable-next-line no-console
    console.log("\n✅ Local database restored successfully!");
  } catch (error) {
    console.error("❌ Error restoring to local database:", error.message);
    throw error;
  }
}

async function main() {
  const shouldRestore = process.argv.includes("--restore");

  try {
    const dump = await dumpProduction();

    if (shouldRestore) {
      await restoreToLocal(dump);
    } else {
      // eslint-disable-next-line no-console
      console.log('💡 Tip: Use "npm run db:restore" to automatically restore to local database');
    }
  } catch (error) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await productionClient.end();
    await localClient.end();
  }
}

main();

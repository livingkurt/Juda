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
import { sections, tasks, taskCompletions } from "../lib/schema.js";
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
  // eslint-disable-next-line no-console
  console.error("❌ Error: PRODUCTION_DATABASE_URL not found in .env file");
  // eslint-disable-next-line no-console
  console.error("   Add it to your .env file:");
  // eslint-disable-next-line no-console
  console.error('   PRODUCTION_DATABASE_URL="your-production-database-url"');
  // eslint-disable-next-line no-console
  console.error("   Get it from Vercel: Settings → Environment Variables → DATABASE_URL");
  process.exit(1);
}

if (!localUrl) {
  // eslint-disable-next-line no-console
  console.error("❌ Error: DATABASE_URL not found in .env file");
  // eslint-disable-next-line no-console
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
    // Fetch all data from production (automatically gets all fields)
    const allSections = await productionDb.select().from(sections).orderBy(asc(sections.order));
    const allTasks = await productionDb.select().from(tasks).orderBy(asc(tasks.sectionId), asc(tasks.order));
    const allCompletions = await productionDb.select().from(taskCompletions).orderBy(asc(taskCompletions.date));

    const dump = {
      timestamp: new Date().toISOString(),
      sections: allSections,
      tasks: allTasks,
      taskCompletions: allCompletions,
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
    console.log(`   Task Completions: ${allCompletions.length}\n`);

    return dump;
  } catch (error) {
    // eslint-disable-next-line no-console
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
    await localDb.delete(tasks);
    await localDb.delete(sections);

    // eslint-disable-next-line no-console
    console.log("   ✓ Cleared local database");

    // Restore sections first (tasks depend on them)
    if (dump.sections && dump.sections.length > 0) {
      const sectionsToInsert = dump.sections.map(convertDates);
      await localDb.insert(sections).values(sectionsToInsert);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.sections.length} sections`);
    }

    // Restore tasks (Drizzle will automatically handle field validation)
    if (dump.tasks && dump.tasks.length > 0) {
      const tasksToInsert = dump.tasks.map(convertDates);
      await localDb.insert(tasks).values(tasksToInsert);
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

    // eslint-disable-next-line no-console
    console.log("\n✅ Local database restored successfully!");
  } catch (error) {
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await productionClient.end();
    await localClient.end();
  }
}

main();

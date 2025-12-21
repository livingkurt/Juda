#!/usr/bin/env node

/**
 * Script to restore the most recent production dump to dev database
 *
 * Reads DATABASE_URL from .env file (dev database)
 * Finds the most recent dump file in dumps/ folder
 *
 * Usage:
 *   npm run db:restore-dev
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sections, tasks } from "../lib/schema.js";
import { count } from "drizzle-orm";
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

// Get database URL from environment (dev database)
// Prefer DEV_DATABASE_URL if set, otherwise fall back to DATABASE_URL
const devUrl = cleanDatabaseUrl(process.env.PRODUCTION_DATABASE_URL);

if (!devUrl) {
  // eslint-disable-next-line no-console
  console.error("❌ Error: DATABASE_URL or DEV_DATABASE_URL not found in .env file");
  // eslint-disable-next-line no-console
  console.error("   Make sure your .env file has DATABASE_URL set for your dev database");
  // eslint-disable-next-line no-console
  console.error("   Or set DEV_DATABASE_URL to explicitly use a dev database");
  process.exit(1);
}

// Show which database we're connecting to (masked for security)
const urlObj = new URL(devUrl);
const maskedUrl = `${urlObj.protocol}//${urlObj.username}@${urlObj.hostname}${urlObj.pathname}`;
// eslint-disable-next-line no-console
console.log(`🔗 Connecting to: ${maskedUrl}\n`);

const devClient = postgres(devUrl);
const devDb = drizzle(devClient);

function findMostRecentDump() {
  const dumpDir = path.join(process.cwd(), "dumps");
  if (!fs.existsSync(dumpDir)) {
    // eslint-disable-next-line no-console
    console.error("❌ Error: dumps directory not found");
    // eslint-disable-next-line no-console
    console.error("   Run 'npm run db:dump' first to create a dump");
    process.exit(1);
  }

  const files = fs.readdirSync(dumpDir);
  const dumpFiles = files.filter(file => file.startsWith("production-dump-") && file.endsWith(".json"));

  if (dumpFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error("❌ Error: No dump files found in dumps/ directory");
    // eslint-disable-next-line no-console
    console.error("   Run 'npm run db:dump' first to create a dump");
    process.exit(1);
  }

  // Sort by filename (which includes timestamp) descending to get most recent
  dumpFiles.sort().reverse();
  const mostRecentFile = dumpFiles[0];
  const dumpPath = path.join(dumpDir, mostRecentFile);

  return { path: dumpPath, filename: mostRecentFile };
}

function loadDump(dumpPath) {
  try {
    const dumpContent = fs.readFileSync(dumpPath, "utf8");
    const dump = JSON.parse(dumpContent);
    return dump;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`❌ Error loading dump file: ${error.message}`);
    throw error;
  }
}

async function restoreToDev(dump) {
  // eslint-disable-next-line no-console
  console.log("🔄 Restoring to dev database...\n");

  try {
    // Verify connection by checking table count
    const [sectionCountResult] = await devDb.select({ count: count() }).from(sections);
    const [taskCountResult] = await devDb.select({ count: count() }).from(tasks);
    // eslint-disable-next-line no-console
    console.log(`   Current database state: ${sectionCountResult.count} sections, ${taskCountResult.count} tasks`);

    // Clear dev database (in reverse order due to foreign keys)
    await devDb.delete(tasks);
    await devDb.delete(sections);

    // eslint-disable-next-line no-console
    console.log("   ✓ Cleared dev database");

    // Restore sections first (tasks depend on them)
    if (dump.sections && dump.sections.length > 0) {
      await devDb.insert(sections).values(dump.sections);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.sections.length} sections`);
    }

    // Restore tasks (filter out fields that don't exist in schema)
    if (dump.tasks && dump.tasks.length > 0) {
      const validTaskFields = [
        "id",
        "title",
        "sectionId",
        "time",
        "duration",
        "color",
        "expanded",
        "order",
        "recurrence",
        "subtasks",
        "createdAt",
        "updatedAt",
      ];
      const filteredTasks = dump.tasks.map(task => {
        const filtered = {};
        for (const field of validTaskFields) {
          if (task[field] !== undefined) {
            filtered[field] = task[field];
          }
        }
        return filtered;
      });
      await devDb.insert(tasks).values(filteredTasks);
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.tasks.length} tasks`);
    }

    // Verify the restore by counting records
    const [finalSectionCountResult] = await devDb.select({ count: count() }).from(sections);
    const [finalTaskCountResult] = await devDb.select({ count: count() }).from(tasks);

    // eslint-disable-next-line no-console
    console.log("\n✅ Dev database restored successfully!");
    // eslint-disable-next-line no-console
    console.log(`   Final counts: ${finalSectionCountResult.count} sections, ${finalTaskCountResult.count} tasks`);

    if (finalSectionCountResult.count !== dump.sections?.length || finalTaskCountResult.count !== dump.tasks?.length) {
      // eslint-disable-next-line no-console
      console.warn("\n⚠️  Warning: Record counts don't match!");
      // eslint-disable-next-line no-console
      console.warn(`   Expected: ${dump.sections?.length || 0} sections, ${dump.tasks?.length || 0} tasks`);
      // eslint-disable-next-line no-console
      console.warn(`   Actual: ${finalSectionCountResult.count} sections, ${finalTaskCountResult.count} tasks`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Error restoring to dev database:", error.message);
    throw error;
  }
}

async function main() {
  try {
    // Find most recent dump
    const { path: dumpPath, filename } = findMostRecentDump();
    // eslint-disable-next-line no-console
    console.log(`📦 Loading dump: ${filename}\n`);

    // Load dump
    const dump = loadDump(dumpPath);
    // eslint-disable-next-line no-console
    console.log(`   Timestamp: ${dump.timestamp || "unknown"}`);
    // eslint-disable-next-line no-console
    console.log(`   Sections: ${dump.sections?.length || 0}`);
    // eslint-disable-next-line no-console
    console.log(`   Tasks: ${dump.tasks?.length || 0}\n`);

    // Restore to dev
    await restoreToDev(dump);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await devClient.end();
  }
}

main();

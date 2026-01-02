#!/usr/bin/env node

/**
 * Script to restore the most recent production dump to dev database
 *
 * This script is SCHEMA-AGNOSTIC - it restores all tables automatically
 * without needing to know the schema in advance.
 *
 * Usage:
 *   npm run db:restore-dev
 */

import postgres from "postgres";
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
const devUrl = cleanDatabaseUrl(process.env.DEV_DATABASE_URL || process.env.DATABASE_URL);

if (!devUrl) {
  console.error("❌ Error: DATABASE_URL or DEV_DATABASE_URL not found in .env file");
  console.error("   Make sure your .env file has DATABASE_URL set for your dev database");
  console.error("   Or set DEV_DATABASE_URL to explicitly use a dev database");
  process.exit(1);
}

// Show which database we're connecting to (masked for security)
const urlObj = new URL(devUrl);
const maskedUrl = `${urlObj.protocol}//${urlObj.username}@${urlObj.hostname}${urlObj.pathname}`;
// eslint-disable-next-line no-console
console.log(`🔗 Connecting to: ${maskedUrl}\n`);

const devClient = postgres(devUrl);

function findMostRecentDump() {
  const dumpDir = path.join(process.cwd(), "dumps");
  if (!fs.existsSync(dumpDir)) {
    console.error("❌ Error: dumps directory not found");
    console.error("   Run 'npm run db:dump' first to create a dump");
    process.exit(1);
  }

  const files = fs.readdirSync(dumpDir);
  const dumpFiles = files.filter(file => file.startsWith("production-dump-") && file.endsWith(".json"));

  if (dumpFiles.length === 0) {
    console.error("❌ Error: No dump files found in dumps/ directory");
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
    console.error(`❌ Error loading dump file: ${error.message}`);
    throw error;
  }
}

/**
 * Get the foreign key dependencies between tables
 * Returns a map of tableName -> [tables it depends on]
 */
async function getTableDependencies(client) {
  const fks = await client`
    SELECT
      tc.table_name as from_table,
      ccu.table_name as to_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `;

  const deps = {};
  for (const fk of fks) {
    if (!deps[fk.from_table]) {
      deps[fk.from_table] = [];
    }
    if (fk.from_table !== fk.to_table) {
      // Ignore self-references
      deps[fk.from_table].push(fk.to_table);
    }
  }
  return deps;
}

/**
 * Helper function to insert rows into a table
 */
async function insertRows(client, tableName, rows) {
  if (!rows || rows.length === 0) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map(c => `"${c}"`).join(", ");

  for (const row of rows) {
    const values = columns.map(col => row[col]);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

    await client.unsafe(`INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`, values);
  }
}

/**
 * Topologically sort tables based on foreign key dependencies
 * Returns tables in order where dependencies come first
 */
function topologicalSort(tables, dependencies) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(table) {
    if (visited.has(table)) return;
    if (visiting.has(table)) {
      // Circular dependency - just add it and move on
      return;
    }

    visiting.add(table);
    const deps = dependencies[table] || [];
    for (const dep of deps) {
      if (tables.includes(dep)) {
        visit(dep);
      }
    }
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }

  for (const table of tables) {
    visit(table);
  }

  return sorted;
}

async function restoreToDev(dump) {
  // eslint-disable-next-line no-console
  console.log("🔄 Restoring to dev database...\n");

  try {
    const tables = Object.keys(dump.tables);

    // Get current counts for comparison
    // eslint-disable-next-line no-console
    console.log("   Current database state:");
    const currentCounts = {};
    for (const tableName of tables) {
      try {
        const result = await devClient.unsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
        currentCounts[tableName] = parseInt(result[0].count);
        // eslint-disable-next-line no-console
        console.log(`     ${tableName}: ${currentCounts[tableName]} rows`);
      } catch {
        // eslint-disable-next-line no-console
        console.log(`     ${tableName}: table not found (will be skipped)`);
      }
    }

    // Get table dependencies
    const dependencies = await getTableDependencies(devClient);

    // Sort tables by dependencies (dependencies first)
    const sortedTables = topologicalSort(tables, dependencies);

    // Clear all tables in reverse dependency order
    // eslint-disable-next-line no-console
    console.log("\n   Clearing tables...");
    for (const tableName of sortedTables.reverse()) {
      try {
        await devClient.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
        // eslint-disable-next-line no-console
        console.log(`   ✓ Cleared ${tableName}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not clear table "${tableName}": ${error.message}`);
      }
    }

    // Restore tables in dependency order (dependencies first)
    sortedTables.reverse();
    // eslint-disable-next-line no-console
    console.log("\n   Restoring data...");

    for (const tableName of sortedTables) {
      const rows = dump.tables[tableName];
      if (!rows || rows.length === 0) {
        // eslint-disable-next-line no-console
        console.log(`   ○ ${tableName}: 0 rows (skipped)`);
        continue;
      }

      try {
        // Get the actual columns that exist in the local database table
        const tableInfo = await devClient.unsafe(
          `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
        `,
          [tableName]
        );
        const validColumns = new Set(tableInfo.map(c => c.column_name));

        // Convert date strings to Date objects and filter out invalid columns
        const processedRows = rows.map(row => {
          const processed = {};
          for (const [key, value] of Object.entries(row)) {
            // Skip columns that don't exist in the local schema
            if (!validColumns.has(key)) {
              continue;
            }

            // Convert ISO date strings to Date objects
            if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              processed[key] = new Date(value);
            } else {
              processed[key] = value;
            }
          }
          return processed;
        });

        // Special handling for Task table: insert parent tasks first
        if (tableName === "Task") {
          // Separate tasks with and without parents
          const tasksWithoutParent = processedRows.filter(t => !t.parentId);
          const tasksWithParent = processedRows.filter(t => t.parentId);

          // Insert parent tasks first
          await insertRows(devClient, tableName, tasksWithoutParent);
          // Then insert child tasks
          await insertRows(devClient, tableName, tasksWithParent);
        } else {
          await insertRows(devClient, tableName, processedRows);
        }

        // eslint-disable-next-line no-console
        console.log(`   ✓ ${tableName}: ${rows.length} rows`);
      } catch (error) {
        console.error(`   ✗ ${tableName}: Failed - ${error.message}`);
        // Continue with other tables even if one fails
      }
    }

    // Verify the restore
    // eslint-disable-next-line no-console
    console.log("\n   Verifying restore...");
    let allMatch = true;
    for (const tableName of tables) {
      try {
        const result = await devClient.unsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const actualCount = parseInt(result[0].count);
        const expectedCount = dump.tables[tableName]?.length || 0;

        if (actualCount === expectedCount) {
          // eslint-disable-next-line no-console
          console.log(`   ✓ ${tableName}: ${actualCount} rows (matches)`);
        } else {
          console.warn(`   ⚠️  ${tableName}: ${actualCount} rows (expected ${expectedCount})`);
          allMatch = false;
        }
      } catch (error) {
        console.warn(`   ⚠️  Could not verify ${tableName}: ${error.message}`);
      }
    }

    if (allMatch) {
      // eslint-disable-next-line no-console
      console.log("\n✅ Dev database restored successfully! All counts match.");
    } else {
      // eslint-disable-next-line no-console
      console.log("\n⚠️  Dev database restored with some mismatches. Check warnings above.");
    }
  } catch (error) {
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

    // Show what's in the dump
    if (dump.tables) {
      // eslint-disable-next-line no-console
      console.log(`   Tables in dump:`);
      for (const [tableName, rows] of Object.entries(dump.tables)) {
        // eslint-disable-next-line no-console
        console.log(`     ${tableName}: ${rows.length} rows`);
      }
    }
    // eslint-disable-next-line no-console
    console.log("");

    // Restore to dev
    await restoreToDev(dump);
  } catch (error) {
    console.error("\n❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await devClient.end();
  }
}

main();

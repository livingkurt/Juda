#!/usr/bin/env node

/**
 * Script to dump production database and restore it locally
 *
 * This script is SCHEMA-AGNOSTIC - it dumps all tables and columns automatically
 * without needing to know the schema in advance.
 *
 * Usage:
 *   npm run db:dump
 *   npm run db:restore
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

// Get database URLs from environment
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
const localClient = postgres(localUrl);

/**
 * Get all user tables from the database (excluding system tables)
 */
async function getUserTables(client) {
  const tables = await client`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_drizzle%'
    ORDER BY table_name
  `;
  return tables.map(t => t.table_name);
}

/**
 * Dump all data from a table (schema-agnostic)
 */
async function dumpTable(client, tableName) {
  try {
    const rows = await client.unsafe(`SELECT * FROM "${tableName}"`);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`   ⚠️  Could not dump table "${tableName}": ${error.message}`);
    return [];
  }
}

async function dumpProduction() {
  // eslint-disable-next-line no-console
  console.log("📦 Dumping production database...\n");

  try {
    // Get all tables
    const tables = await getUserTables(productionClient);
    // eslint-disable-next-line no-console
    console.log(`   Found ${tables.length} tables: ${tables.join(", ")}\n`);

    // Dump all tables
    const dump = {
      timestamp: new Date().toISOString(),
      tables: {},
    };

    for (const tableName of tables) {
      const rows = await dumpTable(productionClient, tableName);
      dump.tables[tableName] = rows;
      // eslint-disable-next-line no-console
      console.log(`   ✓ ${tableName}: ${rows.length} rows`);
    }

    // Save to file
    const dumpDir = path.join(process.cwd(), "dumps");
    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpFile = path.join(dumpDir, `production-dump-${timestamp}.json`);

    fs.writeFileSync(dumpFile, JSON.stringify(dump, null, 2));

    // eslint-disable-next-line no-console

    console.log(`\n✅ Dump saved to: ${dumpFile}`);

    // Summary
    const totalRows = Object.values(dump.tables).reduce((sum, rows) => sum + rows.length, 0);
    // eslint-disable-next-line no-console
    console.log(`   Total: ${tables.length} tables, ${totalRows} rows\n`);

    return dump;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Error dumping production database:", error.message);
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

async function restoreToLocal(dump) {
  if (!localUrl) {
    // eslint-disable-next-line no-console
    console.log("⚠️  Skipping local restore (no DATABASE_URL set)");
    return;
  }

  // eslint-disable-next-line no-console

  console.log("🔄 Restoring to local database...\n");

  try {
    const tables = Object.keys(dump.tables);

    // Get table dependencies
    const dependencies = await getTableDependencies(localClient);

    // Sort tables by dependencies (dependencies first)
    const sortedTables = topologicalSort(tables, dependencies);

    // Clear all tables in reverse dependency order
    // eslint-disable-next-line no-console
    console.log("   Clearing tables...");
    for (const tableName of sortedTables.reverse()) {
      try {
        await localClient.unsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
        // eslint-disable-next-line no-console
        console.log(`   ✓ Cleared ${tableName}`);
      } catch (error) {
        // eslint-disable-next-line no-console
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
        const tableInfo = await localClient.unsafe(
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
          await insertRows(localClient, tableName, tasksWithoutParent);
          // Then insert child tasks
          await insertRows(localClient, tableName, tasksWithParent);
        } else {
          await insertRows(localClient, tableName, processedRows);
        }

        // eslint-disable-next-line no-console

        console.log(`   ✓ ${tableName}: ${rows.length} rows`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`   ✗ ${tableName}: Failed - ${error.message}`);
        // Continue with other tables even if one fails
      }
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

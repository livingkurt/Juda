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

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

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

// Load .env file
loadEnvFile();

// Get database URLs from environment (now loaded from .env)
const productionUrl = process.env.PRODUCTION_DATABASE_URL;
const localUrl = process.env.DATABASE_URL;

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

const productionPrisma = new PrismaClient({
  datasources: {
    db: {
      url: productionUrl,
    },
  },
});

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: localUrl,
    },
  },
});

async function dumpProduction() {
  // eslint-disable-next-line no-console
  console.log("📦 Dumping production database...\n");

  try {
    // Fetch all data from production
    const [sections, tasks, backlogItems] = await Promise.all([
      productionPrisma.section.findMany({ orderBy: { order: "asc" } }),
      productionPrisma.task.findMany({
        orderBy: [{ sectionId: "asc" }, { order: "asc" }],
      }),
      productionPrisma.backlogItem.findMany({ orderBy: { order: "asc" } }),
    ]);

    const dump = {
      timestamp: new Date().toISOString(),
      sections,
      tasks,
      backlogItems,
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
    console.log(`   Sections: ${sections.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Tasks: ${tasks.length}`);
    // eslint-disable-next-line no-console
    console.log(`   Backlog Items: ${backlogItems.length}\n`);

    return dump;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Error dumping production database:", error.message);
    throw error;
  }
}

async function restoreToLocal(dump) {
  if (!localUrl) {
    // eslint-disable-next-line no-console
    console.log("⚠️  Skipping local restore (no LOCAL_DATABASE_URL set)");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("🔄 Restoring to local database...\n");

  try {
    // Clear local database (in reverse order due to foreign keys)
    await localPrisma.task.deleteMany();
    await localPrisma.backlogItem.deleteMany();
    await localPrisma.section.deleteMany();

    // eslint-disable-next-line no-console
    console.log("   ✓ Cleared local database");

    // Restore sections first (tasks depend on them)
    if (dump.sections.length > 0) {
      await localPrisma.section.createMany({
        data: dump.sections,
      });
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.sections.length} sections`);
    }

    // Restore tasks
    if (dump.tasks.length > 0) {
      await localPrisma.task.createMany({
        data: dump.tasks,
      });
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.tasks.length} tasks`);
    }

    // Restore backlog items
    if (dump.backlogItems.length > 0) {
      await localPrisma.backlogItem.createMany({
        data: dump.backlogItems,
      });
      // eslint-disable-next-line no-console
      console.log(`   ✓ Restored ${dump.backlogItems.length} backlog items`);
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
    await productionPrisma.$disconnect();
    await localPrisma.$disconnect();
  }
}

main();

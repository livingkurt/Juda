#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Import script: Import Apple Reminders JSON files into Juda database
 * Run with: node scripts/import-apple-reminders.js <reminders-directory> <userId-or-email>
 * Example: node scripts/import-apple-reminders.js /Users/kurtlavacque/Desktop/apple-reminders-exporter/reminders user@example.com
 */

import { readdir, readFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env file synchronously BEFORE any db imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        // Remove quotes from value if present
        let value = valueParts.join("=").trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // Always set, don't check if exists (override if needed)
        process.env[key] = value;
      }
    }
  });
}

// Now dynamically import db after env is loaded
const dbModule = await import("../lib/db.js");
const schemaModule = await import("../lib/schema.js");
const drizzleModule = await import("drizzle-orm");

const { db } = dbModule;
const { tasks, tags, taskTags, users } = schemaModule;
const { eq, and } = drizzleModule;

async function getUser(userIdentifier) {
  // Check if it's an email (contains @) or user ID
  if (userIdentifier.includes("@")) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, userIdentifier.toLowerCase()),
    });
    if (!user) {
      throw new Error(`User with email ${userIdentifier} not found`);
    }
    return user.id;
  } else {
    // Assume it's a user ID
    const user = await db.query.users.findFirst({
      where: eq(users.id, userIdentifier),
    });
    if (!user) {
      throw new Error(`User with ID ${userIdentifier} not found`);
    }
    return user.id;
  }
}

async function importReminders(remindersDir, userIdentifier) {
  console.log("📥 Starting Apple Reminders import...\n");
  console.log(`Directory: ${remindersDir}`);
  console.log(`User identifier: ${userIdentifier}\n`);

  // Get user ID from email or ID
  const userId = await getUser(userIdentifier);
  console.log(`Found user ID: ${userId}\n`);

  try {
    // Read all JSON files from the directory
    const files = await readdir(remindersDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    console.log(`Found ${jsonFiles.length} reminder files\n`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const tagMap = new Map(); // Map tag names to tag IDs

    // Helper function to get or create a tag
    async function getOrCreateTag(tagName) {
      if (!tagName || !tagName.trim()) return null;

      const normalizedName = tagName.trim().toLowerCase();
      if (tagMap.has(normalizedName)) {
        return tagMap.get(normalizedName);
      }

      // Check if tag already exists in database
      const existingTag = await db.query.tags.findFirst({
        where: and(eq(tags.userId, userId), eq(tags.name, normalizedName)),
      });

      if (existingTag) {
        tagMap.set(normalizedName, existingTag.id);
        return existingTag.id;
      }

      // Create new tag
      const [newTag] = await db
        .insert(tags)
        .values({
          userId,
          name: normalizedName,
          color: "#6366f1", // Default indigo color
        })
        .returning();

      tagMap.set(normalizedName, newTag.id);
      console.log(`  🏷️  Created tag: ${normalizedName}`);
      return newTag.id;
    }

    // Helper function to parse tags from string
    // Apple Reminders tags are space-separated
    async function parseAndCreateTags(tagsString) {
      if (!tagsString || !tagsString.trim()) return [];

      const tagNames = tagsString
        .split(/\s+/) // Split by one or more whitespace characters
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const tagIds = [];
      for (const tagName of tagNames) {
        const tagId = await getOrCreateTag(tagName);
        if (tagId) tagIds.push(tagId);
      }

      return tagIds;
    }

    // Helper function to parse date string
    function parseDate(dateString) {
      if (!dateString || !dateString.trim()) return null;
      try {
        return new Date(dateString);
      } catch {
        return null;
      }
    }

    // Helper function to parse due date and create recurrence
    function createRecurrenceFromDueDate(dueDateString) {
      const dueDate = parseDate(dueDateString);
      if (!dueDate) return null;

      // Create a one-time recurrence with startDate
      const dateStr = formatLocalDate(dueDate);
      return {
        type: "none",
        startDate: `${dateStr}T00:00:00.000Z`,
      };
    }

    // Helper function to format date as YYYY-MM-DD
    function formatLocalDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // Process each file
    for (const file of jsonFiles) {
      const filePath = join(remindersDir, file);

      try {
        const fileContent = await readFile(filePath, "utf-8");
        const reminder = JSON.parse(fileContent);

        // Skip completed reminders
        if (reminder["Is Completed"] === true) {
          skippedCount++;
          continue;
        }

        const title = reminder.Title?.trim();
        if (!title) {
          console.log(`⏭️  Skipping ${file} - no title`);
          skippedCount++;
          continue;
        }

        console.log(`📝 Processing: ${title}`);

        // Parse tags
        const tagIds = await parseAndCreateTags(reminder.Tags || "");

        // Create recurrence from due date if present
        const recurrence = createRecurrenceFromDueDate(reminder["Due Date"]);

        // Parse dates
        const createdAt = parseDate(reminder["Creation Date"]) || new Date();
        const updatedAt = parseDate(reminder["Last Modified Date"]) || new Date();

        // Create the main task
        await db.transaction(async tx => {
          const [task] = await tx
            .insert(tasks)
            .values({
              userId,
              title,
              sectionId: null, // All imported tasks go to backlog
              parentId: null,
              time: null,
              duration: 30,
              recurrence,
              status: "todo",
              completionType: reminder.Notes ? "note" : "checkbox",
              content: reminder.Notes || null,
              createdAt,
              updatedAt,
            })
            .returning();

          // Assign tags if any
          if (tagIds.length > 0) {
            const tagAssignments = tagIds.map(tagId => ({
              taskId: task.id,
              tagId,
            }));
            await tx.insert(taskTags).values(tagAssignments);
            console.log(`  🏷️  Assigned ${tagIds.length} tag(s)`);
          }

          // Create subtasks if present
          if (reminder["Has Subtasks"] && reminder.Subtasks) {
            const subtaskTitles = reminder.Subtasks.split("\n")
              .map(s => s.trim())
              .filter(s => s.length > 0);

            if (subtaskTitles.length > 0) {
              console.log(`  📋 Creating ${subtaskTitles.length} subtask(s)`);

              for (let i = 0; i < subtaskTitles.length; i++) {
                await tx.insert(tasks).values({
                  userId,
                  title: subtaskTitles[i],
                  sectionId: null, // Subtasks inherit parent's section (backlog)
                  parentId: task.id,
                  time: null,
                  duration: 30,
                  recurrence: null,
                  status: "todo",
                  completionType: "checkbox",
                  content: null,
                  order: i,
                  createdAt,
                  updatedAt,
                });
              }
            }
          }

          importedCount++;
        });

        console.log(`  ✅ Imported successfully\n`);
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
        errorCount++;
      }
    }

    console.log("\n========================================");
    console.log("Import Summary:");
    console.log(`  ✅ Imported: ${importedCount}`);
    console.log(`  ⏭️  Skipped (completed): ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  🏷️  Tags created: ${tagMap.size}`);
    console.log("========================================\n");

    if (errorCount === 0) {
      console.log("🎉 Import completed successfully!");
      console.log("\nNext steps:");
      console.log("1. Check your backlog for imported tasks");
      console.log("2. Review and organize tasks as needed");
    }
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: node scripts/import-apple-reminders.js <reminders-directory> <userId-or-email>");

  console.error("Example: node scripts/import-apple-reminders.js /path/to/reminders user@example.com");

  console.error("Example: node scripts/import-apple-reminders.js /path/to/reminders abc123");
  process.exit(1);
}

const [remindersDir, userIdentifier] = args;

importReminders(remindersDir, userIdentifier);

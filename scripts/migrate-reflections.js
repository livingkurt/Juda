#!/usr/bin/env node
/* eslint-disable no-console */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env before db import
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...valueParts] = trimmed.split("=");
    if (!key || valueParts.length === 0) return;
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

const dbModule = await import("../lib/db.js");
const schemaModule = await import("../lib/schema.js");
const drizzleModule = await import("drizzle-orm");

const { db } = dbModule;
const { tasks, reflectionQuestions, taskCompletions } = schemaModule;
const { eq } = drizzleModule;

const createQuestion = (text, order) => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  text,
  order,
});

const DEFAULT_WEEKLY_QUESTIONS = [
  createQuestion("Highlight of the week", 0),
  createQuestion("Something I'm grateful for", 1),
  createQuestion("Challenge I faced and how I handled it", 2),
  createQuestion("One thing I want to focus on next week", 3),
];

const DEFAULT_MONTHLY_QUESTIONS = [
  createQuestion("Top achievements this month", 0),
  createQuestion("Lessons learned", 1),
  createQuestion("Areas for improvement", 2),
  createQuestion("Goals for next month", 3),
];

const DEFAULT_YEARLY_QUESTIONS = [
  createQuestion("Year in review", 0),
  createQuestion("Major accomplishments", 1),
  createQuestion("Biggest challenges", 2),
  createQuestion("Key learnings", 3),
  createQuestion("Goals for next year", 4),
];

const normalizeTagNames = tags => (tags || []).map(tag => (tag.name || "").toLowerCase());

async function migrateReflections() {
  console.log("Starting reflection migration...");

  const allTasks = await db.query.tasks.findMany({
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const reflectionTasks = allTasks.filter(task => {
    if (task.completionType !== "text") return false;
    const tagNames = normalizeTagNames(task.taskTags?.map(tt => tt.tag));
    return (
      tagNames.includes("weekly reflection") ||
      tagNames.includes("monthly reflection") ||
      tagNames.includes("yearly reflection")
    );
  });

  console.log(`Found ${reflectionTasks.length} reflection tasks to migrate`);

  for (const task of reflectionTasks) {
    const tagNames = normalizeTagNames(task.taskTags?.map(tt => tt.tag));
    let questions = DEFAULT_WEEKLY_QUESTIONS;
    if (tagNames.includes("monthly reflection")) {
      questions = DEFAULT_MONTHLY_QUESTIONS;
    } else if (tagNames.includes("yearly reflection")) {
      questions = DEFAULT_YEARLY_QUESTIONS;
    }

    console.log(`Migrating: ${task.title} (${task.id})`);

    await db.update(tasks).set({ completionType: "reflection" }).where(eq(tasks.id, task.id));

    await db.insert(reflectionQuestions).values({
      taskId: task.id,
      questions,
      includeGoalReflection: true,
      goalReflectionQuestion: "How did you progress on your goals?",
      startDate: task.createdAt || new Date(),
      endDate: null,
    });

    const completions = await db.query.taskCompletions.findMany({
      where: eq(taskCompletions.taskId, task.id),
    });

    for (const completion of completions) {
      if (completion.note && completion.note.trim()) {
        await db
          .update(taskCompletions)
          .set({ reflectionAnswers: { legacy: completion.note } })
          .where(eq(taskCompletions.id, completion.id));
      }
    }
  }

  console.log("Migration complete!");
}

migrateReflections().catch(error => {
  console.error("Migration failed:", error);
  process.exit(1);
});

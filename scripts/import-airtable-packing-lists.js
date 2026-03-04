#!/usr/bin/env node

import fs from "fs/promises";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { listItems, taskListItems, tasks, users } from "../lib/schema.js";

const TRIP_PREFIX = "Trip - ";
const PACKED_PREFIX = "Packed - ";
const QTY_PREFIX = "Qty - ";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map(v => v.trim());
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").trim();
    });
    return row;
  });

  return { headers, rows };
}

function normalizeText(value) {
  return (value || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function parseTagList(value) {
  if (!value) return [];
  return String(value)
    .split(/[;,|]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function mergeUnique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildItemMetadataMap(itemsRows) {
  const metadataByNormalized = new Map();

  itemsRows.forEach(row => {
    const itemName = (row.Name || "").trim();
    if (!itemName) return;

    const normalized = normalizeText(itemName);
    if (!normalized) return;

    const category = (row.Category || "").trim() || null;
    const subCategory = (row.Subcategory || "").trim() || null;
    const rawTags = parseTagList(row.Tags);
    const combinedTags = mergeUnique([
      ...rawTags,
      ...(category ? [category] : []),
      ...(subCategory ? [subCategory] : []),
    ]);

    if (!metadataByNormalized.has(normalized)) {
      metadataByNormalized.set(normalized, {
        category,
        subCategory,
        tags: combinedTags,
      });
      return;
    }

    const existing = metadataByNormalized.get(normalized);
    metadataByNormalized.set(normalized, {
      category: existing.category || category,
      subCategory: existing.subCategory || subCategory,
      tags: mergeUnique([...(existing.tags || []), ...combinedTags]),
    });
  });

  return metadataByNormalized;
}

function normalizeTripName(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripPrefix(header) {
  if (header.startsWith(TRIP_PREFIX)) return header.slice(TRIP_PREFIX.length).trim();
  if (header.startsWith(PACKED_PREFIX)) return header.slice(PACKED_PREFIX.length).trim();
  if (header.startsWith(QTY_PREFIX)) return header.slice(QTY_PREFIX.length).trim();
  return null;
}

function isChecked(value) {
  return normalizeText(value) === "checked";
}

function parseQty(value) {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTripMeta(headers) {
  const map = new Map();

  headers.forEach(header => {
    const rawName = stripPrefix(header);
    if (!rawName) return;

    const key = normalizeTripName(rawName);
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, {
        key,
        displayName: rawName,
        tripColumn: null,
        packedColumn: null,
        qtyColumn: null,
      });
    }

    const existing = map.get(key);
    if (header.startsWith(TRIP_PREFIX)) {
      existing.tripColumn = header;
      existing.displayName = rawName;
    } else if (header.startsWith(PACKED_PREFIX)) {
      existing.packedColumn = header;
    } else if (header.startsWith(QTY_PREFIX)) {
      existing.qtyColumn = header;
    }
  });

  return map;
}

function parseOptionValue(args, optionName) {
  const prefixed = `${optionName}=`;
  const inline = args.find(arg => arg.startsWith(prefixed));
  if (inline) return inline.slice(prefixed.length);

  const optionIndex = args.indexOf(optionName);
  if (optionIndex >= 0) {
    const value = args[optionIndex + 1];
    if (value && !value.startsWith("--")) {
      return value;
    }
  }

  return null;
}

async function getTargetUserId({ userEmail }) {
  if (userEmail) {
    const matchedUsers = await db.query.users.findMany({
      where: eq(users.email, userEmail),
      limit: 1,
    });
    if (matchedUsers.length === 0) {
      throw new Error(`No user found for email: ${userEmail}`);
    }
    return matchedUsers[0].id;
  }

  const existingUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
    limit: 1,
  });
  if (existingUsers.length === 0) {
    throw new Error("No users found. Create an account first.");
  }
  return existingUsers[0].id;
}

async function ensureListSchemaObjects() {
  await db.execute(sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "taskKind" text NOT NULL DEFAULT 'default'`);
  await db.execute(sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "listTemplateId" text`);
  await db.execute(sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sleepData" jsonb`);
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Task_listTemplateId_Task_id_fk'
      ) THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_listTemplateId_Task_id_fk"
          FOREIGN KEY ("listTemplateId") REFERENCES "Task"("id") ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "Task_taskKind_idx" ON "Task" ("taskKind")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "Task_listTemplateId_idx" ON "Task" ("listTemplateId")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ListItem" (
      "id" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL,
      "name" text NOT NULL,
      "normalizedName" text NOT NULL,
      "category" text,
      "subCategory" text,
      "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "category" text`);
  await db.execute(sql`ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "subCategory" text`);
  await db.execute(sql`ALTER TABLE "ListItem" ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb`);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ListItem_userId_User_id_fk'
      ) THEN
        ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_userId_User_id_fk"
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ListItem_userId_normalizedName_unique'
      ) THEN
        ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_userId_normalizedName_unique"
          UNIQUE ("userId", "normalizedName");
      END IF;
    END $$;
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "ListItem_userId_idx" ON "ListItem" ("userId")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "ListItem_normalizedName_idx" ON "ListItem" ("normalizedName")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "ListItem_category_idx" ON "ListItem" ("category")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "ListItem_subCategory_idx" ON "ListItem" ("subCategory")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "TaskListItem" (
      "id" text PRIMARY KEY NOT NULL,
      "taskId" text NOT NULL,
      "listItemId" text NOT NULL,
      "order" integer NOT NULL DEFAULT 0,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_taskId_Task_id_fk'
      ) THEN
        ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_taskId_Task_id_fk"
          FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_listItemId_ListItem_id_fk'
      ) THEN
        ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_listItemId_ListItem_id_fk"
          FOREIGN KEY ("listItemId") REFERENCES "ListItem"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TaskListItem_taskId_listItemId_unique'
      ) THEN
        ALTER TABLE "TaskListItem" ADD CONSTRAINT "TaskListItem_taskId_listItemId_unique"
          UNIQUE ("taskId", "listItemId");
      END IF;
    END $$;
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "TaskListItem_taskId_idx" ON "TaskListItem" ("taskId")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "TaskListItem_listItemId_idx" ON "TaskListItem" ("listItemId")`);
}

async function ensureCanonicalItems(userId, allItemNames, metadataByNormalized, dryRun) {
  const normalizedToDisplay = new Map();
  allItemNames.forEach(name => {
    const normalized = normalizeText(name);
    if (!normalized) return;
    if (!normalizedToDisplay.has(normalized)) {
      normalizedToDisplay.set(normalized, name.trim());
    }
  });

  const existing = await db.query.listItems.findMany({
    where: eq(listItems.userId, userId),
    orderBy: [asc(listItems.name)],
  });
  const existingMap = new Map(existing.map(item => [item.normalizedName, item]));
  const created = [];
  let updatedCount = 0;

  for (const [normalizedName, name] of normalizedToDisplay.entries()) {
    const metadata = metadataByNormalized.get(normalizedName) || {
      category: null,
      subCategory: null,
      tags: [],
    };
    const existingItem = existingMap.get(normalizedName);

    if (existingItem) {
      const mergedTags = mergeUnique([...(existingItem.tags || []), ...(metadata.tags || [])]);
      const nextCategory = existingItem.category || metadata.category || null;
      const nextSubCategory = existingItem.subCategory || metadata.subCategory || null;

      const needsUpdate =
        existingItem.category !== nextCategory ||
        existingItem.subCategory !== nextSubCategory ||
        JSON.stringify(existingItem.tags || []) !== JSON.stringify(mergedTags);

      if (!dryRun && needsUpdate) {
        const [updated] = await db
          .update(listItems)
          .set({
            category: nextCategory,
            subCategory: nextSubCategory,
            tags: mergedTags,
            updatedAt: new Date(),
          })
          .where(and(eq(listItems.userId, userId), eq(listItems.id, existingItem.id)))
          .returning();
        existingMap.set(normalizedName, updated);
        updatedCount += 1;
      }
      continue;
    }

    if (dryRun) {
      created.push({
        id: `dry-${normalizedName}`,
        name,
        normalizedName,
        category: metadata.category || null,
        subCategory: metadata.subCategory || null,
        tags: metadata.tags || [],
      });
      continue;
    }
    const [row] = await db
      .insert(listItems)
      .values({
        userId,
        name,
        normalizedName,
        category: metadata.category || null,
        subCategory: metadata.subCategory || null,
        tags: metadata.tags || [],
      })
      .returning();
    created.push(row);
    existingMap.set(normalizedName, row);
  }

  const finalMap = new Map([...existingMap.values(), ...created].map(item => [item.normalizedName, item]));
  return {
    canonicalMap: finalMap,
    createdCount: created.length,
    updatedCount,
    existingCount: existing.length,
    uniqueCount: normalizedToDisplay.size,
  };
}

async function getExistingTemplates(userId) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.taskKind, "list_template")))
    .orderBy(asc(tasks.createdAt));
  return new Map(rows.map(row => [normalizeTripName(row.title), row]));
}

async function getExistingInstances(userId) {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      listTemplateId: tasks.listTemplateId,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.taskKind, "list_instance")))
    .orderBy(asc(tasks.createdAt));
  return rows;
}

async function createTemplateWithSubtasks({ userId, tripDisplayName, itemNames, canonicalMap, dryRun }) {
  const normalizedItems = [];
  itemNames.forEach(name => {
    const normalized = normalizeText(name);
    if (normalized && !normalizedItems.includes(normalized)) {
      normalizedItems.push(normalized);
    }
  });
  if (normalizedItems.length === 0) return null;

  if (dryRun) {
    return {
      id: `dry-template-${normalizeTripName(tripDisplayName)}`,
      title: tripDisplayName,
      taskKind: "list_template",
      createdSubtasks: normalizedItems.length,
      normalizedItems,
    };
  }

  const [template] = await db
    .insert(tasks)
    .values({
      userId,
      title: tripDisplayName,
      taskKind: "list_template",
      completionType: "checkbox",
      sectionId: null,
      recurrence: null,
      time: null,
      duration: 30,
      status: "todo",
      order: 999,
    })
    .returning();

  const subtaskRows = await db
    .insert(tasks)
    .values(
      normalizedItems.map((normalized, index) => ({
        userId,
        title: canonicalMap.get(normalized)?.name || normalized,
        parentId: template.id,
        taskKind: "default",
        completionType: "checkbox",
        sectionId: null,
        recurrence: null,
        time: null,
        duration: 30,
        status: "todo",
        order: index,
      }))
    )
    .returning();

  const taskItemRows = subtaskRows
    .map((subtask, index) => {
      const canonical = canonicalMap.get(normalizedItems[index]);
      if (!canonical) return null;
      return {
        taskId: subtask.id,
        listItemId: canonical.id,
        order: index,
      };
    })
    .filter(Boolean);

  if (taskItemRows.length > 0) {
    await db.insert(taskListItems).values(taskItemRows);
  }

  return {
    ...template,
    createdSubtasks: subtaskRows.length,
    normalizedItems,
  };
}

async function createInstanceFromTemplate({ userId, template, checkedItemSet, dryRun }) {
  if (dryRun) {
    return {
      id: `dry-instance-${normalizeTripName(template.title)}`,
      title: template.title,
      taskKind: "list_instance",
      checkedCount: checkedItemSet.size,
    };
  }

  const [instance] = await db
    .insert(tasks)
    .values({
      userId,
      title: template.title,
      taskKind: "list_instance",
      listTemplateId: template.id,
      completionType: "checkbox",
      sectionId: null,
      recurrence: null,
      time: null,
      duration: 30,
      status: "todo",
      order: 999,
    })
    .returning();

  const templateSubtasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      duration: tasks.duration,
      order: tasks.order,
    })
    .from(tasks)
    .where(eq(tasks.parentId, template.id))
    .orderBy(asc(tasks.order));

  if (templateSubtasks.length === 0) {
    return { ...instance, createdSubtasks: 0, checkedCount: 0 };
  }

  const createdSubtasks = await db
    .insert(tasks)
    .values(
      templateSubtasks.map(subtask => ({
        userId,
        title: subtask.title,
        parentId: instance.id,
        taskKind: "default",
        completionType: "checkbox",
        sectionId: null,
        recurrence: null,
        time: null,
        duration: subtask.duration ?? 30,
        status: checkedItemSet.has(normalizeText(subtask.title)) ? "complete" : "todo",
        order: subtask.order ?? 0,
      }))
    )
    .returning();

  // Build TaskListItem rows by matching canonical list item via subtask title.
  const canonicalItems = await db.query.listItems.findMany({
    where: eq(listItems.userId, userId),
  });
  const canonicalByName = new Map(canonicalItems.map(item => [normalizeText(item.name), item]));
  const mappedRows = createdSubtasks
    .map(subtask => {
      const canonical = canonicalByName.get(normalizeText(subtask.title));
      if (!canonical) return null;
      return {
        taskId: subtask.id,
        listItemId: canonical.id,
        order: subtask.order ?? 0,
      };
    })
    .filter(Boolean);

  if (mappedRows.length > 0) {
    await db.insert(taskListItems).values(mappedRows);
  }

  return {
    ...instance,
    createdSubtasks: createdSubtasks.length,
    checkedCount: createdSubtasks.filter(row => row.status === "complete").length,
  };
}

function collectItemTripData(itemsRows, tripMeta) {
  const tripItems = new Map();
  const tripChecked = new Map();

  for (const meta of tripMeta.values()) {
    tripItems.set(meta.key, []);
    tripChecked.set(meta.key, new Set());
  }

  itemsRows.forEach(row => {
    const name = (row.Name || "").trim();
    if (!name) return;

    for (const meta of tripMeta.values()) {
      const tripValue = meta.tripColumn ? row[meta.tripColumn] : "";
      const packedValue = meta.packedColumn ? row[meta.packedColumn] : "";
      const qtyValue = meta.qtyColumn ? row[meta.qtyColumn] : "";

      const belongs = isChecked(tripValue) || isChecked(packedValue) || parseQty(qtyValue) > 0;
      if (!belongs) continue;

      tripItems.get(meta.key).push(name);
      if (isChecked(packedValue)) {
        tripChecked.get(meta.key).add(normalizeText(name));
      }
    }
  });

  return { tripItems, tripChecked };
}

function collectTripsCsvData(tripsRows, tripMeta) {
  const itemsByTrip = new Map();
  for (const meta of tripMeta.values()) {
    itemsByTrip.set(meta.key, []);
  }

  tripsRows.forEach(row => {
    const name = (row.Name || "").trim();
    if (!name) return;

    for (const meta of tripMeta.values()) {
      const col = meta.tripColumn;
      if (!col) continue;
      if (isChecked(row[col])) {
        itemsByTrip.get(meta.key).push(name);
      }
    }
  });

  return itemsByTrip;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const userEmail = parseOptionValue(args, "--user-email");
  const positionalArgs = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--user-email=")) continue;
    if (arg === "--user-email") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    positionalArgs.push(arg);
  }
  const [itemsPath, tripsPath] = positionalArgs;

  if (!itemsPath || !tripsPath) {
    console.error(
      "Usage: node scripts/import-airtable-packing-lists.js <items.csv> <trips.csv> [--apply] [--user-email=email]"
    );
    process.exit(1);
  }

  const [itemsCsv, tripsCsv] = await Promise.all([fs.readFile(itemsPath, "utf8"), fs.readFile(tripsPath, "utf8")]);
  const itemsParsed = parseCsv(itemsCsv);
  const tripsParsed = parseCsv(tripsCsv);

  await ensureListSchemaObjects();

  const userId = await getTargetUserId({ userEmail });
  const itemTripMeta = getTripMeta(itemsParsed.headers);
  const tripsTripMeta = getTripMeta(tripsParsed.headers);

  const mergedTripMeta = new Map(itemTripMeta);
  for (const [key, meta] of tripsTripMeta.entries()) {
    if (!mergedTripMeta.has(key)) {
      mergedTripMeta.set(key, meta);
      continue;
    }
    const existing = mergedTripMeta.get(key);
    if (!existing.tripColumn && meta.tripColumn) existing.tripColumn = meta.tripColumn;
    if (!existing.packedColumn && meta.packedColumn) existing.packedColumn = meta.packedColumn;
    if (!existing.qtyColumn && meta.qtyColumn) existing.qtyColumn = meta.qtyColumn;
  }

  const allItemNames = [
    ...itemsParsed.rows.map(row => row.Name).filter(Boolean),
    ...tripsParsed.rows.map(row => row.Name).filter(Boolean),
  ];
  const metadataByNormalized = buildItemMetadataMap(itemsParsed.rows);

  const { canonicalMap, createdCount, updatedCount, existingCount, uniqueCount } = await ensureCanonicalItems(
    userId,
    allItemNames,
    metadataByNormalized,
    dryRun
  );

  const { tripItems: itemsTripItems, tripChecked } = collectItemTripData(itemsParsed.rows, mergedTripMeta);
  const tripsTripItems = collectTripsCsvData(tripsParsed.rows, mergedTripMeta);

  const finalTripItems = new Map();
  for (const [key, meta] of mergedTripMeta.entries()) {
    const combined = [];
    const dedupe = new Set();
    [...(itemsTripItems.get(key) || []), ...(tripsTripItems.get(key) || [])].forEach(name => {
      const normalized = normalizeText(name);
      if (!normalized || dedupe.has(normalized)) return;
      dedupe.add(normalized);
      combined.push(name);
    });
    finalTripItems.set(key, {
      displayName: meta.displayName,
      items: combined,
      checkedSet: tripChecked.get(key) || new Set(),
    });
  }

  const existingTemplates = await getExistingTemplates(userId);
  const existingInstances = await getExistingInstances(userId);
  const existingInstanceKeys = new Set(
    existingInstances.map(instance => normalizeTripName(`${instance.title}|${instance.listTemplateId || ""}`))
  );

  let createdTemplates = 0;
  let createdTemplateSubtasks = 0;
  let createdInstances = 0;
  let createdInstanceSubtasks = 0;
  let checkedInstanceSubtasks = 0;

  for (const [tripKey, data] of finalTripItems.entries()) {
    if (!data.items || data.items.length === 0) continue;

    let template = existingTemplates.get(tripKey);
    if (!template) {
      template = await createTemplateWithSubtasks({
        userId,
        tripDisplayName: data.displayName,
        itemNames: data.items,
        canonicalMap,
        dryRun,
      });
      if (template) {
        createdTemplates += 1;
        createdTemplateSubtasks += template.createdSubtasks || 0;
        existingTemplates.set(tripKey, template);
      }
    }

    if (!template) continue;

    const instanceKey = normalizeTripName(`${template.title}|${template.id}`);
    if (existingInstanceKeys.has(instanceKey)) continue;

    const createdInstance = await createInstanceFromTemplate({
      userId,
      template,
      checkedItemSet: data.checkedSet,
      dryRun,
    });

    if (createdInstance) {
      createdInstances += 1;
      createdInstanceSubtasks += createdInstance.createdSubtasks || 0;
      checkedInstanceSubtasks += createdInstance.checkedCount || 0;
      existingInstanceKeys.add(instanceKey);
    }
  }

  const mode = dryRun ? "DRY RUN" : "APPLY";
  // eslint-disable-next-line no-console
  console.log("");
  // eslint-disable-next-line no-console
  console.log(`[${mode}] Airtable packing list import summary`);
  // eslint-disable-next-line no-console
  console.log(`User ID: ${userId}`);
  // eslint-disable-next-line no-console
  console.log(`Unique canonical items in CSVs: ${uniqueCount}`);
  // eslint-disable-next-line no-console
  console.log(`Existing canonical items in DB: ${existingCount}`);
  // eslint-disable-next-line no-console
  console.log(`Canonical items created this run: ${createdCount}`);
  // eslint-disable-next-line no-console
  console.log(`Canonical items updated this run: ${updatedCount}`);
  // eslint-disable-next-line no-console
  console.log(`Templates created: ${createdTemplates}`);
  // eslint-disable-next-line no-console
  console.log(`Template subtasks created: ${createdTemplateSubtasks}`);
  // eslint-disable-next-line no-console
  console.log(`Instances created: ${createdInstances}`);
  // eslint-disable-next-line no-console
  console.log(`Instance subtasks created: ${createdInstanceSubtasks}`);
  // eslint-disable-next-line no-console
  console.log(`Instance subtasks marked complete: ${checkedInstanceSubtasks}`);
  // eslint-disable-next-line no-console
  console.log("");

  process.exit(0);
}

main().catch(error => {
  console.error("Import failed:", error);
  process.exit(1);
});

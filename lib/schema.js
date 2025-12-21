import { pgTable, text, integer, boolean, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Section table
export const sections = pgTable("Section", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateCuid()),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  order: integer("order").notNull().default(0),
  expanded: boolean("expanded").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Task table
export const tasks = pgTable("Task", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateCuid()),
  title: text("title").notNull(),
  sectionId: text("sectionId")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  parentId: text("parentId").references(() => tasks.id, { onDelete: "cascade" }),
  time: text("time"),
  duration: integer("duration").notNull().default(30),
  color: text("color").notNull().default("#3b82f6"),
  expanded: boolean("expanded").notNull().default(false),
  order: integer("order").notNull().default(0),
  recurrence: jsonb("recurrence"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// TaskCompletion table
export const taskCompletions = pgTable(
  "TaskCompletion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    taskId: text("taskId")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    date: timestamp("date", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => ({
    taskIdDateUnique: unique().on(table.taskId, table.date),
    taskIdIdx: index("TaskCompletion_taskId_idx").on(table.taskId),
    dateIdx: index("TaskCompletion_date_idx").on(table.date),
  })
);

// Relations
export const sectionsRelations = relations(sections, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  section: one(sections, {
    fields: [tasks.sectionId],
    references: [sections.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, {
    relationName: "subtasks",
  }),
  completions: many(taskCompletions),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCompletions.taskId],
    references: [tasks.id],
  }),
}));

// Helper function to generate CUID-like IDs
function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}

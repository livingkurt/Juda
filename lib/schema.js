import { pgTable, text, integer, boolean, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Helper function to generate CUID-like IDs
function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomStr}`;
}

// User table
export const users = pgTable("User", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateCuid()),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// RefreshToken table - stores active refresh tokens
export const refreshTokens = pgTable(
  "RefreshToken",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => ({
    userIdIdx: index("RefreshToken_userId_idx").on(table.userId),
    tokenIdx: index("RefreshToken_token_idx").on(table.token),
  })
);

// UserPreferences table - stores user settings (moved from localStorage)
export const userPreferences = pgTable("UserPreference", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateCuid()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  preferences: jsonb("preferences").notNull().default({}),
  updatedAt: timestamp("updatedAt", { mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Section table
export const sections = pgTable(
  "Section",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    order: integer("order").notNull().default(0),
    expanded: boolean("expanded").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    userIdIdx: index("Section_userId_idx").on(table.userId),
  })
);

// Task table
export const tasks = pgTable(
  "Task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  },
  table => ({
    userIdIdx: index("Task_userId_idx").on(table.userId),
  })
);

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

// Tag table - stores all available tags
export const tags = pgTable(
  "Tag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6366f1"), // Default indigo color
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    userIdIdx: index("Tag_userId_idx").on(table.userId),
  })
);

// TaskTag junction table - many-to-many relationship between tasks and tags
export const taskTags = pgTable(
  "TaskTag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    taskId: text("taskId")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => ({
    taskTagUnique: unique().on(table.taskId, table.tagId),
    taskIdIdx: index("TaskTag_taskId_idx").on(table.taskId),
    tagIdIdx: index("TaskTag_tagId_idx").on(table.tagId),
  })
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sections: many(sections),
  tasks: many(tasks),
  refreshTokens: many(refreshTokens),
  preferences: one(userPreferences),
  tags: many(tags),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  user: one(users, {
    fields: [sections.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
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
  taskTags: many(taskTags),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCompletions.taskId],
    references: [tasks.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));

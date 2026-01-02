import { pgTable, text, integer, boolean, timestamp, jsonb, real, unique, index } from "drizzle-orm/pg-core";
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
  table => [index("RefreshToken_userId_idx").on(table.userId), index("RefreshToken_token_idx").on(table.token)]
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
  table => [index("Section_userId_idx").on(table.userId)]
);

// NoteFolder table - for organizing notes
export const noteFolders = pgTable(
  "NoteFolder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").default("folder"),
    color: text("color").default("#6b7280"),
    order: integer("order").notNull().default(0),
    parentId: text("parentId").references(() => noteFolders.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("NoteFolder_userId_idx").on(table.userId)]
);

// SmartFolder table - dynamic folders based on filter criteria
export const smartFolders = pgTable(
  "SmartFolder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").default("zap"),
    color: text("color").default("#8b5cf6"),
    order: integer("order").notNull().default(0),
    filters: jsonb("filters").notNull().default({ tags: [], operator: "any" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("SmartFolder_userId_idx").on(table.userId)]
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
    expanded: boolean("expanded").notNull().default(false),
    order: integer("order").notNull().default(0),
    recurrence: jsonb("recurrence"),
    status: text("status").notNull().default("todo"), // 'todo' | 'in_progress' | 'complete'
    startedAt: timestamp("startedAt", { mode: "date" }), // Set when status becomes 'in_progress'
    completionType: text("completionType").notNull().default("checkbox"), // 'checkbox' | 'text' | 'note' | 'workout'
    content: text("content"), // Rich text content for notes (stored as HTML)
    workoutData: jsonb("workoutData"), // Workout structure for workout-type tasks
    folderId: text("folderId").references(() => noteFolders.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("Task_userId_idx").on(table.userId)]
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
    outcome: text("outcome").notNull().default("completed"), // 'completed' | 'not_completed'
    note: text("note"), // Stores the text input response when completionType is "text"
    time: text("time"), // Stores the specific time for off-schedule completions
    startedAt: timestamp("startedAt", { mode: "date" }), // Copied from Task when completing
    completedAt: timestamp("completedAt", { mode: "date" }), // Set when task completes
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => [
    unique().on(table.taskId, table.date),
    index("TaskCompletion_taskId_idx").on(table.taskId),
    index("TaskCompletion_date_idx").on(table.date),
  ]
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
  table => [index("Tag_userId_idx").on(table.userId)]
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
  table => [
    unique().on(table.taskId, table.tagId),
    index("TaskTag_taskId_idx").on(table.taskId),
    index("TaskTag_tagId_idx").on(table.tagId),
  ]
);

// ============================================
// WORKOUT PROGRAM TABLES (Normalized Structure)
// ============================================

// WorkoutProgram - Top level workout container, 1:1 with Task
export const workoutPrograms = pgTable(
  "WorkoutProgram",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    taskId: text("taskId")
      .notNull()
      .unique()
      .references(() => tasks.id, { onDelete: "cascade" }),
    name: text("name"),
    numberOfWeeks: integer("numberOfWeeks").notNull().default(1),
    progress: real("progress").default(0.0), // Current workout completion (0.0 to 1.0)
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("WorkoutProgram_taskId_idx").on(table.taskId)]
);

// WorkoutSection - Groups exercises (Warmup, Main, Cooldown, etc.)
export const workoutSections = pgTable(
  "WorkoutSection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    programId: text("programId")
      .notNull()
      .references(() => workoutPrograms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'warmup' | 'workout' | 'cooldown' | 'stretches'
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => [index("WorkoutSection_programId_idx").on(table.programId)]
);

// WorkoutDay - Days within a section (Monday - Leg, etc.)
export const workoutDays = pgTable(
  "WorkoutDay",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    sectionId: text("sectionId")
      .notNull()
      .references(() => workoutSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    daysOfWeek: jsonb("daysOfWeek").notNull().default([1]), // Array of 0-6 (Sun-Sat)
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => [index("WorkoutDay_sectionId_idx").on(table.sectionId)]
);

// Exercise - Individual exercises within a day
export const exercises = pgTable(
  "Exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    dayId: text("dayId")
      .notNull()
      .references(() => workoutDays.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'reps' | 'time' | 'distance'
    sets: integer("sets").notNull().default(3),
    targetValue: text("targetValue"), // Changed to text to support numeric values (stored as numeric in DB)
    unit: text("unit").notNull(), // 'reps' | 'secs' | 'mins' | 'miles'
    goal: text("goal"),
    notes: text("notes"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => [index("Exercise_dayId_idx").on(table.dayId)]
);

// WeeklyProgression - Week-specific targets for exercises
export const weeklyProgressions = pgTable(
  "WeeklyProgression",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    exerciseId: text("exerciseId")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    targetValue: text("targetValue"), // Changed to text to support numeric values (stored as numeric in DB)
    isDeload: boolean("isDeload").notNull().default(false),
    isTest: boolean("isTest").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  table => [unique().on(table.exerciseId, table.week), index("WeeklyProgression_exerciseId_idx").on(table.exerciseId)]
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  sections: many(sections),
  tasks: many(tasks),
  refreshTokens: many(refreshTokens),
  preferences: one(userPreferences),
  tags: many(tags),
  noteFolders: many(noteFolders),
  smartFolders: many(smartFolders),
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

export const noteFoldersRelations = relations(noteFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [noteFolders.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  parent: one(noteFolders, {
    fields: [noteFolders.parentId],
    references: [noteFolders.id],
    relationName: "folderHierarchy",
  }),
  children: many(noteFolders, { relationName: "folderHierarchy" }),
}));

export const smartFoldersRelations = relations(smartFolders, ({ one }) => ({
  user: one(users, {
    fields: [smartFolders.userId],
    references: [users.id],
  }),
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
  folder: one(noteFolders, {
    fields: [tasks.folderId],
    references: [noteFolders.id],
  }),
  workoutProgram: one(workoutPrograms, {
    fields: [tasks.id],
    references: [workoutPrograms.taskId],
  }),
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

// WorkoutSetCompletion table - tracks individual set completions for workout exercises
export const workoutSetCompletions = pgTable(
  "WorkoutSetCompletion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateCuid()),
    taskId: text("taskId")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    date: timestamp("date", { mode: "date" }).notNull(), // Which date this completion is for
    exerciseId: text("exerciseId")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("setNumber").notNull(), // Which set (1, 2, 3, etc.)
    completed: boolean("completed").notNull().default(false), // For reps/time exercises
    value: text("value"), // Actual value achieved (for tracking progress)
    time: text("time"), // For running exercises: "08:05"
    distance: real("distance"), // For running exercises: 1.02 miles
    pace: text("pace"), // For running exercises: "7:55"
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [
    unique().on(table.taskId, table.date, table.exerciseId, table.setNumber),
    index("WorkoutSetCompletion_taskId_date_idx").on(table.taskId, table.date),
    index("WorkoutSetCompletion_exerciseId_idx").on(table.exerciseId),
  ]
);

// Workout Program Relations
export const workoutProgramsRelations = relations(workoutPrograms, ({ one, many }) => ({
  task: one(tasks, {
    fields: [workoutPrograms.taskId],
    references: [tasks.id],
  }),
  sections: many(workoutSections),
}));

export const workoutSectionsRelations = relations(workoutSections, ({ one, many }) => ({
  program: one(workoutPrograms, {
    fields: [workoutSections.programId],
    references: [workoutPrograms.id],
  }),
  days: many(workoutDays),
}));

export const workoutDaysRelations = relations(workoutDays, ({ one, many }) => ({
  section: one(workoutSections, {
    fields: [workoutDays.sectionId],
    references: [workoutSections.id],
  }),
  exercises: many(exercises),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  day: one(workoutDays, {
    fields: [exercises.dayId],
    references: [workoutDays.id],
  }),
  weeklyProgressions: many(weeklyProgressions),
}));

export const weeklyProgressionsRelations = relations(weeklyProgressions, ({ one }) => ({
  exercise: one(exercises, {
    fields: [weeklyProgressions.exerciseId],
    references: [exercises.id],
  }),
}));

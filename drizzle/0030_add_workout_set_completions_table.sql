-- Create WorkoutSetCompletion table to track individual set completions
-- This allows users to save their progress mid-workout and resume after page refresh
CREATE TABLE
  IF NOT EXISTS "WorkoutSetCompletion" (
    "id" text PRIMARY KEY NOT NULL,
    "taskId" text NOT NULL REFERENCES "Task" ("id") ON DELETE CASCADE,
    "date" timestamp NOT NULL,
    "exerciseId" text NOT NULL REFERENCES "Exercise" ("id") ON DELETE CASCADE,
    "setNumber" integer NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "value" text,
    "time" text,
    "distance" real,
    "pace" text,
    "createdAt" timestamp DEFAULT now () NOT NULL,
    "updatedAt" timestamp DEFAULT now () NOT NULL,
    CONSTRAINT "WorkoutSetCompletion_taskId_date_exerciseId_setNumber_unique" UNIQUE ("taskId", "date", "exerciseId", "setNumber")
  );

CREATE INDEX IF NOT EXISTS "WorkoutSetCompletion_taskId_date_idx" ON "WorkoutSetCompletion" ("taskId", "date");

CREATE INDEX IF NOT EXISTS "WorkoutSetCompletion_exerciseId_idx" ON "WorkoutSetCompletion" ("exerciseId");
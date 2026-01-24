-- Add goals pinning support
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Task_isPinned_idx" ON "Task" ("isPinned");

-- Reflection questions (versioned)
CREATE TABLE
  IF NOT EXISTS "ReflectionQuestion" (
    "id" text PRIMARY KEY NOT NULL,
    "taskId" text NOT NULL,
    "questions" jsonb NOT NULL,
    "includeGoalReflection" boolean NOT NULL DEFAULT false,
    "goalReflectionQuestion" text,
    "startDate" timestamp NOT NULL,
    "endDate" timestamp,
    "createdAt" timestamp NOT NULL DEFAULT now (),
    "updatedAt" timestamp NOT NULL DEFAULT now (),
    CONSTRAINT "ReflectionQuestion_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE cascade
  );

CREATE INDEX IF NOT EXISTS "ReflectionQuestion_taskId_idx" ON "ReflectionQuestion" ("taskId");

CREATE INDEX IF NOT EXISTS "ReflectionQuestion_dates_idx" ON "ReflectionQuestion" ("startDate", "endDate");

-- Store structured reflection answers
ALTER TABLE "TaskCompletion"
ADD COLUMN IF NOT EXISTS "reflectionAnswers" jsonb;
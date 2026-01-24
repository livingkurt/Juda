-- Link reflection tasks to goal tasks
CREATE TABLE
  IF NOT EXISTS "ReflectionGoal" (
    "id" text PRIMARY KEY NOT NULL,
    "reflectionTaskId" text NOT NULL,
    "goalTaskId" text NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now (),
    CONSTRAINT "ReflectionGoal_reflectionTaskId_Task_id_fk" FOREIGN KEY ("reflectionTaskId") REFERENCES "Task" ("id") ON DELETE cascade,
    CONSTRAINT "ReflectionGoal_goalTaskId_Task_id_fk" FOREIGN KEY ("goalTaskId") REFERENCES "Task" ("id") ON DELETE cascade
  );

CREATE UNIQUE INDEX IF NOT EXISTS "ReflectionGoal_unique_idx" ON "ReflectionGoal" ("reflectionTaskId", "goalTaskId");

CREATE INDEX IF NOT EXISTS "ReflectionGoal_reflectionTaskId_idx" ON "ReflectionGoal" ("reflectionTaskId");

CREATE INDEX IF NOT EXISTS "ReflectionGoal_goalTaskId_idx" ON "ReflectionGoal" ("goalTaskId");
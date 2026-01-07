-- Step 1: Alter the sectionId column to allow NULL values
-- Backlog tasks should NOT have a sectionId
ALTER TABLE "Task" ALTER COLUMN "sectionId" DROP NOT NULL;

-- Step 2: Clear sectionId from TRUE BACKLOG tasks only
-- Backlog tasks = tasks with NO date (recurrence IS NULL or recurrence has no startDate)
-- Tasks with a date/time should keep their sectionId (they're scheduled for Today view)
UPDATE "Task"
SET "sectionId" = NULL
WHERE "status" = 'todo'
  AND "sectionId" IS NOT NULL
  AND (
    "recurrence" IS NULL
    OR "recurrence"::jsonb->>'type' IS NULL
    OR (
      "recurrence"::jsonb->>'type' = 'none'
      AND "recurrence"::jsonb->>'startDate' IS NULL
    )
  );

-- Fix backlog task sections
-- Clear sectionId from TRUE BACKLOG tasks only (tasks with no date)
-- This corrects the previous migration which was too broad

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

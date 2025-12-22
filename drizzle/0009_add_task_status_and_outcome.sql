-- Add status field to Task table
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'todo' NOT NULL;

-- Add outcome field to TaskCompletion table
ALTER TABLE "TaskCompletion"
ADD COLUMN IF NOT EXISTS "outcome" text DEFAULT 'completed' NOT NULL;

-- Update existing TaskCompletion records to have 'completed' outcome (already default, but explicit for clarity)
UPDATE "TaskCompletion"
SET
  "outcome" = 'completed'
WHERE
  "outcome" IS NULL;
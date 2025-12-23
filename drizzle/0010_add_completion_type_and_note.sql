-- Add completionType column to Task table
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "completionType" text NOT NULL DEFAULT 'checkbox';

-- Add note and skipped columns to TaskCompletion table
ALTER TABLE "TaskCompletion" ADD COLUMN IF NOT EXISTS "note" text;
ALTER TABLE "TaskCompletion" ADD COLUMN IF NOT EXISTS "skipped" boolean NOT NULL DEFAULT false;

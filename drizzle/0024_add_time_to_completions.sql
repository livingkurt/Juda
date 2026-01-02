-- Add time column to TaskCompletion table for off-schedule completions
ALTER TABLE "TaskCompletion"
ADD COLUMN IF NOT EXISTS "time" text;
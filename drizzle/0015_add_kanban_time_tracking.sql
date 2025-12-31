-- Add startedAt to Task table for tracking when task entered in_progress
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startedAt" timestamp;

-- Add startedAt and completedAt to TaskCompletion for duration tracking
ALTER TABLE "TaskCompletion" ADD COLUMN IF NOT EXISTS "startedAt" timestamp;
ALTER TABLE "TaskCompletion" ADD COLUMN IF NOT EXISTS "completedAt" timestamp;

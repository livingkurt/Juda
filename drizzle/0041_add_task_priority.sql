-- Add priority field to tasks
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" text;
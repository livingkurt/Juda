-- Add isOffSchedule field to Task table
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "isOffSchedule" boolean DEFAULT false NOT NULL;
